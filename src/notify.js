/* ============================================================
   FORGE — alerts (the iPhone app only)
   Real notifications through the Capacitor shell: reminders you
   control day by day, and timer alerts with Continue / Stop.
   In a browser every call here is a harmless no-op.

   Reminders are never "repeating" notifications: each time the app
   opens (and after every change) the next two weeks are cancelled
   and planned again as one-offs. That is what lets a single day be
   skipped, moved or silenced without touching the rest.
   ============================================================ */

const NOTIFY = {
  DAYS: 14,                 // how far ahead reminders are planned
  SNOOZE_MIN: 30,
  MORE_REST_S: 30,
  ID: { day: 1000, part2: 7001, extra: 7100, snooze: 7501, lapse: 7601, rest: 9001, hold: 9002 }, // day: 1000 + day*100 + kind*20 + nudge
  REPEATS: [0, 60, 120, 180, 240], // minutes between nudges; 0 = one alert
  MAX_NUDGES: 8, REPEAT_DAYS: 2,    // repeats are planned for today and tomorrow only (iOS keeps 64 pending at most)
  CAT: { remind: "FORGE_REMIND", rest: "FORGE_REST" },
};
const REMIND_KINDS = {
  workout: { icon: "flame", tone: 'data-tone="brand"', name: "Workout" },
  spine: { icon: "spine", tone: 'data-st="floor"', name: "Spine Reset" },
  part2: { icon: "pm", tone: 'data-tone="brand"', name: "Part 2" },
  extra: { icon: "bell", tone: 'data-tone="good"', name: "Reminder" },
};

const capBridge = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor : null);
const isNative = () => !!capBridge();

/* ---------- web push (the Home Screen web app, iOS 16.4+) ----------
   The same two-week plan, posted to a tiny Cloudflare Worker (push/) that sends each alert at its time.
   The device key is random and stays in this browser only (not in backups). */
const PUSH = { api: "https://forge-push.harismohammad.workers.dev", vapid: "BM0x4hJMDL4a40eWQJWY6uPeP-3cZezxZEKcahjecyeMzV-FjjPkZqs_dQNd739J72oL459DjoECU2FZQcAg0xo" }; // push/ (Cloudflare Worker); the key is public
const webPushReady = () => !isNative() && !!PUSH.api && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const alertsAvailable = () => isNative() || webPushReady();
function pushKey() {
  try {
    let k = localStorage.getItem("forge.pushKey");
    if (!/^[a-f0-9]{32}$/.test(k || "")) {
      k = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("forge.pushKey", k);
    }
    return k;
  } catch (_) { return null; }
}
const b64uBytes = (s) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
// text/plain keeps these "simple" requests (no CORS preflight); beacon survives the page going to the background
function pushPost(path, data, beacon = false) {
  const key = pushKey();
  if (!key || !PUSH.api) return Promise.resolve(null);
  const body = JSON.stringify({ key, ...data });
  if (beacon && navigator.sendBeacon) {
    try { if (navigator.sendBeacon(PUSH.api + path, new Blob([body], { type: "text/plain" }))) return Promise.resolve({ ok: true }); } catch (_) {}
  }
  return fetch(PUSH.api + path, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: body.length < 60000 })
    .then((r) => r.json()).catch((e) => { console.warn("push", path, e); return null; });
}
async function pushSub(create) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(PUSH.vapid) });
  return sub;
}
function nativeCall(plugin, method, opts = {}) {
  const cap = capBridge();
  if (!cap) return Promise.resolve(null);
  return cap.nativePromise(plugin, method, opts).catch((e) => { console.warn(`${plugin}.${method}`, e); return null; });
}
const LN = (method, opts) => nativeCall("LocalNotifications", method, opts);
const alertsOn = () => alertsAvailable() && !!S.reminders.on;

/* ---------- times ---------- */
const hmToMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const minToHm = (n) => { const v = ((Math.round(n) % 1440) + 1440) % 1440; return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; };
const atOn = (dateKey, hm) => { const [y, mo, d] = dateKey.split("-").map(Number); const [h, m] = hm.split(":").map(Number); return new Date(y, mo - 1, d, h, m, 0, 0); };
const fmtHm = (hm) => atOn(todayKey(), hm).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// the usual alert times (a single day can override them)
const workoutAlertTime = () => minToHm(Math.max(0, hmToMin(S.profile.time) - S.settings.alertMin));
// Spine Reset: never inside the first hour after waking, so default to two hours after
const spineAlertTime = () => S.reminders.spineTime || minToHm(Math.min(hmToMin(S.profile.wake) + 120, 23 * 60));

/* ---------- today's overrides ---------- */
const freshDay = () => ({ date: todayKey(), quiet: false, off: {}, at: {}, extra: [] });
function reminderDay() {
  if (!S.reminders.day || S.reminders.day.date !== todayKey()) S.reminders.day = freshDay();
  return S.reminders.day;
}

/* ---------- repeat nudges ----------
   A reminder can keep nudging every N hours until it's done or the day's cut-off time.
   The first one is the usual alert time; done, skipped or quiet stops the rest. */
function nudgeTimes(startHm, kind, repeat = true) {
  const every = repeat ? S.reminders.repeat[kind] || 0 : 0;
  const out = [startHm], end = hmToMin(S.reminders.until);
  if (!every) return out;
  for (let t = hmToMin(startHm) + every; t <= end && out.length < NOTIFY.MAX_NUDGES; t += every) out.push(minToHm(t));
  return out;
}
const NUDGE_COPY = {
  workout: [["ready when you are", "Even five minutes counts."], ["still on for today?", "Start small — the first set is the hardest one."], ["there's still time", "A quick 8-minute version counts too."], ["last call for today", "Do one move and call it a win."]],
  spine: [["10-minute Spine Reset", "Cat-camel, curl-up, side plank, bird dog. Daily back armour."], ["Spine Reset still waiting", "Ten minutes on the mat. Your back will thank you tonight."], ["Last call: Spine Reset", "Even half of it keeps the streak alive."]],
};
// first nudge gets the first line, the final one the "last call", anything between the middle lines
const nudgeCopy = (kind, i, n) => { const c = NUDGE_COPY[kind]; return i === 0 ? c[0] : i === n - 1 ? c[c.length - 1] : c[1 + ((i - 1) % (c.length - 2))]; };

/* ---------- the plan: every reminder for the next two weeks ----------
   Pure (reads state, returns a list) so it can be checked without a phone. */
function planReminders(now = new Date()) {
  const out = [];
  if (!S.profile) return out;
  const R = S.reminders, day = reminderDay(), today = todayKey();
  const logs = sessionsOn(today);
  const mainDone = logs.some((l) => l.type === "strength" && (!l.part || l.part === 2));
  const spineDone = logs.some((l) => l.type === "spine");
  const add = (id, at, kind, title, body, extra = {}) => { if (at.getTime() > now.getTime() + 5000) out.push({ id, at, kind, title, body, extra: { kind, ...extra } }); };

  for (let d = 0; d < NOTIFY.DAYS; d++) {
    const key = dayShift(today, d), isToday = d === 0;
    if (isToday && day.quiet) continue;
    const dow = atOn(key, "12:00").getDay();
    const rep = d < NOTIFY.REPEAT_DAYS;
    if (R.workout && S.profile.trainDays.includes(dow) && !(isToday && (day.off.workout || mainDone))) {
      const tpl = isToday ? DAY_TEMPLATES[todaysDayType()] : null;
      const times = nudgeTimes((isToday && day.at.workout) || workoutAlertTime(), "workout", rep);
      times.forEach((hm, i) => { const [t, b] = nudgeCopy("workout", i, times.length);
        add(NOTIFY.ID.day + d * 100 + i, atOn(key, hm), "workout", `${tpl ? tpl.name + " day" : "Training day"} — ${t}`, `${tpl && i === 0 ? tpl.short + ". " : ""}${b}`); });
    }
    if (R.spine && !(isToday && (day.off.spine || spineDone))) {
      const times = nudgeTimes((isToday && day.at.spine) || spineAlertTime(), "spine", rep);
      times.forEach((hm, i) => { const [t, b] = nudgeCopy("spine", i, times.length); add(NOTIFY.ID.day + d * 100 + 20 + i, atOn(key, hm), "spine", t, b); });
    }
  }
  if (!day.quiet) {
    // split day: part 1 is logged, part 2 is not — nudge once the gap has passed
    const p1 = logs.find((l) => l.type === "strength" && l.part === 1);
    if (R.workout && p1 && !mainDone && !day.off.part2) {
      const hm = day.at.part2;
      const at = hm ? atOn(today, hm) : new Date(p1.ts + GUARD.SPLIT_GAP_H * H);
      if (hm || !tooLate(at.getTime())) add(NOTIFY.ID.part2, at, "part2", "Part 2 is ready", "Your muscles have had their break. Finish today's workout.");
    }
    day.extra.forEach((x, i) => add(NOTIFY.ID.extra + i, atOn(today, x.time), "extra", x.label, "Your reminder for today.", { xid: x.id }));
  }
  // if FORGE isn't opened for two weeks the plan runs out — say so once rather than going silent
  add(NOTIFY.ID.lapse, atOn(dayShift(today, NOTIFY.DAYS), S.profile.time), "lapse", "Your reminders have run out", "Open FORGE to plan the next two weeks. Starting again is always allowed.");
  return out.sort((a, b) => a.at - b.at);
}
// what the Reminders sheet lists for today (including ones switched off or already past)
function todaysReminders(now = new Date()) {
  const R = S.reminders, day = reminderDay(), today = todayKey();
  const logs = sessionsOn(today);
  const mainDone = logs.some((l) => l.type === "strength" && (!l.part || l.part === 2));
  const spineDone = logs.some((l) => l.type === "spine");
  const rows = [];
  const row = (kind, time, label, done, key = kind) => {
    const times = kind === "part2" ? [time] : nudgeTimes(time, kind), next = times.find((hm) => atOn(today, hm) > now);
    rows.push({ kind, key, time, label, done, off: !!day.off[key], past: !next, next, repeats: times.length > 1 });
  };
  if (R.workout && S.profile.trainDays.includes(now.getDay())) row("workout", day.at.workout || workoutAlertTime(), DAY_TEMPLATES[todaysDayType()].name, mainDone);
  const p1 = logs.find((l) => l.type === "strength" && l.part === 1);
  if (R.workout && p1 && !mainDone) {
    const due = new Date(p1.ts + GUARD.SPLIT_GAP_H * H);
    row("part2", day.at.part2 || minToHm(due.getHours() * 60 + due.getMinutes()), "Part 2", false);
  }
  if (R.spine) row("spine", day.at.spine || spineAlertTime(), "Spine Reset", spineDone);
  day.extra.forEach((x) => rows.push({ kind: "extra", key: x.id, time: x.time, label: x.label, done: false, off: false, past: atOn(today, x.time) <= now }));
  return rows.sort((a, b) => hmToMin(a.time) - hmToMin(b.time));
}

/* ---------- putting the plan on the phone ---------- */
const toNote = (p) => ({ id: p.id, title: p.title, body: p.body, schedule: { at: p.at, allowWhileIdle: true }, actionTypeId: NOTIFY.CAT.remind, extra: p.extra });
let syncChain = Promise.resolve(), syncTimer = null, pushSig = null;
function syncWebPush() {
  syncChain = syncChain.then(async () => {
    if (!S.reminders.on || !S.profile) return;
    const sub = await pushSub(false);
    if (!sub) return;
    const plan = planReminders().slice(0, 120).map((p) => ({ id: String(p.id), at: p.at.getTime(), title: p.title, body: p.body, kind: p.kind }));
    const sig = JSON.stringify([sub.endpoint, plan]);
    if (sig === pushSig) return; // nothing changed (most saves during a workout)
    const r = await pushPost("/plan", { sub: sub.toJSON(), plan });
    if (r?.ok) pushSig = sig;
  }).catch((e) => console.warn("syncWebPush", e));
  return syncChain;
}
function syncReminders() {
  if (!isNative()) return webPushReady() ? syncWebPush() : Promise.resolve();
  syncChain = syncChain.then(async () => {
    const pending = (await LN("getPending"))?.notifications || [];
    const old = pending.filter((n) => n.id < NOTIFY.ID.rest && n.id !== NOTIFY.ID.snooze).map((n) => ({ id: n.id }));
    if (old.length) await LN("cancel", { notifications: old });
    if (!S.reminders.on || !S.profile) return;
    const plan = planReminders().slice(0, 56); // iOS keeps at most 64 pending
    if (plan.length) await LN("schedule", { notifications: plan.map(toNote) });
  }).catch((e) => console.warn("syncReminders", e));
  return syncChain;
}
// called from save(): anything that changes the day (a logged session, new times) re-plans shortly after
function queueReminderSync() {
  if (!alertsAvailable()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncReminders, isNative() ? 600 : 2500);
}

/* ---------- permission ---------- */
async function enableAlerts() {
  if (!isNative()) {
    // Safari only allows the permission prompt straight from a tap: ask before anything else is awaited
    if (!webPushReady()) return false;
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    S.reminders.on = perm === "granted";
    if (S.reminders.on) {
      try {
        const sub = await pushSub(true);
        const r = await pushPost("/test", { sub: sub.toJSON() }); // a first alert, so you see it works
        if (!r?.ok) throw new Error("push test failed");
      } catch (e) { console.warn("enableAlerts", e); S.reminders.on = false; }
    }
    pushSig = null;
    save();
    await syncReminders();
    return S.reminders.on;
  }
  let p = await LN("checkPermissions");
  if (p?.display !== "granted") p = await LN("requestPermissions");
  S.reminders.on = p?.display === "granted";
  save();
  await syncReminders();
  return S.reminders.on;
}
function disableAlerts() { S.reminders.on = false; cancelTimerAlerts(); save(); if (!isNative()) { pushSig = null; return pushPost("/off", {}); } return syncReminders(); }

/* ---------- timer alerts: only shown when FORGE is not on screen (silent in the app) ----------
   Web: kept here and sent to the worker only when FORGE goes off screen (locked or switched away),
   then called back when it's back on screen, so an alert never lands on top of the open app. */
const webTimers = {};
function flushWebTimers() {
  for (const t of Object.values(webTimers)) if (!t.sent && t.at > Date.now() + 3000) { t.sent = true; pushPost("/timer", { item: t.item }, true); }
}
function recallWebTimers() {
  for (const t of Object.values(webTimers)) if (t.sent) { t.sent = false; pushPost("/cancel", { id: t.item.id }, true); }
}
document.addEventListener("visibilitychange", () => {
  if (isNative() || !webPushReady()) return;
  if (document.visibilityState === "hidden") flushWebTimers(); else recallWebTimers();
});
function timerAlert(id, endTs, title, body, extra, withActions) {
  if (!alertsOn() || !S.reminders.timers || endTs <= Date.now() + 1500) return;
  if (!isNative()) {
    const prev = webTimers[id];
    if (prev?.sent) pushPost("/cancel", { id: prev.item.id }, true);
    webTimers[id] = { at: endTs, sent: false, item: { id: extra.kind, at: endTs, title, body, kind: extra.kind } };
    if (document.visibilityState === "hidden") flushWebTimers();
    return;
  }
  LN("schedule", { notifications: [{ id, title, body, schedule: { at: new Date(endTs), allowWhileIdle: true }, silent: true,
    actionTypeId: withActions ? NOTIFY.CAT.rest : undefined, extra }] });
}
function cancelAlert(id) {
  if (isNative()) { LN("cancel", { notifications: [{ id }] }); return; }
  const t = webTimers[id];
  if (!t) return;
  delete webTimers[id];
  if (t.sent) pushPost("/cancel", { id: t.item.id }, true);
}
function cancelTimerAlerts() { cancelAlert(NOTIFY.ID.rest); cancelAlert(NOTIFY.ID.hold); }
const alertRest = (endTs, body) => timerAlert(NOTIFY.ID.rest, endTs, "Rest over — back to it", body, { kind: "rest" }, true);
const alertHold = (endTs, body) => timerAlert(NOTIFY.ID.hold, endTs, "Hold done", body, { kind: "hold" }, false);

/* ---------- haptics ---------- */
const HAPTIC = { "set-done": ["impact", { style: "MEDIUM" }], "rest-end": ["notification", { type: "SUCCESS" }], go: ["impact", { style: "HEAVY" }],
  complete: ["notification", { type: "SUCCESS" }], pr: ["notification", { type: "SUCCESS" }], levelup: ["notification", { type: "SUCCESS" }], warn10: ["impact", { style: "LIGHT" }] };
function haptic(name) { const h = HAPTIC[name]; if (h && isNative()) nativeCall("Haptics", h[0], h[1]); }

/* ---------- the buttons on a notification ---------- */
function onAlertAction(ev) {
  const id = ev?.actionId, n = ev?.notification || {}, kind = n.extra?.kind;
  if (!S.profile || id === "dismiss") return;
  if (kind === "rest" || kind === "hold") {
    if (!UI.session && S.active) resumeSession();
    if (!UI.session) return;
    if (id === "continue") endRest();
    else if (id === "more") {
      if (UI.rest) { UI.rest.endTs = Math.max(UI.rest.endTs, Date.now()) + NOTIFY.MORE_REST_S * 1000; restAlert(); }
      else startRest(NOTIFY.MORE_REST_S);
    } else if (id === "stop") { endRest(); ACTIONS.quit(); }
    return;
  }
  if (id === "snooze") {
    LN("schedule", { notifications: [{ id: NOTIFY.ID.snooze, title: n.title, body: n.body, actionTypeId: NOTIFY.CAT.remind, extra: n.extra,
      schedule: { at: new Date(Date.now() + NOTIFY.SNOOZE_MIN * 60000), allowWhileIdle: true } }] });
    return;
  }
  if (id === "skip") {
    const day = reminderDay();
    if (kind === "extra") day.extra = day.extra.filter((x) => x.id !== n.extra?.xid);
    else if (kind) day.off[kind] = true;
    cancelAlert(NOTIFY.ID.snooze);
    save(); syncReminders();
    if (!UI.session && !UI.done) render();
    return;
  }
  // "start" or a plain tap: land on Today; Start goes straight into the session
  if (UI.session || UI.done) return;
  closeSheet(); UI.screen = "today"; render();
  if (id === "start") {
    if (kind === "spine") ACTIONS["start-spine"]();
    else if (kind === "workout" || kind === "part2") ACTIONS[restoreActive() ? "resume" : "start-main"]();
  }
}

async function initAlerts() {
  if (!isNative()) {
    if (!webPushReady()) return;
    // permission can be withdrawn in iOS Settings → Notifications → FORGE
    if (S.reminders.on && Notification.permission !== "granted") { S.reminders.on = false; save(); }
    syncReminders();
    return;
  }
  document.documentElement.classList.add("native");
  await LN("registerActionTypes", { types: [
    { id: NOTIFY.CAT.remind, actions: [{ id: "start", title: "Start now", foreground: true }, { id: "snooze", title: `Snooze ${NOTIFY.SNOOZE_MIN} min` }, { id: "skip", title: "Not today", destructive: true }] },
    { id: NOTIFY.CAT.rest, actions: [{ id: "continue", title: "Continue", foreground: true }, { id: "more", title: `+${NOTIFY.MORE_REST_S} s rest` }, { id: "stop", title: "Stop session", foreground: true, destructive: true }] },
  ] });
  capBridge().addListener("LocalNotifications", "localNotificationActionPerformed", (ev) => {
    try { onAlertAction(ev); } catch (e) { console.error(e); }
  });
  // permission can be withdrawn in iOS Settings at any time
  if (S.reminders.on) { const p = await LN("checkPermissions"); if (p && p.display !== "granted") { S.reminders.on = false; save(); } }
  LN("removeAllDeliveredNotifications");
  syncReminders();
}
