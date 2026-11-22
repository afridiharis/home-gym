/* ============================================================
   Web Push with nothing but WebCrypto (runs in Cloudflare Workers and Node 20+).
   - Message encryption: RFC 8291 (aes128gcm), checked against the RFC's own
     test vector in push/test/webpush.test.mjs.
   - Sender identity: VAPID, RFC 8292 (an ES256-signed JWT per push service).
   ============================================================ */

const te = new TextEncoder();

export const b64u = {
  enc(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (const x of b) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec(str) {
    const s = String(str).replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
};

export function cat(...parts) {
  const arrs = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/* Encrypt one push message for a subscription (RFC 8291 §3-4, single record).
   `fixed` is for the test vector only: { asKeys, salt }. */
export async function encrypt(p256dh, auth, payload, fixed = {}) {
  const ua = b64u.dec(p256dh), secret = b64u.dec(auth);
  const as = fixed.asKeys || (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]));
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(secret, ecdh);                                            // HKDF-Extract(auth, ecdh)
  const ikm = await hmac(prkKey, cat(te.encode("WebPush: info\0"), ua, asPub, [1])); // HKDF-Expand(.., key_info, 32)
  const salt = fixed.salt || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode("Content-Encoding: aes128gcm\0"), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode("Content-Encoding: nonce\0"), [1]))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(payload, [2])));
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return { body: cat(salt, rs, [asPub.length], asPub, ct), cek, nonce };
}

/* VAPID: the private key is the JWK "d" of the P-256 key whose raw public key is `pub`. */
export function importVapid(pub, d) {
  const p = b64u.dec(pub);
  return crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: b64u.enc(p.slice(1, 33)), y: b64u.enc(p.slice(33, 65)), d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
export async function vapidAuth(endpoint, subject, pub, privKey, now = Date.now()) {
  const enc = (o) => b64u.enc(te.encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 3600, sub: subject })}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privKey, te.encode(unsigned)); // raw r||s, as JWS wants
  return `vapid t=${unsigned}.${b64u.enc(sig)}, k=${pub}`;
}

/* Send `data` (JSON) to a subscription. Resolves to the push service's Response. */
export async function sendPush(sub, data, { subject, pub, key, ttl = 3600, urgency = "high" }) {
  const { body } = await encrypt(sub.keys.p256dh, sub.keys.auth, te.encode(JSON.stringify(data)));
  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttl),
      Urgency: urgency,
      Authorization: await vapidAuth(sub.endpoint, subject, pub, key),
    },
    body,
  });
}
