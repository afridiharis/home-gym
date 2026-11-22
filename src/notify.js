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
function nativeCall(plugin, method, opts = {}) {
  const cap = capBridge();
  if (!cap) return Promise.resolve(null);
  return cap.nativePromise(plugin, method, opts).catch((e) => { console.warn(`${plugin}.${method}`, e); return null; });
}
const LN = (method, opts) => nativeCall("LocalNotifications", method, opts);
const alertsOn = () => isNative() && !!S.reminders.on;

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
let syncChain = Promise.resolve(), syncTimer = null;
function syncReminders() {
  if (!isNative()) return Promise.resolve();
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
  if (!isNative()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncReminders, 600);
}

/* ---------- permission ---------- */
async function enableAlerts() {
  if (!isNative()) return false;
  let p = await LN("checkPermissions");
  if (p?.display !== "granted") p = await LN("requestPermissions");
  S.reminders.on = p?.display === "granted";
  save();
  await syncReminders();
  return S.reminders.on;
}
function disableAlerts() { S.reminders.on = false; cancelTimerAlerts(); save(); return syncReminders(); }

/* ---------- timer alerts: only shown when FORGE is not on screen (silent in the app) ---------- */
function timerAlert(id, endTs, title, body, extra, withActions) {
  if (!alertsOn() || !S.reminders.timers || endTs <= Date.now() + 1500) return;
  LN("schedule", { notifications: [{ id, title, body, schedule: { at: new Date(endTs), allowWhileIdle: true }, silent: true,
    actionTypeId: withActions ? NOTIFY.CAT.rest : undefined, extra }] });
}
function cancelAlert(id) { if (isNative()) LN("cancel", { notifications: [{ id }] }); }
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
  if (!isNative()) return;
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
