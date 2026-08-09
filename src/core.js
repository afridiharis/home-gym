/* ============================================================
   FORGE — core engine
   Store, streak engine (silent freezes + repair), XP,
   pain-adaptive workout generation, ICS export, audio, wake lock.
   ============================================================ */

"use strict";

/* ---------- date utils (all local time) ---------- */
const dkey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const dayShift = (key, delta) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return dkey(dt);
};
const todayKey = () => dkey(new Date());
const fmtDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};
const fmtMins = (s) => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- store ---------- */
const STORE_KEY = "forge.v1";

const defaultState = () => ({
  v: 1,
  profile: null, // set by onboarding
  levels: { vpull: 0, hpull: 0, dip: 0, push: 0, vpush: 0, vkr: 0, lsit: 0, squat: 0, hinge: 0 },
  targets: {},   // per-ladder current rep/sec goal within the rung's window
  phase: 2,
  pain: {},      // date -> 'green' | 'yellow' | 'red'
  log: [],       // {id, date, ts, type, name, mins, sets:[{ex,val,target,kind}], xp}
  prs: {},       // exId -> best val
  xp: 0,
  streak: { current: 0, best: 0, freezes: 0, frozen: {}, lastRepair: null, earnedAt: 0 },
  badges: [],
  weights: [],   // {date, kg}
  settings: { sound: true, restMain: 120, restAcc: 75, restSpine: 25, alertMin: 15, theme: "auto" },
  seenGuide: false,
  createdAt: todayKey(),
});

let S = defaultState();
let storageOK = true;
let RESCUE_RAW = null; // unparseable previous store, kept OUT of S so it's never re-saved

/* Deep-validate an untrusted state object (imported backup or stored JSON).
   Builds a fresh state and copies only well-typed values, clamping ranges.
   Throws if it isn't a v1 FORGE state at all. */
const isDateKey = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
const numOr = (x, d, lo = -Infinity, hi = Infinity) =>
  typeof x === "number" && isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d;
const strOr = (x, d, max = 200) => (typeof x === "string" ? x.slice(0, max) : d);
function sanitizeState(p) {
  if (!p || typeof p !== "object" || p.v !== 1 || !("log" in p)) throw new Error("Not a FORGE v1 state");
  const s = defaultState();
  if (p.profile && typeof p.profile === "object") {
    const pr = p.profile;
    const days = Array.isArray(pr.trainDays) ? [...new Set(pr.trainDays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : [];
    s.profile = {
      trainDays: days.length ? days : [1, 2, 4, 5],
      time: /^\d{2}:\d{2}$/.test(pr.time) ? pr.time : "18:00",
      anchor: strOr(pr.anchor, "", 120),
      legs: !!pr.legs,
      created: isDateKey(pr.created) ? pr.created : todayKey(),
    };
  }
  for (const k of Object.keys(s.levels)) {
    s.levels[k] = Math.round(numOr(p.levels?.[k], 0, 0, LADDERS[k].rungs.length - 1));
  }
  if (p.targets && typeof p.targets === "object") {
    for (const [k, v] of Object.entries(p.targets)) {
      if (typeof k === "string" && k.length < 24 && typeof v === "number" && isFinite(v)) s.targets[k] = Math.round(Math.max(0, Math.min(600, v)));
    }
  }
  s.phase = Math.round(numOr(p.phase, 2, 1, 4));
  if (p.pain && typeof p.pain === "object") {
    for (const [k, v] of Object.entries(p.pain)) if (isDateKey(k) && ["green", "yellow", "red"].includes(v)) s.pain[k] = v;
  }
  if (Array.isArray(p.log)) {
    s.log = p.log.filter((l) => l && typeof l === "object" && isDateKey(l.date)).map((l) => ({
      id: strOr(l.id, uid(), 40), date: l.date, ts: numOr(l.ts, 0),
      type: ["strength", "spine", "rescue", "walk"].includes(l.type) ? l.type : "walk",
      name: strOr(l.name, "Session", 80), mins: Math.round(numOr(l.mins, 1, 0, 600)),
      sets: Array.isArray(l.sets) ? l.sets.filter((x) => x && typeof x === "object").slice(0, 200).map((x) => ({
        ex: strOr(x.ex, "", 30), val: numOr(x.val, 0, 0, 6000), target: numOr(x.target, 0, 0, 6000), kind: strOr(x.kind, "reps", 10),
      })) : [],
      xp: Math.round(numOr(l.xp, 0, 0, 10000)), main: l.main !== false,
    }));
  }
  if (p.prs && typeof p.prs === "object") {
    for (const [k, v] of Object.entries(p.prs)) if (k in EX && typeof v === "number" && isFinite(v)) s.prs[k] = Math.max(0, Math.min(6000, v));
  }
  s.xp = Math.round(numOr(p.xp, 0, 0, 1e9));
  const st = p.streak && typeof p.streak === "object" ? p.streak : {};
  s.streak = {
    current: Math.round(numOr(st.current, 0, 0, 100000)), best: Math.round(numOr(st.best, 0, 0, 100000)),
    freezes: Math.round(numOr(st.freezes, 0, 0, 2)), frozen: {},
    lastRepair: isDateKey(st.lastRepair) ? st.lastRepair : null, earnedAt: Math.round(numOr(st.earnedAt, 0, 0, 1e6)),
  };
  if (st.frozen && typeof st.frozen === "object") for (const k of Object.keys(st.frozen)) if (isDateKey(k)) s.streak.frozen[k] = true;
  if (Array.isArray(p.badges)) s.badges = p.badges.filter((b) => BADGES.some((x) => x.id === b));
  if (Array.isArray(p.weights)) {
    s.weights = p.weights.filter((w) => w && isDateKey(w.date) && typeof w.kg === "number" && w.kg >= 25 && w.kg <= 350)
      .map((w) => ({ date: w.date, kg: Math.round(w.kg * 10) / 10 })).sort((a, b) => a.date < b.date ? -1 : 1).slice(-500);
  }
  const se = p.settings && typeof p.settings === "object" ? p.settings : {};
  s.settings = {
    sound: se.sound !== false, restMain: Math.round(numOr(se.restMain, 120, 30, 600)),
    restAcc: Math.round(numOr(se.restAcc, 75, 15, 600)), restSpine: Math.round(numOr(se.restSpine, 25, 5, 120)),
    alertMin: Math.round(numOr(se.alertMin, 15, 0, 120)), theme: ["auto", "dark", "light"].includes(se.theme) ? se.theme : "auto",
  };
  s.seenGuide = !!p.seenGuide;
  s.createdAt = isDateKey(p.createdAt) ? p.createdAt : todayKey();
  return s;
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { storageOK = false; }
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { storageOK = false; return; }
  if (!raw) return;
  try { S = sanitizeState(JSON.parse(raw)); }
  catch (e) { RESCUE_RAW = raw; } // corrupt/foreign state: keep for rescue, start fresh
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch (_) {}

/* ---------- sessions per day ---------- */
const sessionsOn = (date) => S.log.filter((l) => l.date === date);
const dayCounts = (date) => sessionsOn(date).length > 0; // any completed session counts

/* ---------- streak engine: silent freezes + repair window ---------- */
function recomputeStreak() {
  const t = todayKey();
  // earn freezes: 1 per 7 counted days total, max 2 banked
  const totalCounted = new Set(S.log.map((l) => l.date)).size;
  const shouldHaveEarned = Math.floor(totalCounted / 7);
  if (shouldHaveEarned > S.streak.earnedAt) {
    S.streak.freezes = Math.min(2, S.streak.freezes + (shouldHaveEarned - S.streak.earnedAt));
    S.streak.earnedAt = shouldHaveEarned;
  }
  // walk backward from today (today only counts if already done)
  let cur = 0;
  let d = dayCounts(t) ? t : dayShift(t, -1);
  while (true) {
    if (dayCounts(d) || S.streak.frozen[d]) { cur += (dayCounts(d) ? 1 : 0); d = dayShift(d, -1); continue; }
    if (d === t) { d = dayShift(d, -1); continue; }
    // missed day: silently apply a freeze if banked (never for >2 consecutive misses)
    const prevMissed = !dayCounts(dayShift(d, -1)) && !S.streak.frozen[dayShift(d, -1)];
    if (S.streak.freezes > 0 && !prevMissed && d >= S.createdAt) {
      S.streak.freezes--; S.streak.frozen[d] = true; d = dayShift(d, -1); continue;
    }
    break;
  }
  S.streak.current = cur;
  S.streak.best = Math.max(S.streak.best || 0, cur);
  save();
}
/* Repair: if the chain broke in the last 1-2 days, one completed session
   today bridges the gap (24-48h mercy window). Max once per 14 days. */
function repairInfo() {
  const t = todayKey();
  const y1 = dayShift(t, -1), y2 = dayShift(t, -2), y3 = dayShift(t, -3);
  const covered = (d) => dayCounts(d) || S.streak.frozen[d];
  const cooldownOK = !S.streak.lastRepair || (new Date(t) - new Date(S.streak.lastRepair)) / 864e5 >= 14;
  if (dayCounts(t) || covered(y1) || !cooldownOK) return { available: false, days: [] };
  if (covered(y2)) return { available: true, days: [y1] };
  if (covered(y3) && y2 >= S.createdAt) return { available: true, days: [y1, y2] };
  return { available: false, days: [] };
}
function tryRepair() {
  const r = repairInfo();
  if (r.available) { r.days.forEach((d) => { S.streak.frozen[d] = true; }); S.streak.lastRepair = todayKey(); }
}

/* ---------- XP / levels / badges ---------- */
function xpLevel() {
  let lv = 0;
  for (let i = 0; i < LEVELS_XP.length; i++) if (S.xp >= LEVELS_XP[i]) lv = i;
  const cur = LEVELS_XP[lv], next = LEVELS_XP[lv + 1] ?? null;
  return { lv, name: LEVEL_NAMES[lv], cur, next, pct: next ? Math.min(100, Math.round(((S.xp - cur) / (next - cur)) * 100)) : 100 };
}
function checkBadges() {
  const earned = [];
  for (const b of BADGES) if (!S.badges.includes(b.id) && b.test(S)) { S.badges.push(b.id); earned.push(b); }
  return earned;
}

/* ---------- pain ---------- */
const painToday = () => S.pain[todayKey()] || null;
function setPain(level) { S.pain[todayKey()] = level; save(); }

/* ---------- workout generation ---------- */
function ladderRung(ladderKey) {
  const ladder = LADDERS[ladderKey];
  let idx = Math.min(S.levels[ladderKey] ?? 0, ladder.rungs.length - 1);
  // clamp to the highest rung allowed by current phase
  while (idx > 0 && EX[ladder.rungs[idx].ex].phase > S.phase) idx--;
  if (EX[ladder.rungs[idx].ex].phase > S.phase) return null; // even rung 0 is phase-locked
  return { idx, rung: ladder.rungs[idx] };
}
function ladderTarget(ladderKey) {
  const r = ladderRung(ladderKey);
  if (!r) return null;
  const { idx, rung } = r;
  const win = rung.scheme.reps || rung.scheme.secs;
  const tkey = `${ladderKey}:${idx}`;
  if (!(tkey in S.targets)) S.targets[tkey] = win[0];
  return { idx, rung, target: Math.min(S.targets[tkey], win[1]), win, tkey, timed: !!rung.scheme.secs };
}
function nextDayType() {
  const n = S.log.filter((l) => l.type === "strength" && l.main !== false).length;
  return DAY_ORDER[n % DAY_ORDER.length];
}
function warmupBlocks(firstMain, dayType) {
  const blocks = [
    { ex: "walk", sets: 1, target: 120, warmup: true, label: "2-min march / easy movement" },
    { ex: "catcamel", sets: 1, target: 8, warmup: true },
    { ex: "curlup", sets: 1, target: 4, warmup: true, label: "4 short holds" },
    { ex: "sideplank", sets: 1, target: 10, warmup: true, label: "10s each side" },
    { ex: "birddog", sets: 1, target: 4, warmup: true, label: "4 each side, 8s holds" },
  ];
  if (dayType === "lowerA" || dayType === "lowerB") {
    blocks.push({ ex: "gluteBridge", sets: 1, target: 10, warmup: true });
    blocks.push({ ex: "hipHingeDrill", sets: 1, target: 6, warmup: true, label: "Groove the hinge" });
  } else {
    blocks.push({ ex: "scapPull", sets: 1, target: 6, warmup: true, label: "Easy scapular pulls" });
  }
  if (firstMain) blocks.push({ ...firstMain, sets: 1, warmup: true, ramp: true, label: "Ramp-up set — easy half effort" });
  return blocks;
}
/* Build a concrete session item list. pain: green|yellow (red → spine only, handled upstream) */
function buildWorkout(dayType, pain) {
  const tpl = DAY_TEMPLATES[dayType];
  const lite = pain === "yellow";
  const items = [];
  let firstMain = null;
  for (const b of tpl.blocks) {
    if (lite && b.lite) continue;
    if (b.phaseMin && S.phase < b.phaseMin) continue;
    if (b.ladder) {
      const t = ladderTarget(b.ladder);
      if (!t) continue; // whole ladder is phase-locked (e.g. Phase 1)
      const ex = EX[t.rung.ex];
      const sets = Math.max(2, (b.sets ?? t.rung.scheme.sets) - (lite ? 1 : 0));
      // "volume"/B-day slots run easier than the stored target and never drive progression
      const target = b.volume ? Math.max(t.win[0], t.target - 2) : t.target;
      const item = { ladder: b.ladder, exId: t.rung.ex, ex, sets, target, tkey: t.tkey, win: t.win, rungIdx: t.idx,
        timed: t.timed, note: b.note, volume: !!b.volume, main: !firstMain };
      if (!firstMain) firstMain = { ex: t.rung.ex, target: Math.max(2, Math.ceil(target / 2)) };
      items.push(item);
    } else {
      const ex = EX[b.ex];
      if (ex.phase > S.phase) continue;
      const timed = ex.kind === "secs" || ex.kind === "secside";
      items.push({ exId: b.ex, ex, sets: Math.max(1, b.sets - (lite ? 1 : 0)), target: b.target, timed, note: b.note, pyramid: b.pyramid });
    }
  }
  return { name: tpl.name, tag: tpl.tag, icon: tpl.icon, est: lite ? Math.round(tpl.est * 0.6) : tpl.est,
    type: "strength", dayType, lite, warmup: warmupBlocks(firstMain, dayType), items };
}
function buildRoutine(def, type) {
  const items = def.blocks.map((b) => {
    const ex = EX[b.ex];
    const timed = ex.kind === "secs" || ex.kind === "secside";
    return { exId: b.ex, ex, sets: b.sets, target: b.target, timed, note: b.note, pyramid: b.pyramid };
  }).filter((i) => i.ex.phase <= Math.max(S.phase, 1));
  return { name: def.name, icon: def.icon, est: def.est, type, items, warmup: [] };
}

/* Progression after a completed strength session.
   Evidence rule: advance only after hitting the target on all sets TWO sessions
   running; then target+1 within the window, or a ladder-up offer at the top.
   Volume (B-day) slots and yellow-day sessions never drive progression. */
function applyProgression(session) {
  const offers = [];
  if (session.lite) return offers;
  for (const it of session.items) {
    if (!it.ladder || it.volume || it.warmup || !it.setLog) continue;
    if (it.setLog.filter((v) => v != null).length < it.sets) continue;
    const okKey = it.tkey + ":ok";
    const allHit = it.setLog.every((v) => v >= it.target);
    if (!allHit) { S.targets[okKey] = 0; continue; }
    const okCount = (S.targets[okKey] || 0) + 1;
    if (okCount < 2) { S.targets[okKey] = okCount; continue; }
    S.targets[okKey] = 0;
    if (it.target < it.win[1]) {
      S.targets[it.tkey] = it.target + 1;
    } else {
      const ladder = LADDERS[it.ladder];
      const builtIdx = it.rungIdx ?? 0;
      // phase-limited (clamped below stored level): the user is boxed by phase, not ability
      if (builtIdx < (S.levels[it.ladder] ?? 0)) continue;
      if (builtIdx < ladder.rungs.length - 1) {
        const nxt = ladder.rungs[builtIdx + 1];
        offers.push({ ladder: it.ladder, from: EX[ladder.rungs[builtIdx].ex].name, to: EX[nxt.ex].name,
          locked: EX[nxt.ex].phase > S.phase, needPhase: EX[nxt.ex].phase });
      }
    }
  }
  return offers;
}
function ladderUp(ladderKey) {
  const ladder = LADDERS[ladderKey];
  const cur = S.levels[ladderKey] ?? 0;
  if (cur < ladder.rungs.length - 1) {
    S.levels[ladderKey] = cur + 1;
    const rung = ladder.rungs[cur + 1];
    const win = rung.scheme.reps || rung.scheme.secs;
    S.targets[`${ladderKey}:${cur + 1}`] = win[0];
    save();
  }
}

/* ---------- finish a session ---------- */
function completeSession(session, mins) {
  tryRepair();
  const sets = [];
  let setCount = 0, prList = [];
  for (const it of session.items) {
    if (!it.setLog || it.warmup) continue; // warm-up work earns nothing and records nothing
    for (const v of it.setLog) {
      if (v == null) continue;
      sets.push({ ex: it.exId, val: v, target: it.target, kind: it.ex.kind });
      setCount++;
      if (!it.ex.kind.includes("side")) {
        if (v > (S.prs[it.exId] || 0) && v >= 3) { S.prs[it.exId] = v; if (session.type === "strength") prList.push({ ex: it.ex.name, val: v, timed: it.timed }); }
      }
    }
  }
  const mainWork = session.type !== "strength" || setCount > 0;
  let xp = (XP_RULES[session.type] || 10) + setCount * XP_RULES.set + prList.length * XP_RULES.pr;
  S.xp += xp;
  S.log.push({ id: uid(), date: todayKey(), ts: Date.now(), type: session.type, name: session.name, mins, sets, xp, main: mainWork });
  const offers = session.type === "strength" ? applyProgression(session) : [];
  recomputeStreak();
  const badges = checkBadges();
  save();
  return { xp, prList, offers, badges };
}

/* ---------- ICS calendar generation (iOS-verified path) ---------- */
const ICS_DAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
function icsEscape(s) { return String(s).replace(/\r/g, "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
/* RFC 5545 line folding: max 75 octets per line, continuation lines start with a space */
function icsFold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 74) return line;
  const out = [];
  let cur = "";
  for (const ch of line) { // iterate by code point to never split a character
    if (enc.encode(cur + ch).length > (out.length ? 73 : 74)) { out.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((l, i) => (i ? " " + l : l)).join("\r\n");
}
function icsStamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}
function icsLocal(dateKey, timeHHMM) {
  return dateKey.replace(/-/g, "") + "T" + timeHHMM.replace(":", "") + "00";
}
function nextWeekday(dow, timeHHMM) {
  // next occurrence (incl. today if time is still ahead)
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (d.getDay() !== dow) continue;
    if (i === 0) {
      const [h, m] = timeHHMM.split(":").map(Number);
      if (now.getHours() * 60 + now.getMinutes() >= h * 60 + m) continue;
    }
    return dkey(d);
  }
  return todayKey();
}
function makeEvent({ title, desc, dateKey, timeHHMM, durMin, rrule, alertMin }) {
  const start = icsLocal(dateKey, timeHHMM);
  const [sh, sm] = timeHHMM.split(":").map(Number);
  const endMin = Math.min(sh * 60 + sm + durMin, 23 * 60 + 59); // cap at same-day 23:59 (avoid DTEND < DTSTART)
  const endHH = String(Math.floor(endMin / 60)).padStart(2, "0"), endMM = String(endMin % 60).padStart(2, "0");
  const end = icsLocal(dateKey, `${endHH}:${endMM}`);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid()}@forge.app`, // always-new UID: avoids the iOS re-import silent-fail bug
    `DTSTAMP:${icsStamp()}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
  ];
  if (rrule) lines.push(`RRULE:${rrule}`);
  lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(title)}`,
    `TRIGGER:-PT${Math.max(0, alertMin)}M`, "END:VALARM", "END:VEVENT");
  return lines;
}
function buildScheduleICS() {
  const p = S.profile;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "METHOD:PUBLISH", "PRODID:-//FORGE//Workout//EN", "CALSCALE:GREGORIAN"];
  for (const dow of p.trainDays) {
    lines.push(...makeEvent({
      title: "🔥 FORGE — Training day",
      desc: `${p.anchor ? "Cue: " + p.anchor + ". " : ""}Open the app, hit Start. Even 5 minutes counts. (Never within the first hour after waking — discs are vulnerable then.)`,
      dateKey: nextWeekday(dow, p.time), timeHHMM: p.time, durMin: 45,
      rrule: `FREQ=WEEKLY;BYDAY=${ICS_DAY[dow]};COUNT=12`, alertMin: S.settings.alertMin,
    }));
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
function buildSpineICS(timeHHMM) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "METHOD:PUBLISH", "PRODID:-//FORGE//Spine//EN", "CALSCALE:GREGORIAN"];
  const now = new Date();
  const [h, m] = timeHHMM.split(":").map(Number);
  const passed = now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
  lines.push(...makeEvent({
    title: "🧘 FORGE — 10-min Spine Reset",
    desc: "Cat-camel, curl-up, side plank, bird dog. Daily back armour — never within an hour of waking.",
    dateKey: passed ? dayShift(todayKey(), 1) : todayKey(),
    timeHHMM, durMin: 15, rrule: "FREQ=DAILY;COUNT=84", alertMin: S.settings.alertMin,
  }));
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/* ---------- getting files to the user ----------
   iOS standalone (home-screen) web apps and sandboxed iframes (the claude.ai
   artifact) can't reliably do <a download> — use the share sheet or a copy
   fallback there. Plain Safari gets the normal download. */
function isConstrained() {
  try {
    return navigator.standalone === true ||
      (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
      window.self !== window.top;
  } catch (_) { return true; }
}
function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime }); // blob, never data: URI (iOS)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
}
async function deliverFile(name, content, mime, label) {
  // claude.ai artifact viewer: use the granted downloads capability when present
  if (typeof window !== "undefined" && window.claude && window.claude.downloads) {
    try {
      await window.claude.downloads.save({ filename: name, data: content });
      return "downloaded";
    } catch (e) {
      if (e && e.code === "declined") return "cancelled";
      openCopySheet(name, content, label); // e.g. .ics is outside the viewer's allowlist
      return "copy";
    }
  }
  if (isConstrained()) {
    try {
      const f = new File([content], name, { type: mime.split(";")[0] });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f] });
        return "shared";
      }
    } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
    openCopySheet(name, content, label); // defined in ui.js
    return "copy";
  }
  downloadFile(name, content, mime);
  return "downloaded";
}

/* ---------- backup ---------- */
function exportData() { return deliverFile(`forge-backup-${todayKey()}.json`, JSON.stringify(S, null, 1), "application/json", "Backup"); }
function importData(text) {
  const prev = S;
  try {
    S = sanitizeState(JSON.parse(text)); // throws on anything that isn't a valid v1 state
    save();
  } catch (e) {
    S = prev; // never let a failed import touch existing data
    throw e;
  }
}

/* ---------- audio (iOS-safe: <audio> element, gesture-unlocked) ---------- */
let audioEl = null, audioReady = false;
function makeBeepWav(freq = 880, ms = 160, count = 1, gapMs = 90) {
  const rate = 22050, amp = 0.6;
  const seg = Math.floor(rate * ms / 1000), gap = Math.floor(rate * gapMs / 1000);
  const total = count * seg + (count - 1) * gap;
  const data = new Int16Array(total);
  for (let c = 0; c < count; c++) {
    const off = c * (seg + gap);
    for (let i = 0; i < seg; i++) {
      const env = Math.min(1, i / (rate * 0.01), (seg - i) / (rate * 0.03));
      data[off + i] = Math.round(Math.sin(2 * Math.PI * freq * i / rate) * amp * env * 32767);
    }
  }
  const buf = new ArrayBuffer(44 + data.length * 2);
  const v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + data.length * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, "data"); v.setUint32(40, data.length * 2, true);
  new Int16Array(buf, 44).set(data);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
let URL_BEEP1 = null, URL_BEEP3 = null, URL_SILENT = null;
function makeSilentWav(ms = 120) {
  const rate = 8000, n = Math.floor(rate * ms / 1000);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, "data"); v.setUint32(40, n * 2, true); // samples stay zero = silence
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
function unlockAudio() { // call from a user gesture (Start button)
  if (audioReady || !S.settings.sound) return;
  try {
    if (!URL_BEEP1) { URL_BEEP1 = makeBeepWav(880, 150, 1); URL_BEEP3 = makeBeepWav(988, 140, 3); URL_SILENT = makeSilentWav(); }
    audioEl = audioEl || new Audio();
    // iOS ignores element volume — unlock with a genuinely silent clip, unmuted
    audioEl.src = URL_SILENT;
    audioEl.play().then(() => { audioReady = true; }).catch(() => {});
  } catch (_) {}
}
function beep(triple) {
  if (!S.settings.sound || !audioEl) return;
  try { audioEl.src = triple ? URL_BEEP3 : URL_BEEP1; audioEl.volume = 1; audioEl.currentTime = 0; audioEl.play().catch(() => {}); } catch (_) {}
}

/* ---------- wake lock (screen on during workouts) ---------- */
let wakeLock = null, wantWake = false;
async function acquireWake() {
  wantWake = true;
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (_) {}
}
function releaseWake() {
  wantWake = false;
  try { wakeLock && wakeLock.release(); } catch (_) {} wakeLock = null;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wantWake) acquireWake();
});
