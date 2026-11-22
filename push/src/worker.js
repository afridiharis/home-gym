/* ============================================================
   FORGE push: sends the Home Screen web app its alerts on time.
   The app owns the schedule. It posts its plan (the same two weeks of
   one-off reminders the iPhone app would schedule) whenever something
   changes, and a rest/hold timer only while it's off screen. One
   Durable Object per device keeps that list and wakes on an alarm at
   the next due time to send a Web Push. Nothing else is stored: no
   names, no workout history, just the push address and the alert text.

   POST (text/plain JSON, every body carries the device `key`):
     /plan   { sub, plan: [{ id, at, title, body, kind }] }  replace the reminder plan
     /timer  { item: { id, at, title, body, kind } }         add or replace one timer alert
     /cancel { id }                                          drop a timer alert
     /test   { sub }                                         send one alert now
     /off    {}                                              forget this device
   ============================================================ */
import { DurableObject } from "cloudflare:workers";
import { importVapid, sendPush } from "./webpush.js";

const KEY_RE = /^[a-f0-9]{32}$/;
// only real push services: the worker must never be usable to POST to arbitrary URLs
const PUSH_HOSTS = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];
const MAX_PLAN = 150, MAX_TIMERS = 4, STALE_MS = 20 * 60 * 1000, SLACK_MS = 1000;

const clip = (s, n) => String(s ?? "").slice(0, n);
function cleanItem(x) {
  const at = Number(x?.at);
  if (!Number.isFinite(at) || !x?.title) return null;
  return { id: clip(x.id, 40), at, title: clip(x.title, 90), body: clip(x.body, 240), kind: clip(x.kind, 20) };
}
function cleanSub(s) {
  try {
    const u = new URL(s?.endpoint);
    if (u.protocol !== "https:" || !PUSH_HOSTS.some((r) => r.test(u.hostname))) return null;
    if (!s.keys?.p256dh || !s.keys?.auth) return null;
    return { endpoint: u.href, keys: { p256dh: clip(s.keys.p256dh, 200), auth: clip(s.keys.auth, 100) } };
  } catch { return null; }
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).includes(origin);
    const h = { "Access-Control-Allow-Origin": allowed ? origin : "null", Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...h, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method === "GET") return new Response("FORGE push is running.\n", { headers: h });
    if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
    if (!allowed) return json({ ok: false, error: "origin" }, 403);
    const text = await req.text();
    if (text.length > 64 * 1024) return json({ ok: false, error: "size" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ ok: false, error: "json" }, 400); }
    if (!KEY_RE.test(body?.key || "")) return json({ ok: false, error: "key" }, 400);
    const path = new URL(req.url).pathname;
    if (!["/plan", "/timer", "/cancel", "/test", "/off"].includes(path)) return json({ ok: false, error: "route" }, 404);
    const r = await env.INBOX.get(env.INBOX.idFromName(body.key)).handle(path, body);
    return json(r, r.ok ? 200 : 400);
  },
};

export class Inbox extends DurableObject {
  async handle(path, b) {
    const st = this.ctx.storage;
    if (path === "/plan") {
      const sub = cleanSub(b.sub);
      if (!sub) return { ok: false, error: "sub" };
      const plan = (Array.isArray(b.plan) ? b.plan : []).slice(0, MAX_PLAN).map(cleanItem).filter(Boolean);
      await st.put({ sub, plan });
      await this.arm();
      return { ok: true, planned: plan.length };
    }
    if (path === "/timer") {
      const it = cleanItem(b.item);
      if (!it) return { ok: false, error: "item" };
      const timers = (await st.get("timers")) || {};
      timers[it.id] = it;
      const keep = Object.values(timers).sort((x, y) => y.at - x.at).slice(0, MAX_TIMERS);
      await st.put("timers", Object.fromEntries(keep.map((t) => [t.id, t])));
      await this.arm();
      return { ok: true };
    }
    if (path === "/cancel") {
      const timers = (await st.get("timers")) || {};
      delete timers[clip(b.id, 40)];
      await st.put("timers", timers);
      await this.arm();
      return { ok: true };
    }
    if (path === "/test") {
      const sub = cleanSub(b.sub) || (await st.get("sub"));
      if (!sub) return { ok: false, error: "sub" };
      await st.put("sub", sub);
      const res = await this.send(sub, { title: "FORGE alerts are on", body: "Reminders and rest timers will reach you here, even with the phone locked.", kind: "test" }, 300);
      let reason = "";
      try { reason = res.ok || !res.text ? "" : (await res.text()).slice(0, 200); } catch {}
      return { ok: res.ok, status: res.status, reason };
    }
    if (path === "/off") {
      await st.deleteAlarm();
      await st.deleteAll();
      return { ok: true };
    }
    return { ok: false, error: "route" };
  }

  async arm() {
    const st = this.ctx.storage;
    const all = [...((await st.get("plan")) || []), ...Object.values((await st.get("timers")) || {})];
    const next = all.reduce((m, x) => Math.min(m, x.at), Infinity);
    if (next === Infinity) await st.deleteAlarm();
    else await st.setAlarm(Math.max(Date.now() + 250, next));
  }

  async alarm() {
    const st = this.ctx.storage, now = Date.now(), cut = now + SLACK_MS;
    const sub = await st.get("sub");
    const plan = (await st.get("plan")) || [], timers = (await st.get("timers")) || {};
    const due = [...plan.filter((x) => x.at <= cut), ...Object.values(timers).filter((x) => x.at <= cut)];
    for (const id of Object.keys(timers)) if (timers[id].at <= cut) delete timers[id];
    await st.put({ plan: plan.filter((x) => x.at > cut), timers });
    if (sub) {
      for (const x of due) {
        if (now - x.at > STALE_MS) continue; // the worker was asleep: an hour-old nudge is noise
        const timer = x.kind === "rest" || x.kind === "hold";
        const res = await this.send(sub, { title: x.title, body: x.body, kind: x.kind }, timer ? 120 : 1800);
        console.log(`sent ${x.kind} late=${now - x.at}ms -> ${res.status}`);
        if (res.status === 404 || res.status === 410) { await st.deleteAlarm(); await st.deleteAll(); return; } // unsubscribed
      }
    }
    await this.arm();
  }

  async send(sub, data, ttl) {
    try {
      const key = await importVapid(this.env.VAPID_PUBLIC, this.env.VAPID_PRIVATE);
      return await sendPush(sub, data, { subject: this.env.VAPID_SUBJECT, pub: this.env.VAPID_PUBLIC, key, ttl });
    } catch (e) {
      console.error("send", e);
      return { ok: false, status: 0 };
    }
  }
}
