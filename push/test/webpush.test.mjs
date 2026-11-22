// node push/test/webpush.test.mjs — checks encryption against RFC 8291 Appendix A and VAPID signing.
import { b64u, encrypt, importVapid, vapidAuth } from "../src/webpush.js";

const eq = (name, got, want) => {
  const g = typeof got === "string" ? got : b64u.enc(got);
  if (g !== want.replace(/\s+/g, "")) { console.error(`FAIL ${name}\n  got  ${g}\n  want ${want.replace(/\s+/g, "")}`); process.exitCode = 1; }
  else console.log(`ok   ${name}`);
};

// RFC 8291 Appendix A
const asPub = b64u.dec("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIg Dll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8");
const asPriv = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
const jwk = { kty: "EC", crv: "P-256", x: b64u.enc(asPub.slice(1, 33)), y: b64u.enc(asPub.slice(33)), d: asPriv, ext: true };
const asKeys = {
  privateKey: await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
  publicKey: await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, true, []),
};
const out = await encrypt(
  "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcx aOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  "BTBZMqHH6r4Tts7J_aSIgg",
  b64u.dec("V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24"),
  { asKeys, salt: b64u.dec("DGv6ra1nlYgDCS1FRnbzlw") },
);
eq("CEK", out.cek, "oIhVW04MRdy2XN9CiKLxTg");
eq("NONCE", out.nonce, "4h_95klXJ5E_qnoN");
eq("header", out.body.slice(0, 86), "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z 9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml mlMoZIIgDll6e3vCYLocInmYWAmS6Tlz AC8wEqKK6PBru3jl7A8");
eq("ciphertext", out.body.slice(86), "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrd irN6GcG7sFz1y1sqLgVi1VhjVkHsUoEs bI_0LpXMuGvnzQ");

// VAPID: a fresh key signs a JWT that verifies with the public key
const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = b64u.enc(await crypto.subtle.exportKey("raw", kp.publicKey));
const d = (await crypto.subtle.exportKey("jwk", kp.privateKey)).d;
const header = await vapidAuth("https://web.push.apple.com/abc", "https://example.test/", pub, await importVapid(pub, d));
const [, t, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
const [h, c, s] = t.split(".");
const claims = JSON.parse(new TextDecoder().decode(b64u.dec(c)));
const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, b64u.dec(s), new TextEncoder().encode(`${h}.${c}`));
eq("VAPID signature verifies", String(ok), "true");
eq("VAPID aud", claims.aud, "https://web.push.apple.com");
eq("VAPID k", k, pub);
