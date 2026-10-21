/* ============================================================
   FORGE — guardrails for multi-session days
   Evidence → rules: docs/redesign/research.md §2. Every message gives the
   reason in one line; blocks always come with an alternative.
   ============================================================ */

const GUARD = {
  STRENGTH_GAP_H: 6,        // between two full strength sessions (Baar ~6 h tissue reset; AM/PM studies)
  SPLIT_GAP_H: 4,           // suggested (soft) gap between split halves
  SAME_PATTERN_BLOCK_H: 24, // same pattern hard again (MPS/recovery)
  SAME_PATTERN_WARN_H: 48,
  DAY_HARD_WARN: 20, DAY_HARD_BLOCK: 26,
  PATTERN_DAY_WARN: 8, PATTERN_DAY_BLOCK: 10,
  WEEK_PATTERN_WARN: 20,    // hard sets per pattern per rolling week (Schoenfeld 10–20)
  WEEK_HARD_DAYS: 5,        // ≥1 full rest day from hard sets
  SPINE_MAX_DAY: 3, SPINE_GAP_H: 2,
  WAKE_BLOCK_MIN: 60, WAKE_WARN_MIN: 120,
};
const H = 3600e3;

/* Hard sets a log contributed, per pattern (cached on the log; v1 logs computed from sets). */
function hardOf(l) {
  if (l.hard) return l.hard;
  const h = {};
  if (l.type === "strength" || l.type === "quick" || l.type === "rescue") {
    for (const s of l.sets || []) {
      const gp = EX[s.ex]?.gp;
      if (gp && s.val > 0) h[gp] = (h[gp] || 0) + 1;
    }
  }
  return h;
}
const hardTotal = (h) => Object.values(h).reduce((a, b) => a + b, 0);
function plannedHard(items) {
  const h = {};
  for (const it of items) if (!it.warmup && it.ex.gp) h[it.ex.gp] = (h[it.ex.gp] || 0) + it.sets;
  return h;
}
const isStrengthLog = (l) => l.type === "strength";
const strengthToday = () => sessionsOn(todayKey()).filter(isStrengthLog);

/* Minutes since the user's usual wake time. Night (more than 3 h before wake) = not morning. */
function minsSinceWake(now = new Date()) {
  const [h, m] = (S.profile?.wake || "07:00").split(":").map(Number);
  const d = now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
  if (d < -180) return 9999;
  return Math.max(0, d);
}
const wakeTime = (plusMin) => {
  const [h, m] = (S.profile?.wake || "07:00").split(":").map(Number);
  const d = new Date(); d.setHours(h, m + plusMin, 0, 0); return d.getTime();
};
const fmtTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
// "Ready at 4:30." — or, when that lands after 10pm or tomorrow, point at tomorrow instead of a 3am time
const readyWhen = (ts) => {
  const d = new Date(ts);
  return tooLate(ts) ? "Not tonight — next one tomorrow." : `Ready at ${fmtTime(ts)}.`;
};
const tooLate = (ts) => { const d = new Date(ts); return d.toDateString() !== new Date().toDateString() || d.getHours() >= 22; };
// split halves are one day's work, so a late part 1 just shortens the break instead of pushing part 2 past midnight
const part2When = (ts) => (tooLate(ts) ? "It's getting late, so take a shorter break before part 2" : `Part 2 is best after ${fmtTime(ts)}`);

/* Rolling-window sums */
function hardSince(sinceTs, exclude) {
  const out = {};
  for (const l of S.log) {
    if ((l.ts || 0) < sinceTs || (exclude && exclude(l))) continue;
    for (const [k, v] of Object.entries(hardOf(l))) out[k] = (out[k] || 0) + v;
  }
  return out;
}
function lastHardTs(gp, exclude) {
  let t = 0;
  for (const l of S.log) if (!(exclude && exclude(l)) && (hardOf(l)[gp] || 0) > 0) t = Math.max(t, l.ts || 0);
  return t;
}
function hardDaysLast7(excludeToday) {
  const days = new Set();
  const since = Date.now() - 7 * 24 * H;
  for (const l of S.log) if ((l.ts || 0) >= since && hardTotal(hardOf(l)) > 0 && !(excludeToday && l.date === todayKey())) days.add(l.date);
  return days.size;
}

/* The core check. plan = {items, dayType, part (1|2|null), quick}.
   → {level: "ok"|"warn"|"block", notes: [{level, text, why}], availableAt, alt: [...]} */
function checkStrength(plan) {
  const now = Date.now();
  const notes = [];
  let availableAt = 0;
  const add = (level, text, why, at) => { notes.push({ level, text, why }); if (at) availableAt = Math.max(availableAt, at); };
  const pain = painToday();
  const tpl = plan.dayType ? DAY_TEMPLATES[plan.dayType] : null;

  if (pain === "red") add("block", "Rough back day — strength is paused today.", "Training through a flare-up slows recovery. Spine Reset and a gentle walk are today's medicine.");
  if (S.phase === 1) add("block", "Phase 1 is about calming your back first.", "Strength unlocks in Phase 2 — the gate is in Me › Your plan.");

  const msw = minsSinceWake();
  if (msw < GUARD.WAKE_BLOCK_MIN) add("block", `You're within an hour of waking (usual wake ${S.profile?.wake || "07:00"}).`,
    "Discs are fuller first thing, so bending stress is up to ~3× higher (Adams 1987). Walk first, train a bit later.", wakeTime(GUARD.WAKE_BLOCK_MIN));
  else if (msw < GUARD.WAKE_WARN_MIN) add("warn", "Still early — keep every rep smooth today.",
    "Discs are still extra-sensitive in the first couple of hours after waking.");

  // same-day split sibling (part 1 ↔ part 2 of the same template) is one day's work, not a repeat
  const sibling = (l) => plan.part && l.date === todayKey() && l.dayType === plan.dayType && l.part && l.part !== plan.part;
  const planned = plannedHard(plan.items || []);

  for (const gp of Object.keys(planned)) {
    const last = lastHardTs(gp, sibling);
    if (!last) continue;
    const hrs = (now - last) / H;
    if (hrs < GUARD.SAME_PATTERN_BLOCK_H) {
      add("block", `Your ${GP_NAMES[gp]} muscles worked hard ${Math.max(1, Math.round(hrs))} h ago.`,
        "They need about 24 h before working hard again — that's when the strength actually gets built.", last + GUARD.SAME_PATTERN_BLOCK_H * H);
    } else if (hrs < GUARD.SAME_PATTERN_WARN_H && !plan.part) {
      add("warn", `Your ${GP_NAMES[gp]} muscles trained ${Math.round(hrs)} h ago — keep a rep or two in reserve.`,
        "Recovery from a hard set takes 24–48 h; stopping short of failure speeds it up.");
    }
  }

  // second session of the day?
  const todays = strengthToday().filter((l) => !sibling(l));
  const doneFull = todays.filter((l) => !l.part || l.part === 2 || plan.dayType !== l.dayType);
  if (todays.length && !(plan.part === 2 && todays.every((l) => l.dayType === plan.dayType))) {
    if (pain === "yellow") add("block", "Niggly back days get one strength session, max.", "Keep the rest of today to the Spine Reset and walks.");
    const regions = new Set(todays.map((l) => DAY_TEMPLATES[l.dayType]?.region).filter(Boolean));
    if (tpl && regions.has(tpl.region)) add("block", `You've already trained your ${tpl.region} body today.`,
      "A second session should work the other half of your body.");
    const lastEnd = Math.max(...todays.map((l) => l.ts || 0));
    if (now - lastEnd < GUARD.STRENGTH_GAP_H * H && !plan.part) add("block", "A second session needs 6 hours of breathing room.",
      "Muscles and tendons reset over about 6 h — that's what makes two-a-days safe.", lastEnd + GUARD.STRENGTH_GAP_H * H);
    if (doneFull.length >= 2) add("block", "That's two strength sessions today already.", "Two is the ceiling — more starts eating into recovery.");
  }
  if (plan.part === 2) {
    const p1 = strengthToday().find((l) => l.dayType === plan.dayType && l.part === 1);
    const at = p1 && p1.ts + GUARD.SPLIT_GAP_H * H;
    if (p1 && now < at) add("warn", `${part2When(at)}.`, tooLate(at)
      ? "Even an hour or two helps, and finishing tonight beats skipping it."
      : "4–6 h between halves gives you a proper breather — but sooner is fine if that's when you've got time.");
  }

  // daily + weekly volume
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const today = hardSince(dayStart.getTime());
  const dayTotal = hardTotal(today) + hardTotal(planned);
  if (dayTotal > GUARD.DAY_HARD_BLOCK) add("block", `That would be ${dayTotal} hard sets today.`, "Past ~26 the extra work stops helping and starts costing recovery.");
  else if (dayTotal > GUARD.DAY_HARD_WARN) add("warn", `${dayTotal} hard sets today — a big day.`, "Fine occasionally; keep tomorrow easy.");
  for (const [gp, n] of Object.entries(planned)) {
    const tot = (today[gp] || 0) + n;
    if (tot > GUARD.PATTERN_DAY_BLOCK) add("block", `${tot} hard ${GP_NAMES[gp]} sets in one day is too many.`, "Extra sets past ~10 per muscle in a day add nothing measurable.");
    else if (tot > GUARD.PATTERN_DAY_WARN) add("warn", `${tot} hard ${GP_NAMES[gp]} sets today — near the useful limit.`, "Gains flatten out past about 10 sets per muscle per day.");
  }
  const week = hardSince(now - 7 * 24 * H);
  for (const [gp, n] of Object.entries(planned)) {
    const tot = (week[gp] || 0) + n;
    if (tot > GUARD.WEEK_PATTERN_WARN) add("warn", `${tot} hard ${GP_NAMES[gp]} sets this week — above the 10–20 sweet spot.`, "More weekly volume has diminishing returns and raises tendon strain.");
  }
  if (!todays.length && hardDaysLast7(true) >= GUARD.WEEK_HARD_DAYS && !plan.quick)
    add("warn", "This would be a 6th hard day this week.", "At least one full rest day a week is where strength gets built.");

  const level = notes.some((n) => n.level === "block") ? "block" : notes.some((n) => n.level === "warn") ? "warn" : "ok";
  return { level, notes, availableAt: availableAt > now ? availableAt : 0, alt: level === "block" ? ["spine", "walk"] : [] };
}

/* Spine Reset is gentle — only soft nudges. */
function checkSpine() {
  const done = sessionsOn(todayKey()).filter((l) => l.type === "spine");
  const notes = [];
  if (done.length >= GUARD.SPINE_MAX_DAY) notes.push({ level: "warn", text: "That's 3 Spine Resets today already.", why: "Three is plenty — more doesn't add much. A walk is a great alternative." });
  const last = Math.max(0, ...done.map((l) => l.ts || 0));
  if (last && Date.now() - last < GUARD.SPINE_GAP_H * H) notes.push({ level: "warn", text: `Last Reset was ${Math.round((Date.now() - last) / 60000)} min ago.`, why: "Spacing them 2 h+ apart spreads the benefit across your day." });
  return { level: notes.length ? "warn" : "ok", notes };
}

/* Which full session could come second today (the other body region, next in rotation). */
function secondSessionOption() {
  const todays = strengthToday();
  if (!todays.length) return null;
  const used = new Set(todays.map((l) => DAY_TEMPLATES[l.dayType]?.region).filter(Boolean));
  const order = DAY_ORDER.slice(DAY_ORDER.indexOf(nextDayType())).concat(DAY_ORDER);
  const dayType = order.find((d) => !used.has(DAY_TEMPLATES[d].region));
  if (!dayType) return null;
  const w = buildWorkout(dayType, painToday() || "green");
  return { dayType, check: checkStrength({ items: w.items, dayType }) };
}

/* Deload: every ~6 weeks of steady training, or when recovery signals pile up. */
function deloadActive() {
  return S.deload && (new Date(todayKey()) - new Date(S.deload)) / 864e5 < 7;
}
function deloadSuggestion() {
  if (deloadActive() || S.deloadDismissed === todayKey()) return null;
  const since = Date.now() - 7 * 24 * H;
  const rough = S.log.filter((l) => (l.ts || 0) >= since && (l.back === "worse" || l.rpe === "hard")).length;
  if (rough >= 3) return "Your last few sessions felt rough. A lighter week now means stronger weeks after.";
  // consecutive training weeks (≥3 strength sessions) since the last deload
  let weeks = 0;
  for (let w = 1; w <= 12; w++) {
    const end = Date.now() - (w - 1) * 7 * 24 * H, start = end - 7 * 24 * H;
    if (S.deload && new Date(S.deload).getTime() >= start) break;
    const n = S.log.filter((l) => isStrengthLog(l) && l.ts >= start && l.ts < end).length;
    if (n >= 3) weeks++; else break;
  }
  if (weeks >= 6) return `${weeks} strong weeks in a row. Time for a lighter week so your body can catch up.`;
  return null;
}
