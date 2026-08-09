/* ============================================================
   FORGE — UI layer
   Screens, guided player, charts, sheets. Event delegation via data-a.
   ============================================================ */

const UI = { screen: "today", sheet: null, onboard: 0, ob: {}, session: null, rest: null, timer: null, libFilter: "", libQ: "" };

const $app = () => document.getElementById("app");
const NAV = [
  { id: "today", ico: "⚒️", label: "Today" },
  { id: "progress", ico: "📈", label: "Progress" },
  { id: "plan", ico: "🗺️", label: "Plan" },
  { id: "library", ico: "📚", label: "Moves" },
  { id: "settings", ico: "⚙️", label: "Setup" },
];

/* ---------- generic helpers ---------- */
function showToast(msg) {
  document.getElementById("toast")?.remove();
  const t = document.createElement("div");
  t.id = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function confetti() {
  const colors = ["#ff6a2b", "#57d98a", "#f5c542", "#4dc4b0", "#f5efe6"];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    const s = 5 + Math.random() * 7;
    c.style.cssText = `left:${Math.random() * 100}vw;width:${s}px;height:${s * (0.6 + Math.random())}px;background:${colors[i % colors.length]};animation-duration:${1.3 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.5}s;`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}
const painChip = { green: ["😊", "Good", "sel-good"], yellow: ["😐", "Niggly", "sel-warn"], red: ["😖", "Rough", "sel-bad"] };

/* ============================================================
   ONBOARDING
   ============================================================ */
function renderOnboard() {
  const step = UI.onboard;
  const steps = [obWelcome, obBack, obLegs, obCapability, obSchedule, obBody, obDone];
  $app().innerHTML = `<div class="screen" style="padding-top:12px">
    <div class="row between" style="margin-bottom:18px">
      <span class="kicker">FORGE</span>
      <span>${step > 0 ? `<button class="chip" data-a="ob-prev">← back</button>` : ""} <span class="micro">${step + 1} / ${steps.length}</span></span>
    </div>
    <div class="progress-track" style="margin-bottom:22px"><div class="fill" style="width:${((step + 1) / steps.length) * 100}%"></div></div>
    ${steps[step]()}
  </div>`;
  document.getElementById("nav")?.remove();
}
function obWelcome() {
  if (UI.ob.rf) {
    return `
      <h1 class="display" style="color:var(--bad)">Doctor first.<br><span style="color:var(--ink)">Then we train.</span></h1>
      <p class="sub" style="margin:14px 0 16px">Any of these can mean nerves are being compressed in a way that needs same-day medical attention — not a workout app:</p>
      <div class="card" style="border-color:var(--bad)">
        <ul style="margin-left:18px;font-size:14px;color:var(--ink-2);display:flex;flex-direction:column;gap:5px">
          ${RED_FLAGS.map((r) => `<li>${r}</li>`).join("")}
        </ul>
      </div>
      <p class="sub" style="margin-bottom:16px">Please get checked before starting any training. FORGE will be right here when you're cleared. 🧡</p>
      <button class="btn ghost" data-a="ob-rf-back">← I misread — none of these apply</button>`;
  }
  const constrained = (() => { try { return navigator.standalone === true || matchMedia("(display-mode: standalone)").matches || window.self !== window.top; } catch (_) { return false; } })();
  return `
    <h1 class="display">Get strong.<br><span style="color:var(--accent)">Guard the back.</span></h1>
    <p class="sub" style="margin:14px 0 18px">Your personal system for the power tower in your room: a back-safe strength program, a daily 10-minute spine routine, and streaks that keep you showing up.</p>
    ${constrained ? `<div class="card accent"><div class="kicker">Coming from Safari?</div><p class="sub" style="margin:6px 0 10px">The home-screen app has its own storage. Import the backup you exported in Safari to carry your progress over.</p><button class="btn" data-a="sheet" data-v="import">Import my backup</button></div>` : ""}
    <div class="card">
      <div class="kicker muted" style="margin-bottom:8px">Quick safety check</div>
      <p class="sub" style="margin-bottom:10px">Do you have any of these <b>right now</b>?</p>
      <ul style="margin-left:18px;font-size:14px;color:var(--ink-2);display:flex;flex-direction:column;gap:5px">
        ${RED_FLAGS.map((r) => `<li>${r}</li>`).join("")}
      </ul>
    </div>
    <button class="btn primary big" data-a="ob-next">None of those — let's go</button>
    <button class="btn ghost" data-a="ob-redflag" style="margin-top:10px">I have one of these</button>
    <p class="micro" style="margin-top:14px;text-align:center">FORGE is a training tool, not medical advice. If in doubt, see a professional first.</p>`;
}
function obBack() {
  return `
    <h2 class="display">How's the back<br>been lately?</h2>
    <div class="stack" style="margin-top:18px">
      <button class="btn" data-a="ob-back" data-v="1" style="justify-content:flex-start;text-transform:none;letter-spacing:0;font-family:var(--font-body);font-weight:600;font-size:16px">😖&nbsp; Flared up / hurting right now</button>
      <button class="btn" data-a="ob-back" data-v="2" style="justify-content:flex-start;text-transform:none;letter-spacing:0;font-family:var(--font-body);font-weight:600;font-size:16px">😐&nbsp; Niggly, but I can manage</button>
      <button class="btn" data-a="ob-back" data-v="3" style="justify-content:flex-start;text-transform:none;letter-spacing:0;font-family:var(--font-body);font-weight:600;font-size:16px">🙂&nbsp; Mostly fine, occasional twinges</button>
    </div>
    <p class="micro" style="margin-top:14px">This sets your starting phase. You can change it any time in Plan.</p>`;
}
function obLegs() {
  return `
    <h2 class="display">Any pain, tingling or numbness running <span style="color:var(--accent)">down a leg</span>?</h2>
    <p class="sub" style="margin:12px 0 18px">This matters more than back pain itself. Leg symptoms are the signal we never train through.</p>
    <div class="grid-2">
      <button class="btn" data-a="ob-legs" data-v="yes">Yes / sometimes</button>
      <button class="btn" data-a="ob-legs" data-v="no">No</button>
    </div>`;
}
function obCapability() {
  const seg = (id, opts) => `<div class="seg" id="${id}">${opts.map((o, i) => `<button data-a="ob-seg" data-seg="${id}" data-i="${i}" class="${(UI.ob[id] ?? 0) === i ? "active" : ""}">${o}</button>`).join("")}</div>`;
  return `
    <h2 class="display">Where are you<br>starting from?</h2>
    <p class="sub" style="margin:12px 0 16px">Best guesses are fine — the app adjusts as you log.</p>
    <div class="field"><span class="lbl">Strict pull-ups in one go</span>${seg("vpull", ["0", "1–4", "5–9", "10+"])}</div>
    <div class="field"><span class="lbl">Full dips in one go</span>${seg("dip", ["0", "1–4", "5–9", "10+"])}</div>
    <div class="field"><span class="lbl">Push-ups in one go</span>${seg("push", ["0–5", "6–15", "16–30", "30+"])}</div>
    <button class="btn primary big" data-a="ob-next" style="margin-top:8px">Next</button>`;
}
function obSchedule() {
  const days = UI.ob.days || [1, 2, 4, 5];
  return `
    <h2 class="display">When do<br>you train?</h2>
    <p class="sub" style="margin:12px 0 16px">4 days a week is the sweet spot. The 10-min Spine Reset happens every day regardless.</p>
    <div class="field"><span class="lbl">Training days</span>
      <div class="day-picker">${DAYS.map((d, i) => `<button data-a="ob-day" data-i="${i}" class="${days.includes(i) ? "on" : ""}">${d}</button>`).join("")}</div>
    </div>
    <label class="field"><span class="lbl">Usual time</span><input type="time" id="ob-time" value="${UI.ob.time || "18:00"}"></label>
    <label class="field"><span class="lbl">Attach it to a habit you already have <span style="text-transform:none;font-weight:400">(this genuinely works)</span></span>
      <input type="text" id="ob-anchor" placeholder="e.g. right after my evening tea" value="${esc(UI.ob.anchor || "")}"></label>
    <div class="safety-note"><span class="si">☀️</span><span>Avoid the first hour after waking — discs are extra vulnerable then. Evening is perfect.</span></div>
    <button class="btn primary big" data-a="ob-schedule-next" style="margin-top:14px">Next</button>`;
}
function obBody() {
  return `
    <h2 class="display">Bodyweight?<br><span style="color:var(--ink-3);font-size:0.6em">for the abs maths — optional</span></h2>
    <p class="sub" style="margin:12px 0 16px">Six-pack visibility is mostly body-fat percentage. If you log a weight, FORGE gives you protein and deficit targets.</p>
    <label class="field"><span class="lbl">Weight (kg)</span><input type="number" id="ob-kg" inputmode="decimal" placeholder="e.g. 78" value="${UI.ob.kg || ""}"></label>
    <button class="btn primary big" data-a="ob-body-next">Next</button>
    <button class="btn ghost" data-a="ob-body-skip" style="margin-top:10px">Skip</button>`;
}
function obDone() {
  const ph = PHASES[(UI.ob.phase || 2) - 1];
  return `
    <h1 class="display">You're <span style="color:var(--accent)">forged in</span>.</h1>
    <div class="card accent" style="margin-top:16px">
      <div class="kicker">Starting point</div>
      <p style="font-weight:700;font-size:18px;margin-top:6px">Phase ${ph.n} — ${ph.name}</p>
      <p class="sub" style="margin-top:6px">${ph.desc}</p>
    </div>
    <div class="card">
      <div class="kicker muted">The deal</div>
      <ul style="margin:8px 0 0 18px;font-size:14px;color:var(--ink-2);display:flex;flex-direction:column;gap:6px">
        <li><b>Every day:</b> 10-min Spine Reset (this is your streak anchor)</li>
        <li><b>${(UI.ob.days || [1, 2, 4, 5]).length} days a week:</b> strength on the tower</li>
        <li><b>Zero heroics:</b> strict reps, traffic-light pain rules, no morning training</li>
        <li><b>Mercy built in:</b> streak freezes bank up automatically — one bad day never erases your work</li>
      </ul>
    </div>
    <button class="btn primary big" data-a="ob-finish">Enter the Forge</button>`;
}

/* ============================================================
   TODAY
   ============================================================ */
function renderToday() {
  const t = todayKey();
  const p = S.profile;
  const pain = painToday();
  const isTrainDay = p.trainDays.includes(new Date().getDay());
  const doneToday = sessionsOn(t);
  const didStrength = doneToday.some((l) => l.type === "strength");
  const didSpine = doneToday.some((l) => l.type === "spine" || l.type === "rescue");
  const repair = repairInfo();
  const lvl = xpLevel();
  const nudge = NUDGES[Math.floor((Date.now() / 864e5)) % NUDGES.length];
  const dayType = nextDayType();
  const tpl = DAY_TEMPLATES[dayType];
  const lateNoLog = new Date().getHours() >= 20 && doneToday.length === 0;
  const anchorLine = p.anchor
    ? `<p class="micro" style="margin-top:6px">📌 ${esc(p.anchor)} · ${esc(p.time)}</p>`
    : `<button class="chip" data-a="sheet" data-v="anchor" style="margin-top:8px">📌 Tie it to a habit — this genuinely works</button>`;

  let mainCard;
  if (pain === "red") {
    mainCard = `<div class="card accent">
      <div class="kicker" style="color:var(--bad)">Rough back day — we go gentle</div>
      <h2 class="display" style="margin:8px 0 4px">${didSpine ? "Reset done — that was today's win." : "Spine Reset only"}</h2>
      <p class="sub">${didSpine ? "Gentle work on a rough day is exactly right. A short walk stacks well if it feels OK." : "No strength today. Gentle McGill work + a walk is exactly the right training. That's not a cop-out — it's the protocol."}</p>
      <p class="micro" style="margin-top:8px">Doctor same-day if: groin numbness · bladder/bowel changes · leg weakness.</p>
      ${didSpine ? "" : `<button class="btn primary big" data-a="start-spine" style="margin-top:14px">🧘 Start Spine Reset · 10 min</button>`}
      <div class="grid-2" style="margin-top:10px">
        <button class="btn ghost" data-a="log-walk">🚶 Log a walk</button>
        <button class="btn ghost" data-a="start-rescue">🚑 5-min Rescue</button>
      </div>
    </div>`;
  } else if (S.phase === 1) {
    mainCard = `<div class="card accent">
      <div class="kicker" style="color:var(--warn)">Phase 1 · Calm the Fire</div>
      <h2 class="display" style="margin:8px 0 4px">${didSpine ? "🔥 Streak fed." : "🧘 Spine Reset"}</h2>
      <p class="sub">${didSpine ? "Today's work is done. Walking is the other half of the medicine." : "While the back calms down, the daily Spine Reset + walking IS the program. Strength unlocks in Phase 2."}</p>
      ${anchorLine}
      ${didSpine ? "" : `<button class="btn primary big" data-a="start-spine" style="margin-top:14px">Start Spine Reset · 10 min</button>`}
      <div class="grid-2" style="margin-top:10px">
        <button class="btn ghost" data-a="log-walk">🚶 Log a walk</button>
        <button class="btn ghost" data-a="nav" data-v="plan">Phase gate →</button>
      </div>
    </div>`;
  } else if (didStrength) {
    mainCard = `<div class="card accent">
      <div class="kicker" style="color:var(--good)">Done for today 💪</div>
      <h2 class="display" style="margin:8px 0 4px">Forged.</h2>
      <p class="sub">${didSpine ? "Strength AND spine work logged. Perfect day." : "Strength is in. Cap it with the Spine Reset if you have 10 minutes."}</p>
      ${didSpine ? "" : `<button class="btn" data-a="start-spine" style="margin-top:14px">🧘 Spine Reset · 10 min</button>`}
    </div>`;
  } else if (isTrainDay && lateNoLog) {
    mainCard = `<div class="card accent">
      <div class="kicker">Late one? No problem.</div>
      <h2 class="display" style="margin:8px 0 4px">🚑 5 minutes keeps the chain alive</h2>
      <p class="sub">The Rescue circuit fully counts. ${tpl.name} will still be there next session.</p>
      <button class="btn primary big" data-a="start-rescue" style="margin-top:14px">Start 5-min Rescue</button>
      <div class="grid-2" style="margin-top:10px">
        <button class="btn ghost" data-a="start-strength">${tpl.icon} Full ${tpl.name}</button>
        <button class="btn ghost" data-a="start-spine">🧘 Spine Reset</button>
      </div>
    </div>`;
  } else if (isTrainDay) {
    mainCard = `<div class="card accent">
      <div class="kicker">Today · ${tpl.tag}</div>
      <h2 class="display" style="margin:8px 0 2px">${tpl.icon} ${tpl.name}</h2>
      <p class="sub">~${tpl.est} min · rung-matched to your levels${pain === "yellow" ? " · <b>eased off for a niggly day</b>" : ""}</p>
      ${anchorLine}
      <button class="btn primary big" data-a="start-strength" style="margin-top:14px">Start ${tpl.name}</button>
      <div class="grid-2" style="margin-top:10px">
        <button class="btn ghost" data-a="start-spine">🧘 Spine Reset</button>
        <button class="btn ghost" data-a="start-rescue">🚑 5-min Rescue</button>
      </div>
    </div>`;
  } else if (didSpine) {
    mainCard = `<div class="card accent">
      <div class="kicker" style="color:var(--good)">Rest day · handled ✓</div>
      <h2 class="display" style="margin:8px 0 4px">🔥 Streak fed.</h2>
      <p class="sub">Spine work is in the bank. A walk stacks beautifully on top — or just enjoy the recovery.</p>
      <button class="btn ghost" data-a="log-walk" style="margin-top:12px">🚶 Log a walk</button>
    </div>`;
  } else {
    mainCard = `<div class="card accent">
      <div class="kicker">Rest day · recovery builds the strength</div>
      <h2 class="display" style="margin:8px 0 4px">🧘 Spine Reset</h2>
      <p class="sub">10 minutes keeps the streak alive and the back armoured. A walk stacks beautifully on top.</p>
      ${anchorLine}
      <button class="btn primary big" data-a="start-spine" style="margin-top:14px">Start Spine Reset</button>
      <div class="grid-2" style="margin-top:10px">
        <button class="btn ghost" data-a="log-walk">🚶 Log a walk</button>
        <button class="btn ghost" data-a="start-rescue">🚑 5-min Rescue</button>
      </div>
      <button class="btn ghost" data-a="start-strength" style="margin-top:10px">Train anyway</button>
    </div>`;
  }

  $app().innerHTML = `<div class="screen">
    <div class="row between" style="margin-bottom:16px">
      <div><span class="kicker">FORGE</span><div class="micro">${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div></div>
      <button class="chip accent" data-a="sheet" data-v="level">Lv ${lvl.lv} · ${lvl.name}</button>
    </div>
    ${storageOK ? "" : `<div class="card" style="border-color:var(--bad)"><b style="color:var(--bad)">⚠️ Storage unavailable.</b><span class="sub"> Your data can't be saved on this device/browser — export backups won't survive. Try Safari (not private mode).</span></div>`}
    ${window.self !== window.top ? `<div class="card" style="border-color:var(--warn)"><b style="color:var(--warn)">⚠️ This viewer may not keep your data between visits.</b><span class="sub"> Export a backup after each session (Setup → Backup → Export) and Import it next time — or move FORGE to a permanent web address for automatic saving.</span></div>` : ""}
    ${RESCUE_RAW ? `<div class="card" style="border-color:var(--warn)"><b style="color:var(--warn)">⚠️ Previous data couldn't be read.</b><span class="sub"> It's preserved — go to Setup → Backup to rescue it.</span></div>` : ""}
    <div class="card">
      <div class="row between">
        <div class="streak-hero">
          <span class="flame">${S.streak.current > 0 ? "🔥" : "🪵"}</span>
          <span class="count num">${S.streak.current}</span>
          <span class="label">${S.streak.current === 0 ? (S.streak.best > 0 ? `best ${S.streak.best} — chains rebuild fast` : "day streak — light it today") : "day streak"}</span>
        </div>
        <div style="text-align:right">
          <button class="chip" data-a="sheet" data-v="streak">❄️ ×${S.streak.freezes}</button>
          <div class="micro" style="margin-top:4px">best ${S.streak.best}</div>
        </div>
      </div>
      ${repair.available ? `<div class="safety-note" style="background:var(--accent-soft)"><span class="si">🔧</span><span><b>Chain repair available.</b> The last ${repair.days.length === 2 ? "two days" : "day"} slipped — finish anything today and the streak survives.</span></div>
      <button class="btn" data-a="start-rescue" style="margin-top:10px">🚑 Repair it now · 5 minutes</button>` : ""}
    </div>
    ${pain === null ? `<div class="card">
      <div class="kicker muted" style="margin-bottom:10px">Morning back check-in</div>
      <div class="pain-picker">
        ${Object.entries(painChip).map(([k, v]) => `<button data-a="pain" data-v="${k}"><span>${v[0]}</span>${v[1]}</button>`).join("")}
      </div>
    </div>` : `<div class="row" style="margin-bottom:14px"><span class="chip ${pain === "green" ? "good" : pain === "yellow" ? "warn" : "bad"}">${painChip[pain][0]} Back today: ${painChip[pain][1]}</span><button class="chip" data-a="pain-reset">change</button></div>`}
    ${mainCard}
    <div class="card">
      <div class="kicker muted" style="margin-bottom:10px">This week</div>
      <div class="week-dots">${weekDots()}</div>
      <div class="micro" style="margin-top:10px">✓ trained &nbsp;·&nbsp; ~ spine/walk &nbsp;·&nbsp; ❄️ freeze &nbsp;·&nbsp; • planned</div>
    </div>
    <div class="card"><div class="row"><span style="font-size:22px">🔮</span><p class="sub" style="flex:1">${nudge}</p></div></div>
    <button class="btn ghost" data-a="whatis" style="margin-bottom:10px">🧘🚑 What are the Spine Reset & 5-Min Rescue?</button>
    ${!S.seenGuide ? `<button class="btn ghost" data-a="sheet" data-v="guide">📱 Set up iPhone reminders & home-screen app</button>` : ""}
  </div>`;
}
function weekDots() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Sunday
  let html = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dkey(d);
    const logs = sessionsOn(key);
    const strength = logs.some((l) => l.type === "strength");
    const any = logs.length > 0;
    const frozen = S.streak.frozen[key];
    const cls = `day ${strength ? "done" : any ? "partial" : ""} ${key === todayKey() ? "today" : ""}`;
    const mark = strength ? "✓" : any ? "~" : frozen ? "❄️" : S.profile.trainDays.includes(d.getDay()) ? "•" : "";
    html += `<div class="${cls}"><div class="dot">${mark}</div><div class="lbl">${DAYS[d.getDay()]}</div></div>`;
  }
  return html;
}

/* ============================================================
   WORKOUT PLAYER
   ============================================================ */
function startSession(kind) {
  unlockAudio();
  let sess;
  const pain = painToday() || "green";
  if (kind === "strength") {
    if (pain === "red") { showToast("Red day — Spine Reset instead 🙏"); return; }
    sess = buildWorkout(nextDayType(), pain);
    sess.queue = [...sess.warmup.map((b) => warmupItem(b)), ...sess.items];
  } else if (kind === "spine") {
    sess = buildRoutine(SPINE_ROUTINE, "spine"); sess.queue = sess.items;
  } else {
    sess = buildRoutine(RESCUE_ROUTINE, "rescue"); sess.queue = sess.items;
  }
  sess.queue.forEach((it) => { it.setLog = it.setLog || []; });
  sess.items = sess.queue; // one flat list; warm-up items are flagged
  sess.idx = 0; sess.setIdx = 0; sess.startTs = Date.now();
  UI.session = sess;
  acquireWake();
  renderPlayer();
}
function warmupItem(b) {
  const ex = EX[b.ex];
  return { exId: b.ex, ex, sets: b.sets, target: b.target, timed: ex.kind === "secs" || ex.kind === "secside" || b.ex === "walk", warmup: true, label: b.label, ramp: b.ramp };
}
function curItem() { return UI.session.items[UI.session.idx]; }
function setTarget(it, setIdx) { return it.pyramid ? it.pyramid[Math.min(setIdx, it.pyramid.length - 1)] : it.target; }

function renderPlayer() {
  const s = UI.session;
  if (!s) return;
  const it = curItem();
  const totalSets = s.items.reduce((a, i) => a + i.sets, 0);
  const doneSets = s.items.reduce((a, i) => a + (i.setLog?.filter((v) => v != null).length || 0), 0);
  const tgt = setTarget(it, s.setIdx);
  const kindLbl = it.ex.kind === "perside" ? "each side" : it.ex.kind === "secside" ? "sec each side" : it.timed ? "seconds" : "reps";
  const old = document.getElementById("player");
  const el = document.createElement("div");
  el.id = "player";
  el.innerHTML = `<div class="inner">
    <div class="row between" style="margin-bottom:12px">
      <button class="chip" data-a="quit">✕ End</button>
      <span class="micro">${s.icon} ${s.name} · ${Math.round((Date.now() - s.startTs) / 60000)} min</span>
      <button class="chip warn" data-a="sheet" data-v="hurts">Back hurts</button>
    </div>
    <div class="progress-track" style="margin-bottom:18px"><div class="fill" style="width:${(doneSets / totalSets) * 100}%"></div></div>
    <div style="flex:1">
      <div class="kicker ${it.warmup ? "muted" : ""}">${it.warmup ? "Warm-up" : `Exercise ${s.items.filter((x) => !x.warmup).indexOf(it) + 1} of ${s.items.filter((x) => !x.warmup).length}`}${it.note ? ` · ${esc(it.note)}` : ""}${it.label ? ` · ${esc(it.label)}` : ""}</div>
      <h1 class="display" style="margin:6px 0 10px">${it.ex.icon} ${it.ex.name}</h1>
      <div class="row" style="margin-bottom:14px">
        <div class="set-dots">${Array.from({ length: it.sets }, (_, i) => `<div class="sd ${it.setLog[i] != null ? "done" : i === s.setIdx ? "now" : ""}">${it.setLog[i] != null ? "✓" : i + 1}</div>`).join("")}</div>
        <span class="micro">set ${Math.min(s.setIdx + 1, it.sets)} / ${it.sets}</span>
        <div id="demo-box" class="demo-box" style="margin-left:auto"></div>
      </div>
      ${it.timed ? timedBlock(it, tgt) : repsBlock(it, tgt, kindLbl)}
      <details class="cues"><summary>Form cues</summary><ul>${it.ex.cues.map((c) => `<li>${c}</li>`).join("")}</ul></details>
      <div class="safety-note"><span class="si">🦴</span><span>${it.ex.l5}</span></div>
    </div>
    <div class="grid-2" style="margin-top:16px">
      <button class="btn ghost" data-a="skip-ex">Skip exercise</button>
      <button class="btn ghost" data-a="swap-easier">Easier version</button>
    </div>
  </div>`;
  old ? old.replaceWith(el) : document.body.appendChild(el);
  mountDemo(document.getElementById("demo-box"), it.exId, 108);
}
function repsBlock(it, tgt, kindLbl) {
  return `
    <div class="card" style="text-align:center">
      <div class="micro" style="margin-bottom:6px">TARGET · ${tgt} ${kindLbl}</div>
      <div class="stepper">
        <button data-a="step" data-v="-1">−</button>
        <span class="value num" id="rep-val">${tgt}</span>
        <button data-a="step" data-v="1">+</button>
      </div>
      <button class="btn primary big" data-a="log-set" style="margin-top:16px">Log set ✓</button>
    </div>`;
}
function timedBlock(it, tgt) {
  const isMove = it.exId === "walk";
  return `
    <div class="card" style="text-align:center">
      <div class="micro" style="margin-bottom:6px">${isMove ? "GO" : "HOLD"} · ${it.ex.kind === "secside" ? "each side · " : ""}${fmtMins(tgt)}</div>
      <div class="ring" style="margin:0 auto">
        <svg viewBox="0 0 240 240" width="240" height="240">
          <circle cx="120" cy="120" r="108" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
          <circle id="ring-arc" cx="120" cy="120" r="108" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="678.6" stroke-dashoffset="0"/>
        </svg>
        <span class="t2 num" id="timer-val">${fmtMins(tgt)}</span>
      </div>
      <div class="row" style="justify-content:center;gap:10px;margin-top:12px">
        <button class="chip" data-a="time-adj" data-v="-5">−5s</button>
        <button class="btn primary" id="timer-btn" data-a="timer-start" style="width:auto;padding:14px 34px">${isMove ? "Start" : "Start hold"}</button>
        <button class="chip" data-a="time-adj" data-v="5">+5s</button>
      </div>
    </div>`;
}

/* --- timed hold --- */
function startHold() {
  const it = curItem();
  const tgt = it._adj ?? setTarget(it, UI.session.setIdx);
  const endTs = Date.now() + tgt * 1000;
  clearInterval(UI.timer);
  const btn = document.getElementById("timer-btn");
  if (btn) { btn.textContent = "Going…"; btn.dataset.a = "timer-stop"; }
  UI.timer = setInterval(() => {
    const left = Math.max(0, Math.ceil((endTs - Date.now()) / 1000));
    const el = document.getElementById("timer-val");
    const arc = document.getElementById("ring-arc");
    if (el) el.textContent = fmtMins(left);
    if (arc) arc.style.strokeDashoffset = String(678.6 * (1 - left / tgt));
    if (left === 0) { clearInterval(UI.timer); beep(true); logSet(tgt); }
  }, 200);
}
function stopHoldEarly() {
  clearInterval(UI.timer);
  const it = curItem();
  const tgt = it._adj ?? setTarget(it, UI.session.setIdx);
  const shown = document.getElementById("timer-val")?.textContent || "0";
  const left = shown.includes(":") ? Number(shown.split(":")[0]) * 60 + Number(shown.split(":")[1]) : parseInt(shown) || 0;
  logSet(Math.max(1, tgt - left));
}

/* --- logging & rest --- */
function logSet(val) {
  const s = UI.session, it = curItem();
  if (!it.timed) {
    const v = document.getElementById("rep-val");
    val = v ? parseInt(v.textContent) || 0 : val;
  }
  it.setLog[s.setIdx] = val;
  delete it._adj;
  // advance
  const finishedItem = s.setIdx >= it.sets - 1;
  const lastItem = s.idx >= s.items.length - 1;
  if (finishedItem && lastItem) { finishSession(); return; }
  if (finishedItem) { s.idx++; s.setIdx = 0; } else { s.setIdx++; }
  // rest (skip after warm-up moves, short for spine)
  const restSec = it.warmup ? 0 : s.type === "strength" ? (it.main || it.ladder ? S.settings.restMain : S.settings.restAcc) : S.settings.restSpine;
  if (restSec > 0) startRest(restSec);
  renderPlayer();
}
function startRest(sec) {
  const endTs = Date.now() + sec * 1000;
  UI.rest = { endTs, total: sec };
  document.querySelectorAll("#rest-overlay").forEach((n) => n.remove());
  const next = curItem();
  const div = document.createElement("div");
  div.id = "rest-overlay";
  div.innerHTML = `
    <div class="kicker">Rest — you earned it</div>
    <div class="t num" id="rest-val">${fmtMins(sec)}</div>
    <p class="sub">Next: ${next.ex.icon} ${next.ex.name} · set ${UI.session.setIdx + 1}</p>
    <div class="row" style="gap:10px">
      <button class="btn ghost" data-a="rest-add" style="width:auto;padding:12px 22px">+15s</button>
      <button class="btn primary" data-a="rest-skip" style="width:auto;padding:12px 30px">Skip rest</button>
    </div>
    <button class="chip" data-a="quit" style="margin-top:6px">End session</button>`;
  document.body.appendChild(div);
  clearInterval(UI.restTimer);
  let warned = false;
  UI.restTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((UI.rest.endTs - Date.now()) / 1000));
    const el = document.getElementById("rest-val");
    if (el) { el.textContent = fmtMins(left); if (left <= 5) el.classList.add("ending"); }
    if (left === 10 && !warned) { warned = true; beep(false); }
    if (left === 0) { endRest(); beep(true); }
  }, 200);
}
function endRest() { clearInterval(UI.restTimer); UI.rest = null; document.querySelectorAll("#rest-overlay").forEach((n) => n.remove()); }

function skipExercise() {
  clearInterval(UI.timer); // a running hold must never outlive its exercise
  const s = UI.session;
  delete curItem()._adj;
  if (s.idx >= s.items.length - 1) { finishSession(); return; }
  s.idx++; s.setIdx = 0; renderPlayer();
}
function swapEasier() {
  clearInterval(UI.timer);
  const s = UI.session, it = curItem();
  delete it._adj;
  if (it.ladder) {
    const ladder = LADDERS[it.ladder];
    const curIdx = ladderRung(it.ladder)?.idx ?? 0;
    if (curIdx > 0) {
      const easier = ladder.rungs[curIdx - 1];
      it.exId = easier.ex; it.ex = EX[easier.ex];
      const win = easier.scheme.reps || easier.scheme.secs;
      it.target = win[0]; it.timed = !!easier.scheme.secs; it.ladder = null; // no progression credit on swapped item
      showToast(`Swapped to ${it.ex.name} for today`);
    } else { it.target = Math.max(1, Math.floor(it.target * 0.6)); showToast("Target reduced — quality over quantity"); }
  } else {
    it.target = Math.max(1, Math.floor((it.target || 8) * 0.6));
    showToast("Target reduced — listen to the body");
  }
  renderPlayer();
}
function quitSession() {
  clearInterval(UI.timer); endRest();
  releaseWake();
  UI.session = null;
  document.getElementById("player")?.remove();
  render();
}
function finishSession() {
  const s = UI.session;
  clearInterval(UI.timer); endRest();
  const mins = Math.max(1, Math.round((Date.now() - s.startTs) / 60000));
  const res = completeSession(s, mins);
  releaseWake();
  UI.session = null;
  document.getElementById("player")?.remove();
  // variable reward: celebrate the special moments, not every routine completion
  if (res.prList.length || res.badges.length || res.offers.some((o) => !o.locked) ||
      (S.streak.current > 0 && S.streak.current % 7 === 0) || Math.random() < 0.1) confetti();
  renderDone(s, mins, res);
}
function renderDone(s, mins, res) {
  const lvl = xpLevel();
  const div = document.createElement("div");
  div.id = "player";
  div.innerHTML = `<div class="inner">
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center">
      <div style="font-size:64px">${s.type === "strength" ? "⚒️" : s.type === "spine" ? "🧘" : "🚑"}</div>
      <h1 class="display" style="margin:10px 0 4px">${s.type === "strength" ? "Forged." : "Streak fed."}</h1>
      <p class="sub">${s.name} · ${mins} min · <b style="color:var(--accent)">+${res.xp} XP</b></p>
      <div class="card" style="text-align:left;margin-top:20px">
        <div class="row between"><span class="kicker">🔥 Streak</span><span class="num" style="font-size:28px">${S.streak.current}</span></div>
        <div class="xp-bar" style="margin-top:10px"><div class="fill" style="width:${lvl.pct}%"></div></div>
        <div class="micro" style="margin-top:4px">Lv ${lvl.lv} ${lvl.name}${lvl.next ? ` · ${S.xp - lvl.cur}/${lvl.next - lvl.cur} XP` : ""}</div>
      </div>
      ${res.prList.length ? `<div class="card accent" style="text-align:left"><div class="kicker">🏆 New PR${res.prList.length > 1 ? "s" : ""}!</div>${res.prList.map((p) => `<p style="font-weight:700;margin-top:4px">${p.ex} — ${p.timed ? fmtMins(p.val) : p.val + " reps"}</p>`).join("")}</div>` : ""}
      ${res.offers.map((o, i) => o.locked
        ? `<div class="card" style="text-align:left"><div class="kicker muted">🔒 Ladder ready — phase-locked</div><p class="sub" style="margin-top:4px"><b>${o.to}</b> unlocks in Phase ${o.needPhase}. Your body's earned it — the timeline just needs to catch up.</p></div>`
        : `<div class="card" style="text-align:left"><div class="kicker" style="color:var(--good)">📈 Ladder climb unlocked</div><p class="sub" style="margin:4px 0 10px"><b>${o.from}</b> is conquered. Ready for <b>${o.to}</b>?</p><button class="btn" data-a="ladder-up" data-v="${o.ladder}" data-i="${i}">Climb to ${o.to}</button></div>`).join("")}
      ${res.badges.map((b) => `<div class="card accent" style="text-align:left"><div class="kicker">🎖️ Badge earned</div><p style="font-weight:700;margin-top:4px">${b.icon} ${b.name}</p></div>`).join("")}
      ${S.log.length % 5 === 0 ? `<button class="btn ghost" data-a="export-data">💾 30-second habit: export a backup</button>` : ""}
    </div>
    <button class="btn primary big" data-a="done-close">Done</button>
  </div>`;
  document.body.appendChild(div);
}

/* ============================================================
   PROGRESS
   ============================================================ */
function renderProgress() {
  const lvl = xpLevel();
  const prEntries = Object.entries(S.prs).map(([ex, v]) => ({ ex: EX[ex], v })).filter((p) => p.ex).slice(-8).reverse();
  $app().innerHTML = `<div class="screen">
    <h1 class="display" style="margin-bottom:14px">Progress</h1>
    <div class="card accent">
      <div class="row between"><span class="kicker">Lv ${lvl.lv} · ${lvl.name}</span><span class="micro">${S.xp} XP</span></div>
      <div class="xp-bar" style="margin-top:10px"><div class="fill" style="width:${lvl.pct}%"></div></div>
      ${lvl.next ? `<div class="micro" style="margin-top:5px">${lvl.next - S.xp} XP to ${LEVEL_NAMES[lvl.lv + 1]}</div>` : ""}
    </div>
    ${S.log.length === 0 ? `<div class="card">
      <div class="kicker muted" style="margin-bottom:8px">Consistency</div>
      <p class="sub">Your chain starts with today's first session. Everything you log builds the picture here — the calendar, the charts, the records.</p>
      <button class="btn primary" data-a="nav" data-v="today" style="margin-top:12px">Light it up →</button>
    </div>` : `<div class="card">
      <div class="kicker muted" style="margin-bottom:10px">Consistency — don't break the chain</div>
      <div class="chart-wrap">${heatmapSVG()}</div>
      <div class="row" style="margin-top:8px;gap:14px">
        <span class="micro">■ trained</span><span class="micro">▪ spine/walk</span><span class="micro">❄️ freeze used</span>
      </div>
      <p class="micro" style="margin-top:4px">Tap a square for that day's detail.</p>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:10px">Sessions per week</div>
      <div class="chart-wrap" id="weekly-chart">${weeklyBarsSVG()}</div>
    </div>`}
    <div class="card">
      <div class="kicker muted" style="margin-bottom:10px">Ladders</div>
      ${Object.entries(LADDERS).map(([k, l]) => {
        const idx = Math.min(S.levels[k] ?? 0, l.rungs.length - 1);
        return `<button class="ex-item" data-a="sheet" data-v="ladder:${k}">
          <span class="ico">${l.icon}</span>
          <span class="meta"><span class="nm">${l.name}</span><br><span class="lv">Rung ${idx + 1}/${l.rungs.length} — ${EX[l.rungs[idx].ex].name}</span></span>
          <span class="micro">${Math.round(((idx + 1) / l.rungs.length) * 100)}%</span>
        </button>`;
      }).join("")}
    </div>
    <div class="card">
      <div class="row between" style="margin-bottom:10px"><span class="kicker muted">Bodyweight</span>
        <button class="chip accent" data-a="sheet" data-v="weight">+ log</button></div>
      ${S.weights.length >= 2 ? `<div class="chart-wrap">${weightLineSVG()}</div>` : `<p class="sub">${S.weights.length === 1 ? `Latest: <b>${S.weights[S.weights.length - 1].kg} kg</b>. Log again in a few days to see the trend.` : "Log your weight to track the road to visible abs."}</p>`}
    </div>
    ${prEntries.length ? `<div class="card"><div class="kicker muted" style="margin-bottom:8px">Personal records</div>
      ${prEntries.map((p) => `<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)"><span class="sub">${p.ex.icon} ${p.ex.name}</span><b class="num" style="font-size:18px">${p.ex.kind.includes("sec") ? fmtMins(p.v) : p.v}</b></div>`).join("")}</div>` : ""}
    <div class="card">
      <div class="kicker muted" style="margin-bottom:10px">${S.log.length === 0 ? "First badges within reach" : "Badges"}</div>
      <div class="badge-grid">${(S.log.length === 0 ? BADGES.slice(0, 3) : BADGES).map((b) => `<div class="badge ${S.badges.includes(b.id) ? "earned" : "locked"}"><span class="bico">${b.icon}</span><span class="bnm">${b.name}</span></div>`).join("")}</div>
    </div>
  </div>`;
}
function heatmapSVG() {
  const weeks = 16, cell = 13, gap = 3;
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  let html = `<svg width="${weeks * (cell + gap)}" height="${7 * (cell + gap) + 14}" style="display:block">`;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(end.getFullYear(), end.getMonth(), end.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
      if (dt > today) continue;
      const key = dkey(dt);
      const logs = sessionsOn(key);
      const strength = logs.some((l) => l.type === "strength");
      const any = logs.length > 0;
      const frozen = S.streak.frozen[key];
      const fill = strength ? "var(--chart-1)" : any ? "color-mix(in srgb, var(--chart-1) 45%, var(--surface-2))" : "var(--surface-2)";
      const x = w * (cell + gap), y = d * (cell + gap);
      const detail = esc(logs.length ? logs.map((l) => l.name).join(", ") : frozen ? "streak freeze ❄️" : "rest");
      html += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}" data-a="hm-day" data-v="${fmtDate(key)}: ${detail}" style="cursor:pointer"><title>${fmtDate(key)}: ${detail}</title></rect>`;
      if (frozen && !any) html += `<text x="${x + cell / 2}" y="${y + cell - 2.5}" font-size="9" text-anchor="middle" pointer-events="none">❄️</text>`;
    }
  }
  html += `</svg>`;
  return html;
}
function weekStart(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dkey(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - dt.getDay()));
}
function weeklyBarsSVG() {
  const weeks = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const ws = dkey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - i * 7));
    weeks.push({ ws, strength: 0, other: 0 });
  }
  for (const l of S.log) {
    const ws = weekStart(l.date);
    const w = weeks.find((x) => x.ws === ws);
    if (w) (l.type === "strength" ? w.strength++ : w.other++);
  }
  const W = 340, H = 130, pad = 6, bw = 26;
  const maxV = 2 * Math.ceil(Math.max(4, ...weeks.map((w) => w.strength + w.other)) / 2); // even axis top
  const x0 = 10;
  const step = (W - x0 - pad) / weeks.length;
  let svg = `<svg viewBox="0 0 ${W} ${H + 20}" width="100%" style="display:block;max-width:420px">`;
  for (let g = 1; g <= 2; g++) {
    const gy = H - (H - 10) * (g * (maxV / 2) / maxV);
    svg += `<line x1="${x0}" y1="${gy}" x2="${W}" y2="${gy}" stroke="var(--chart-grid)" stroke-width="1"/><text x="${x0 - 2}" y="${gy + 3}" font-size="9" fill="var(--ink-3)" text-anchor="end">${g * (maxV / 2)}</text>`;
  }
  weeks.forEach((w, i) => {
    const x = x0 + i * step + (step - bw) / 2;
    const hS = (H - 10) * (w.strength / maxV), hO = (H - 10) * (w.other / maxV);
    const label = new Date(...w.ws.split("-").map((n, j) => j === 1 ? Number(n) - 1 : Number(n))).getDate();
    if (w.other > 0) svg += `<rect x="${x}" y="${H - hO}" width="${bw}" height="${Math.max(1.5, hO - 1)}" rx="${hS > 0 ? 0 : 3}" fill="var(--chart-2)"><title>${w.other} spine/walk</title></rect>`;
    if (w.strength > 0) svg += `<rect x="${x}" y="${H - hO - hS - (w.other ? 2 : 0)}" width="${bw}" height="${Math.max(1.5, hS)}" rx="3" fill="var(--chart-1)"><title>${w.strength} strength</title></rect>`;
    svg += `<text x="${x + bw / 2}" y="${H + 13}" font-size="9" fill="var(--ink-3)" text-anchor="middle">${label}</text>`;
  });
  svg += `</svg>
  <div class="row" style="gap:14px;margin-top:6px">
    <span class="micro"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--chart-1);margin-right:4px"></span>strength</span>
    <span class="micro"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--chart-2);margin-right:4px"></span>spine & walks</span>
  </div>`;
  return svg;
}
function weightLineSVG() {
  const data = S.weights.slice(-30);
  const W = 340, H = 110, padX = 30, padY = 14;
  const vals = data.map((d) => d.kg);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const span = Math.max(1, mx - mn);
  const px = (i) => padX + (i / Math.max(1, data.length - 1)) * (W - padX - 10);
  const py = (v) => padY + (1 - (v - mn) / span) * (H - padY * 2);
  let path = data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(d.kg).toFixed(1)}`).join("");
  const last = data[data.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;max-width:420px">
    <line x1="${padX}" y1="${py(mn)}" x2="${W - 10}" y2="${py(mn)}" stroke="var(--chart-grid)"/>
    <line x1="${padX}" y1="${py(mx)}" x2="${W - 10}" y2="${py(mx)}" stroke="var(--chart-grid)"/>
    <text x="${padX - 4}" y="${py(mx) + 3}" font-size="9" fill="var(--ink-3)" text-anchor="end">${mx}</text>
    <text x="${padX - 4}" y="${py(mn) + 3}" font-size="9" fill="var(--ink-3)" text-anchor="end">${mn}</text>
    <path d="${path}" fill="none" stroke="var(--chart-2)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${px(data.length - 1)}" cy="${py(last.kg)}" r="4.5" fill="var(--chart-2)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${px(data.length - 1)}" y="${py(last.kg) - 9}" font-size="11" font-weight="700" fill="var(--ink)" text-anchor="end">${last.kg} kg</text>
  </svg>`;
}

/* ============================================================
   PLAN
   ============================================================ */
function renderPlan() {
  const ph = PHASES[S.phase - 1];
  const kg = S.weights.length ? S.weights[S.weights.length - 1].kg : null;
  $app().innerHTML = `<div class="screen">
    <h1 class="display" style="margin-bottom:14px">The Plan</h1>
    <div class="card accent">
      <div class="row between">
        <span class="kicker">Phase ${ph.n} · ${ph.name}</span>
        <span class="chip">weeks ${ph.weeks}</span>
      </div>
      <p class="sub" style="margin-top:8px">${ph.desc}</p>
      <div class="safety-note"><span class="si">🚦</span><span><b>Gate:</b> ${ph.gate}</span></div>
      <div class="grid-2" style="margin-top:12px">
        ${S.phase > 1 ? `<button class="btn ghost" data-a="phase-down">↓ Drop back</button>` : "<span></span>"}
        ${S.phase < 4 ? `<button class="btn" data-a="phase-up">↑ Advance</button>` : "<span></span>"}
      </div>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:10px">The week</div>
      <div class="stack">
        <div class="row"><span style="font-size:20px">🧘</span><div><b>Every day</b><div class="micro">Spine Reset (10 min) + build toward a 30-min walk</div></div></div>
        ${DAY_ORDER.map((d) => {
          const t = DAY_TEMPLATES[d];
          return `<button class="ex-item" data-a="sheet" data-v="daytpl:${d}"><span class="ico">${t.icon}</span><span class="meta"><span class="nm">${t.name}</span><br><span class="lv">${t.tag} · ~${t.est} min</span></span><span class="micro">›</span></button>`;
        }).join("")}
      </div>
      <p class="micro" style="margin-top:10px">Your ${S.profile.trainDays.length} training days rotate through these four sessions in order.</p>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:8px">🚦 The traffic-light rules</div>
      <div class="stack">
        <div class="row"><span class="chip good">GREEN</span><span class="sub">Feeling fine or symptoms shrinking toward the spine → train as planned, progress when targets are hit.</span></div>
        <div class="row"><span class="chip warn">YELLOW</span><span class="sub">Niggly → the app trims volume ~40% automatically. Keep moving, don't push.</span></div>
        <div class="row"><span class="chip bad">RED</span><span class="sub">Rough, or ANY symptoms running down the leg → Spine Reset + walk only. Leg symptoms are never trained through.</span></div>
      </div>
      <p class="micro" style="margin-top:10px">Judge yesterday's session by this morning's back. Worse morning = yesterday was too much.</p>
    </div>
    <div class="card" style="border-color:var(--bad)">
      <div class="kicker" style="color:var(--bad);margin-bottom:8px">⛑️ See a doctor urgently if</div>
      <ul style="margin-left:18px;font-size:14px;color:var(--ink-2);display:flex;flex-direction:column;gap:5px">${RED_FLAGS.map((r) => `<li>${r}</li>`).join("")}</ul>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:8px">🍽️ The abs equation</div>
      ${kg ? `
        <p class="sub">At <b>${kg} kg</b>, your daily targets while cutting:</p>
        <div class="grid-2" style="margin:10px 0">
          <div class="card" style="margin:0;text-align:center"><div class="num" style="font-size:28px">${Math.round(kg * 1.8)}–${Math.round(kg * 2.2)}g</div><div class="micro">protein / day</div></div>
          <div class="card" style="margin:0;text-align:center"><div class="num" style="font-size:28px">300–500</div><div class="micro">kcal deficit / day</div></div>
        </div>
        <p class="sub">Aim to lose <b>${(kg * 0.005).toFixed(1)}–${(kg * 0.01).toFixed(1)} kg/week</b> — faster costs you strength. Abs show for most men around 10–14% body fat. Weigh daily, judge by the weekly average.</p>`
      : `<p class="sub">Visible abs = anti-core strength (you're building it) + body-fat around 10–14%. That second part is diet: a 300–500 kcal daily deficit, ~2g protein per kg bodyweight. Log a weight in Progress and I'll do the maths for you.</p>`}
      <p class="micro" style="margin-top:8px">Diet break at maintenance every 6–8 weeks. If pull-up numbers drop two weeks running, eat a bit more.</p>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:8px">🦴 Why this plan is shaped this way</div>
      <p class="sub">Disc issues at L5 are aggravated by one thing above all: <b>bending the lower spine under load</b>, especially with rotation, especially in the morning. So: every exercise here keeps the spine neutral and moves through the hips. Core work is <i>anti</i>-movement (planks, bird dogs, carries) — which is also exactly how you build a six-pack that shows. Pull-ups gently decompress. Walking is medicine. The McGill Big 3 is your daily armour. Strong and safe aren't in tension — done right, they're the same program.</p>
      <p class="micro" style="margin-top:8px">Educational tool, not medical advice. If symptoms persist or worsen over 6 weeks, get assessed by a physio.</p>
    </div>
  </div>`;
}

/* ============================================================
   LIBRARY
   ============================================================ */
const PATTERN_NAMES = { spine: "Spine", vpull: "Pull", hpull: "Row", dip: "Dip", push: "Push", vpush: "Handstand", vkr: "Knee raise", lsit: "L-sit", core: "Core", squat: "Squat", hinge: "Hinge" };
function libListHTML() {
  const q = UI.libQ.toLowerCase();
  const entries = Object.entries(EX).filter(([id, e]) =>
    (!UI.libFilter || e.pattern === UI.libFilter) && (!q || e.name.toLowerCase().includes(q)));
  return entries.map(([id, e]) => `<button class="ex-item" data-a="sheet" data-v="ex:${id}">
      <span class="ico">${e.icon}</span>
      <span class="meta"><span class="nm">${e.name}</span><br><span class="lv">${PATTERN_NAMES[e.pattern] || e.pattern}${e.phase > S.phase ? ` · 🔒 phase ${e.phase}` : ""}</span></span>
      ${S.prs[id] ? `<span class="chip">${e.kind.includes("sec") ? fmtMins(S.prs[id]) : S.prs[id] + "×"}</span>` : ""}
    </button>`).join("") || `<p class="sub" style="padding:16px 0">Nothing matches.</p>`;
}
function renderLibrary() {
  $app().innerHTML = `<div class="screen">
    <h1 class="display" style="margin-bottom:14px">Moves</h1>
    <input type="text" id="lib-q" placeholder="Search…" value="${esc(UI.libQ)}" style="margin-bottom:10px">
    <div class="chart-wrap" style="margin-bottom:12px"><div class="row" style="gap:6px;width:max-content">
      <button class="chip ${!UI.libFilter ? "accent" : ""}" data-a="lib-filter" data-v="">All</button>
      ${Object.entries(PATTERN_NAMES).map(([k, n]) => `<button class="chip ${UI.libFilter === k ? "accent" : ""}" data-a="lib-filter" data-v="${k}">${n}</button>`).join("")}
    </div></div>
    <div class="card flush" style="padding:0 16px" id="lib-list">${libListHTML()}</div>
  </div>`;
}

/* ============================================================
   SETTINGS
   ============================================================ */
function renderSettings() {
  const p = S.profile;
  $app().innerHTML = `<div class="screen">
    <h1 class="display" style="margin-bottom:14px">Setup</h1>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:10px">📅 Schedule</div>
      <div class="field"><span class="lbl">Training days</span>
        <div class="day-picker">${DAYS.map((d, i) => `<button data-a="set-day" data-i="${i}" class="${p.trainDays.includes(i) ? "on" : ""}">${d}</button>`).join("")}</div></div>
      <label class="field"><span class="lbl">Time</span><input type="time" id="set-time" value="${esc(p.time)}"></label>
      ${p.time < "08:00" ? `<div class="safety-note"><span class="si">☀️</span><span>That's early. Train 2–3h after waking — discs are most vulnerable in the first hour up.</span></div>` : ""}
      <label class="field"><span class="lbl">Habit anchor</span><input type="text" id="set-anchor" value="${esc(p.anchor || "")}" placeholder="right after…"></label>
    </div>
    <div class="card accent">
      <div class="kicker" style="margin-bottom:8px">📱 iPhone reminders & alarms</div>
      <p class="sub" style="margin-bottom:10px">These download calendar files. Open the file after downloading (tap ⬇︎ in Safari, then the file) and hit <b>Add All</b> — you'll get real iPhone notifications.</p>
      <div class="field"><span class="lbl">Alert before session</span>
        <div class="seg">${[0, 15, 30, 60].map((m) => `<button data-a="set-alert" data-v="${m}" class="${S.settings.alertMin === m ? "active" : ""}">${m === 0 ? "On time" : m + " min"}</button>`).join("")}</div></div>
      <button class="btn" data-a="ics-schedule">🔥 Training days → Calendar (12 weeks)</button>
      <button class="btn" data-a="ics-spine" style="margin-top:10px">🧘 Daily Spine Reset → Calendar</button>
      <button class="btn ghost" data-a="sheet" data-v="guide" style="margin-top:10px">Full iPhone setup guide</button>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:6px">⏱️ In-workout</div>
      <div class="toggle-row"><span class="sub">Timer sounds</span><label class="switch"><input type="checkbox" id="set-sound" ${S.settings.sound ? "checked" : ""}><span class="track"></span><span class="thumb"></span></label></div>
      <div class="field" style="margin-top:10px"><span class="lbl">Rest after main lifts</span>
        <div class="seg">${[90, 120, 150, 180].map((s) => `<button data-a="set-rest" data-v="${s}" class="${S.settings.restMain === s ? "active" : ""}">${s}s</button>`).join("")}</div></div>
      <div class="field"><span class="lbl">Theme</span>
        <div class="seg">${["auto", "dark", "light"].map((th) => `<button data-a="set-theme" data-v="${th}" class="${S.settings.theme === th ? "active" : ""}">${th}</button>`).join("")}</div></div>
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:8px">💾 Backup</div>
      <p class="sub" style="margin-bottom:10px">Your data lives only on this device. Export regularly — especially if you might not open the app for a week+.</p>
      <div class="grid-2">
        <button class="btn" data-a="export-data">Export</button>
        <button class="btn" data-a="sheet" data-v="import">Import</button>
      </div>
      ${RESCUE_RAW ? `<button class="btn ghost" data-a="rescue-dump" style="margin-top:10px">🚨 Show unreadable old data (rescue)</button>
      <button class="btn ghost" data-a="rescue-dismiss" style="margin-top:8px">Dismiss old data</button>` : ""}
    </div>
    <div class="card">
      <div class="kicker muted" style="margin-bottom:8px">☢️ Danger zone</div>
      <button class="btn danger" data-a="reset-all">Reset everything</button>
    </div>
    <p class="micro" style="text-align:center;margin-top:6px">FORGE · built for Haris · not medical advice · see a professional for persistent symptoms</p>
  </div>`;
}

/* ============================================================
   SHEETS
   ============================================================ */
function renderSheet() {
  document.querySelector(".sheet-backdrop")?.remove();
  if (!UI.sheet) return;
  const [kind, arg] = UI.sheet.split(":");
  let body = "";
  if (kind === "ex") {
    const e = EX[arg];
    const inLadder = Object.entries(LADDERS).find(([k, l]) => l.rungs.some((r) => r.ex === arg));
    body = `<h2 class="display">${e.icon} ${e.name}</h2>
      <div class="row" style="margin:8px 0"><span class="chip">${PATTERN_NAMES[e.pattern] || e.pattern}</span><span class="chip ${e.phase <= S.phase ? "good" : "warn"}">Phase ${e.phase}+</span>${S.prs[arg] ? `<span class="chip accent">PR ${e.kind.includes("sec") ? fmtMins(S.prs[arg]) : S.prs[arg] + " reps"}</span>` : ""}</div>
      <div id="demo-box-sheet" class="demo-box" style="display:flex;justify-content:center;margin:12px 0;background:var(--surface-2);border-radius:var(--radius-sm);padding:8px 0"></div>
      <div class="kicker muted" style="margin:12px 0 6px">Form</div>
      <ul style="margin-left:18px;font-size:14px;color:var(--ink-2);display:flex;flex-direction:column;gap:6px">${e.cues.map((c) => `<li>${c}</li>`).join("")}</ul>
      <div class="safety-note"><span class="si">🦴</span><span>${e.l5}</span></div>
      ${inLadder ? `<button class="btn ghost" data-a="sheet" data-v="ladder:${inLadder[0]}" style="margin-top:12px">View the ${inLadder[1].name} ladder</button>` : ""}`;
  } else if (kind === "ladder") {
    const l = LADDERS[arg];
    const idx = Math.min(S.levels[arg] ?? 0, l.rungs.length - 1);
    body = `<h2 class="display">${l.icon} ${l.name} ladder</h2>
      <div class="ladder" style="margin-top:14px">
        ${l.rungs.map((r, i) => `<div class="rung ${i < idx ? "done" : i === idx ? "now" : ""}">
          <div class="nm">${EX[r.ex].icon} ${EX[r.ex].name}${EX[r.ex].phase > S.phase ? " 🔒" : ""}</div>
          <div class="crit">${i === idx ? "→ " : ""}Climb when: ${r.crit}${EX[r.ex].phase > S.phase ? ` · unlocks Phase ${EX[r.ex].phase}` : ""}</div>
        </div>`).join("")}
      </div>
      ${idx > 0 ? `<button class="btn ghost" data-a="ladder-down" data-v="${arg}" style="margin-top:12px">↓ Drop a rung (too hard right now)</button>` : ""}`;
  } else if (kind === "daytpl") {
    const t = DAY_TEMPLATES[arg];
    body = `<h2 class="display">${t.icon} ${t.name}</h2><p class="sub" style="margin:6px 0 12px">${t.tag} · ~${t.est} min · always preceded by the warm-up flow</p>
      ${t.blocks.map((b) => {
        if (b.ladder) { const { rung } = ladderRung(b.ladder); return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="ico" style="font-size:20px">${EX[rung.ex].icon}</span><div><b>${EX[rung.ex].name}</b><div class="micro">${LADDERS[b.ladder].name} ladder · ${b.sets ?? rung.scheme.sets} sets${b.note ? " · " + b.note : ""}</div></div></div>`; }
        const e = EX[b.ex];
        return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="ico" style="font-size:20px">${e.icon}</span><div><b>${e.name}</b><div class="micro">${b.sets} × ${b.target}${e.kind.includes("sec") ? "s" : ""}${b.note ? " · " + b.note : ""}${b.phaseMin && S.phase < b.phaseMin ? ` · 🔒 phase ${b.phaseMin}` : ""}</div></div></div>`;
      }).join("")}`;
  } else if (kind === "guide") {
    body = `<h2 class="display">📱 iPhone setup</h2>
      <div class="kicker muted" style="margin:14px 0 6px">1 · Real reminders with alarms (do this in Safari first)</div>
      <p class="sub">FORGE has no server, so it can't send push notifications — the reliable route is <b>Calendar events with alerts</b>. In Setup, tap the Calendar buttons, open the downloaded file (⬇︎ icon in Safari → tap the file), then tap <b>Add All</b>. Every training day now fires a real iPhone notification. <i>Re-exporting after a schedule change? Delete the old FORGE events in Calendar first — each export adds fresh ones.</i></p>
      <div class="kicker muted" style="margin:14px 0 6px">2 · Put FORGE on your home screen</div>
      <p class="sub">In Safari: <b>Share → Add to Home Screen</b>. You get an app icon, full-screen mode, and iOS stops auto-deleting your saved data after a week of not visiting. <b>One catch:</b> the home-screen app starts with its own separate storage. So: <b>Export a backup first</b> (Setup → Backup), then open the new icon and <b>Import</b> it. Two minutes, once.</p>
      <div class="kicker muted" style="margin:14px 0 6px">3 · Want a proper ALARM-alarm?</div>
      <p class="sub">Ask Siri once: <i>“Set a repeating alarm at ${esc(S.profile?.time || "18:00")} on weekdays called Forge.”</i> Clock-app alarms break through silent mode.</p>
      <div class="kicker muted" style="margin:14px 0 6px">4 · During workouts</div>
      <p class="sub">Keep the screen on — iOS pauses web timers when it locks. FORGE asks the phone to keep the screen awake, but on some iOS versions that silently fails in home-screen apps.</p>
      <div class="kicker muted" style="margin:14px 0 6px">5 · Keep your data safe</div>
      <p class="sub">Everything lives on your phone only. Export a backup after milestones (Setup → Backup → Export). Ten seconds, total peace of mind.</p>
      <button class="btn primary" data-a="guide-done" style="margin-top:14px">Got it</button>`;
  } else if (kind === "streak") {
    body = `<h2 class="display">❄️ Streak insurance</h2>
      <p class="sub" style="margin:12px 0">Your streak is protected three ways — so one bad day never erases your work:</p>
      <div class="stack">
        <div class="row"><span style="font-size:22px">❄️</span><span class="sub"><b>Freezes.</b> You bank 1 for every 7 active days (max 2). Miss a day and one is spent automatically — you'll see a ❄️ on the calendar.</span></div>
        <div class="row"><span style="font-size:22px">🔧</span><span class="sub"><b>Repair.</b> Slipped without a freeze? Finish anything within a day or two and the chain re-links (once a fortnight).</span></div>
        <div class="row"><span style="font-size:22px">🚑</span><span class="sub"><b>Rescue.</b> The 5-minute circuit fully counts. Showing up IS the metric.</span></div>
      </div>
      <p class="micro" style="margin-top:12px">You have ${S.streak.freezes} freeze${S.streak.freezes === 1 ? "" : "s"} banked. Best streak so far: ${S.streak.best}.</p>`;
  } else if (kind === "anchor") {
    body = `<h2 class="display">📌 Tie it to a habit</h2>
      <p class="sub" style="margin:10px 0 12px">People who decide <i>when and after what</i> they'll train show up far more often — it's the best-evidenced trick in behaviour science. Finish the sentence:</p>
      <label class="field"><span class="lbl">Right after…</span><input type="text" id="anchor-in" placeholder="my evening tea / dinner / brushing my teeth" value="${esc(S.profile?.anchor || "")}"></label>
      <button class="btn primary" data-a="anchor-save">Set the cue</button>`;
  } else if (kind === "paincheck") {
    body = `<h2 class="display">Quick back check-in first</h2>
      <p class="sub" style="margin:10px 0 14px">30 seconds of honesty = the right workout for today.</p>
      <div class="pain-picker">
        ${Object.entries(painChip).map(([k, v]) => `<button data-a="pain-then-start" data-v="${k}"><span>${v[0]}</span>${v[1]}</button>`).join("")}
      </div>
      <p class="micro" style="margin-top:12px">🟡 trims the volume ~40% · 🔴 swaps to the gentle Spine Reset.</p>`;
  } else if (kind === "quitconfirm") {
    body = `<h2 class="display">Stop here?</h2>
      <p class="sub" style="margin:10px 0 14px">Nothing's logged yet — but the 5-minute Rescue still counts for the streak. Bad days are what it's for.</p>
      <div class="stack">
        <button class="btn primary" data-a="sheet-close">Keep going</button>
        <button class="btn" data-a="quit-rescue">🚑 Switch to the 5-min Rescue</button>
        <button class="btn ghost" data-a="quit-anyway">Stop anyway</button>
      </div>`;
  } else if (kind === "copyout") {
    body = UI.copyBody || "";
  } else if (kind === "confirm") {
    const c = UI.confirmCfg || {};
    body = `<h2 class="display">${c.title || "Sure?"}</h2>
      <p class="sub" style="margin:10px 0 14px">${c.body || ""}</p>
      <div class="stack">
        <button class="btn ${c.danger ? "danger" : "primary"}" data-a="confirm-yes">${c.yes || "Yes"}</button>
        <button class="btn ghost" data-a="sheet-close">${c.no || "Cancel"}</button>
      </div>`;
  } else if (kind === "legstop") {
    body = `<h2 class="display" style="color:var(--bad)">Right call. We stop.</h2>
      <p class="sub" style="margin:10px 0 12px">Leg symptoms mean no strength work today — that rule is what gets you strong long-term. Your logged sets are saved.</p>
      <ul style="margin-left:18px;font-size:14px;color:var(--ink-2);display:flex;flex-direction:column;gap:6px">
        <li>Do the gentle Spine Reset later if it feels OK</li>
        <li>Take a short, easy walk</li>
        <li>Judge today by how tomorrow morning feels</li>
      </ul>
      <div class="safety-note" style="background:var(--bad-soft)"><span class="si">⛑️</span><span>Same-day doctor if: groin numbness, bladder/bowel changes, or leg weakness.</span></div>
      <button class="btn primary" data-a="legstop-done" style="margin-top:14px">End session safely</button>`;
  } else if (kind === "whatis") {
    body = `<h2 class="display">The two daily tools</h2>
      <div class="kicker muted" style="margin:14px 0 6px">🧘 Spine Reset · ~10 min</div>
      <p class="sub">Your daily physio routine — the McGill Big 3 (curl-up, side plank, bird dog) plus cat-camels and an optional dead hang. It builds endurance in the muscles that hold your spine neutral, which is the rehab AND the injury-proofing. It's deliberately gentle: it belongs on rest days, rough days, every day. It's also your streak anchor — doing it counts.</p>
      <div class="kicker muted" style="margin:14px 0 6px">🚑 5-Min Rescue · ~5 min</div>
      <p class="sub">The bare-minimum circuit for days when life wins: a few cat-camels, bird dogs, easy push-ups, comfortable squats, a short hang. It exists because the research is clear — what kills progress isn't small workouts, it's zero-days becoming the habit. It fully counts for your streak. No guilt, ever.</p>`;
  } else if (kind === "weight") {
    body = `<h2 class="display">Log bodyweight</h2>
      <label class="field" style="margin-top:12px"><span class="lbl">Today's weight (kg)</span><input type="number" id="w-kg" inputmode="decimal" placeholder="${S.weights.length ? S.weights[S.weights.length - 1].kg : "e.g. 78"}"></label>
      <button class="btn primary" data-a="weight-save">Save</button>`;
  } else if (kind === "import") {
    body = `<h2 class="display">Import backup</h2>
      <p class="sub" style="margin:8px 0 12px">Paste the contents of a <code>forge-backup-*.json</code> file. <b>This replaces current data.</b></p>
      <textarea id="import-text" rows="6" placeholder='{"v":1,…}'></textarea>
      <button class="btn primary" data-a="import-go" style="margin-top:12px">Import</button>`;
  } else if (kind === "hurts") {
    body = `<h2 class="display">Back talking to you?</h2>
      <p class="sub" style="margin:8px 0 14px">Good call checking in. What's happening?</p>
      <div class="stack">
        <button class="btn" data-a="hurts-mild" style="text-transform:none;letter-spacing:0;font-family:var(--font-body);font-size:15px">Mild, just in the back (≤3/10)</button>
        <button class="btn" data-a="hurts-skip" style="text-transform:none;letter-spacing:0;font-family:var(--font-body);font-size:15px">This exercise doesn't feel right</button>
        <button class="btn danger" data-a="hurts-leg" style="text-transform:none;letter-spacing:0;font-family:var(--font-body);font-size:15px">Pain / tingling going into a leg</button>
        <button class="btn ghost" data-a="sheet-close">False alarm — carry on</button>
      </div>
      <p class="micro" style="margin-top:12px">Rule of thumb: back-only soreness that fades between sets is usually OK to work around. Anything into the leg = we stop. No exceptions, no ego.</p>`;
  } else if (kind === "walk") {
    body = `<h2 class="display">🚶 Log a walk</h2>
      <label class="field" style="margin-top:12px"><span class="lbl">Minutes</span>
        <div class="seg">${[10, 15, 20, 30, 45].map((m) => `<button data-a="walk-save" data-v="${m}">${m}</button>`).join("")}</div></label>
      <p class="micro">Walking is the best-evidenced daily medicine for your back. Every bout counts.</p>`;
  } else if (kind === "level") {
    const lvl = xpLevel();
    body = `<h2 class="display">Lv ${lvl.lv} · ${lvl.name}</h2>
      <div class="xp-bar" style="margin:14px 0 6px"><div class="fill" style="width:${lvl.pct}%"></div></div>
      <p class="micro">${S.xp} XP total${lvl.next ? ` · ${lvl.next - S.xp} to ${LEVEL_NAMES[lvl.lv + 1]}` : " · max level!"}</p>
      <p class="sub" style="margin-top:12px">XP comes from showing up: sets, sessions, PRs. It never gates anything — it's just the story of your consistency adding up.</p>`;
  }
  const bd = document.createElement("div");
  bd.className = "sheet-backdrop";
  bd.innerHTML = `<div class="sheet"><div class="row between" style="margin-bottom:4px"><div class="grab" style="margin:4px auto"></div><button class="sheet-x" data-a="sheet-close">✕</button></div>${body}</div>`;
  bd.addEventListener("click", (e) => { if (e.target === bd) { UI.sheet = null; bd.remove(); } });
  document.body.appendChild(bd);
  if (kind === "ex") mountDemo(document.getElementById("demo-box-sheet"), arg, 200);
}
/* In-app confirm — native confirm()/alert() are silently blocked in sandboxed
   iframes (the claude.ai artifact), so every confirmation goes through a sheet. */
function askConfirm(cfg) {
  UI.confirmCfg = cfg;
  UI.pendingConfirm = cfg.onYes || null;
  UI.sheet = "confirm";
  renderSheet();
}

/* Copy-based fallback for contexts where downloads don't work (home-screen app, artifact) */
function openCopySheet(name, content, label) {
  UI.copyBody = `<h2 class="display">${esc(label || "Your file")}</h2>
    <p class="sub" style="margin:10px 0 12px">Downloads don't work in this mode. Copy the text below and paste it into Notes/Files as <b>${esc(name)}</b>${name.endsWith(".ics") ? " — then open that file to add the events to Calendar. (Or open FORGE in Safari, where one-tap download works.)" : "."}</p>
    <textarea rows="7" readonly id="copy-src">${esc(content)}</textarea>
    <button class="btn primary" data-a="copy-text" style="margin-top:12px">Copy to clipboard</button>`;
  UI.sheet = "copyout";
  renderSheet();
}

/* ============================================================
   RENDER ROOT + NAV
   ============================================================ */
function renderNav() {
  document.getElementById("nav")?.remove();
  const nav = document.createElement("div");
  nav.id = "nav";
  nav.innerHTML = `<div class="inner">${NAV.map((n) => `<button data-a="nav" data-v="${n.id}" class="${UI.screen === n.id ? "active" : ""}"><span class="ico">${n.ico}</span>${n.label}</button>`).join("")}</div>`;
  document.body.appendChild(nav);
}
function render() {
  applyTheme();
  if (!S.profile) { renderOnboard(); return; }
  recomputeStreak();
  ({ today: renderToday, progress: renderProgress, plan: renderPlan, library: renderLibrary, settings: renderSettings }[UI.screen] || renderToday)();
  renderNav();
}
function applyTheme() {
  const t = S.settings.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  // keep browser chrome color in sync when a theme is forced (no-op in the artifact)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (t === "auto") m.content = m.media && m.media.includes("light") ? "#f6f1ea" : "#131110";
    else m.content = t === "light" ? "#f6f1ea" : "#131110";
  });
}

/* ============================================================
   ACTIONS (event delegation)
   ============================================================ */
const ACTIONS = {
  "nav": (el) => { UI.screen = el.dataset.v; UI.sheet = null; render(); },
  "sheet": (el) => { UI.sheet = el.dataset.v; renderSheet(); },
  /* onboarding */
  "ob-next": () => { UI.onboard++; renderOnboard(); },
  "ob-prev": () => { UI.onboard = Math.max(0, UI.onboard - 1); renderOnboard(); },
  "ob-redflag": () => { UI.ob.rf = true; renderOnboard(); },
  "ob-rf-back": () => { UI.ob.rf = false; renderOnboard(); },
  "ob-back": (el) => { const v = Number(el.dataset.v); UI.ob.phase = v === 1 ? 1 : 2; UI.ob.backState = v; UI.onboard++; renderOnboard(); },
  "ob-legs": (el) => {
    UI.ob.legs = el.dataset.v === "yes";
    if (UI.ob.legs && UI.ob.backState === 1) UI.ob.phase = 1;
    UI.onboard++; renderOnboard();
    if (UI.ob.legs) {
      UI.confirmCfg = { title: "Noted — one golden rule", yes: "Understood",
        body: "Symptoms moving DOWN the leg = stop that exercise, even if the back itself feels fine. Symptoms retreating toward the spine as you move = usually a good sign. The app will remind you, every time it matters." };
      UI.pendingConfirm = null; UI.sheet = "confirm"; renderSheet();
    }
  },
  "ob-seg": (el) => { UI.ob[el.dataset.seg] = Number(el.dataset.i); renderOnboard(); },
  "ob-day": (el) => {
    const i = Number(el.dataset.i);
    UI.ob.days = UI.ob.days || [1, 2, 4, 5];
    UI.ob.days = UI.ob.days.includes(i) ? UI.ob.days.filter((d) => d !== i) : [...UI.ob.days, i].sort();
    renderOnboard();
  },
  "ob-schedule-next": () => {
    UI.ob.time = document.getElementById("ob-time").value || "18:00";
    UI.ob.anchor = document.getElementById("ob-anchor").value.trim();
    if (!(UI.ob.days || [1, 2, 4, 5]).length) { showToast("Pick at least one day"); return; }
    UI.onboard++; renderOnboard();
  },
  "ob-body-next": () => { UI.ob.kg = parseFloat(document.getElementById("ob-kg").value) || null; UI.onboard++; renderOnboard(); },
  "ob-body-skip": () => { UI.ob.kg = null; UI.onboard++; renderOnboard(); },
  "ob-finish": () => {
    const map = { vpull: [0, 3, 5, 6], dip: [0, 2, 3, 4], push: [0, 1, 2, 3] };
    S.levels.vpull = map.vpull[UI.ob.vpull ?? 0];
    S.levels.dip = map.dip[UI.ob.dip ?? 0];
    S.levels.push = map.push[UI.ob.push ?? 0];
    S.phase = UI.ob.phase || 2;
    if (S.phase === 1) { S.levels.vpull = Math.min(S.levels.vpull, 0); S.levels.dip = 0; }
    S.profile = { trainDays: UI.ob.days || [1, 2, 4, 5], time: UI.ob.time || "18:00", anchor: UI.ob.anchor || "", legs: !!UI.ob.legs, created: todayKey() };
    if (UI.ob.kg) S.weights.push({ date: todayKey(), kg: UI.ob.kg });
    save(); render();
  },
  /* today */
  "pain": (el) => { setPain(el.dataset.v); render(); },
  "pain-reset": () => { delete S.pain[todayKey()]; save(); render(); },
  "start-strength": () => {
    if (!painToday()) { UI.sheet = "paincheck"; renderSheet(); return; } // never assume green
    const h = new Date().getHours();
    if (h < 8 && !UI.morningOK) {
      askConfirm({
        title: "Early bird check", danger: false,
        body: "Have you been up for at least an hour? Discs are extra vulnerable right after waking — if you just got up, do the walk first and train later.",
        yes: "Been up a while — let's go", no: "Good point, later",
        onYes: () => { UI.morningOK = true; startSession("strength"); },
      });
      return;
    }
    startSession("strength");
  },
  "pain-then-start": (el) => {
    setPain(el.dataset.v);
    UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove();
    ACTIONS["start-strength"]();
  },
  "start-spine": () => startSession("spine"),
  "start-rescue": () => startSession("rescue"),
  "log-walk": () => { UI.sheet = "walk"; renderSheet(); },
  "walk-save": (el) => {
    const mins = Number(el.dataset.v);
    tryRepair();
    S.xp += XP_RULES.walk;
    S.log.push({ id: uid(), date: todayKey(), ts: Date.now(), type: "walk", name: `${mins}-min walk`, mins, sets: [], xp: XP_RULES.walk });
    recomputeStreak(); checkBadges(); save();
    UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove();
    showToast(`🚶 +${XP_RULES.walk} XP — walking is back medicine`);
    render();
  },
  /* player */
  "step": (el) => { const v = document.getElementById("rep-val"); if (v) v.textContent = Math.max(0, (parseInt(v.textContent) || 0) + Number(el.dataset.v)); },
  "log-set": () => logSet(),
  "timer-start": () => startHold(),
  "timer-stop": () => stopHoldEarly(),
  "time-adj": (el) => {
    const it = curItem();
    it._adj = Math.max(5, (it._adj ?? setTarget(it, UI.session.setIdx)) + Number(el.dataset.v));
    const tv = document.getElementById("timer-val"); if (tv) tv.textContent = fmtMins(it._adj);
  },
  "rest-add": () => { if (UI.rest) UI.rest.endTs += 15000; },
  "rest-skip": () => endRest(),
  "skip-ex": () => skipExercise(),
  "swap-easier": () => swapEasier(),
  "quit": () => {
    if (!UI.session) return;
    const hasMain = UI.session.items.some((i) => !i.warmup && i.setLog?.some((v) => v != null));
    if (hasMain) {
      askConfirm({ title: "End here?", body: "Everything you've logged is saved and counts. Stopping early beats not starting — every time.",
        yes: "Save & end", no: "Keep going", onYes: () => finishSession() });
    } else { UI.sheet = "quitconfirm"; renderSheet(); }
  },
  "quit-rescue": () => {
    UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove();
    quitSession(); startSession("rescue");
  },
  "quit-anyway": () => {
    UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove();
    quitSession(); showToast("No worries. The chain's still yours today. 🧡");
  },
  "sheet-close": () => { UI.sheet = null; UI.pendingConfirm = null; document.querySelector(".sheet-backdrop")?.remove(); },
  "confirm-yes": () => {
    const fn = UI.pendingConfirm;
    UI.pendingConfirm = null; UI.sheet = null;
    document.querySelector(".sheet-backdrop")?.remove();
    if (fn) fn();
  },
  "whatis": () => { UI.sheet = "whatis"; renderSheet(); },
  "anchor-save": () => {
    const v = document.getElementById("anchor-in")?.value.trim() || "";
    S.profile.anchor = v; save();
    UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove();
    if (v) showToast("📌 Anchored. Cue set.");
    render();
  },
  "done-close": () => { document.getElementById("player")?.remove(); render(); },
  "ladder-up": (el) => { ladderUp(el.dataset.v); el.closest(".card").innerHTML = `<div class="kicker" style="color:var(--good)">⚡ Climbed. New challenge loads next session.</div>`; },
  "ladder-down": (el) => { const k = el.dataset.v; S.levels[k] = Math.max(0, (S.levels[k] ?? 0) - 1); save(); showToast("Dropped a rung — smart training"); UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); render(); },
  /* hurts flow */
  "hurts-mild": () => { UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); setPain("yellow"); showToast("Logged. Ease the range, keep it smooth."); },
  "hurts-skip": () => { UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); swapEasier(); },
  "hurts-leg": () => {
    setPain("red");
    UI.sheet = "legstop"; renderSheet();
  },
  "legstop-done": () => {
    UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove();
    if (!UI.session) { render(); return; }
    if (UI.session.items.some((i) => !i.warmup && i.setLog?.some((v) => v != null))) finishSession(); else quitSession();
  },
  /* phase */
  "phase-up": () => {
    const ph = PHASES[S.phase - 1];
    askConfirm({ title: `Advance to Phase ${S.phase + 1}?`,
      body: `Gate check — be honest with yourself:<br><br><b>${ph.gate}</b><br><br>Only advance if that's true. The phase will still be here next week.`,
      yes: "That's me — advance", no: "Not yet",
      onYes: () => { S.phase++; checkBadges(); save(); render(); showToast(`Welcome to Phase ${S.phase} 🔓`); } });
  },
  "phase-down": () => {
    askConfirm({ title: "Drop back a phase?", body: "Smart move during a flare — zero shame in it. Your rung levels are kept; harder exercises just wait until you're ready again.",
      yes: "Drop back", onYes: () => { S.phase--; save(); render(); showToast("Phase adjusted. The ladder isn't going anywhere."); } });
  },
  /* settings */
  "set-day": (el) => {
    const i = Number(el.dataset.i);
    const d = S.profile.trainDays;
    S.profile.trainDays = d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort();
    if (!S.profile.trainDays.length) S.profile.trainDays = [i];
    save(); renderSettings();
  },
  "set-alert": (el) => { S.settings.alertMin = Number(el.dataset.v); save(); renderSettings(); },
  "set-rest": (el) => { S.settings.restMain = Number(el.dataset.v); save(); renderSettings(); },
  "set-theme": (el) => { S.settings.theme = el.dataset.v; save(); applyTheme(); renderSettings(); },
  "ics-schedule": async () => {
    S.profile.time = document.getElementById("set-time")?.value || S.profile.time;
    S.profile.anchor = document.getElementById("set-anchor")?.value ?? S.profile.anchor;
    save();
    const r = await deliverFile("forge-training.ics", buildScheduleICS(), "text/calendar;charset=utf-8", "Training calendar");
    if (r === "downloaded") showToast("Downloaded! Open the file → Add All");
    else if (r === "shared") showToast("Shared — open it in Calendar → Add All");
  },
  "ics-spine": async () => {
    const r = await deliverFile("forge-spine-reset.ics", buildSpineICS(S.profile.time), "text/calendar;charset=utf-8", "Spine Reset calendar");
    if (r === "downloaded") showToast("Downloaded! Open the file → Add All");
    else if (r === "shared") showToast("Shared — open it in Calendar → Add All");
  },
  "guide-done": () => { S.seenGuide = true; save(); UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); render(); },
  "export-data": async () => {
    const r = await exportData();
    if (r === "downloaded") showToast("Backup downloaded 💾");
    else if (r === "shared") showToast("Backup shared — save it somewhere safe 💾");
  },
  "copy-text": () => {
    const src = document.getElementById("copy-src");
    if (!src) return;
    src.select();
    const done = () => showToast("Copied ✓");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(src.value).then(done, () => { document.execCommand("copy"); done(); });
    else { document.execCommand("copy"); done(); }
  },
  "import-go": () => {
    try { importData(document.getElementById("import-text").value); UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); render(); showToast("Imported ✓ Welcome back"); }
    catch (e) { showToast("That doesn't look like a FORGE backup"); }
  },
  "rescue-dump": () => { openCopySheet("forge-rescued-data.json", RESCUE_RAW || "", "Rescued data"); },
  "rescue-dismiss": () => { RESCUE_RAW = null; UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); render(); showToast("Old data dismissed"); },
  "reset-all": () => {
    askConfirm({ title: "Wipe everything?", danger: true,
      body: "All history, streaks, levels and settings on this device. Export a backup first if there's any doubt.",
      yes: "Continue to final check", no: "Keep my data",
      onYes: () => askConfirm({ title: "Really sure?", danger: true,
        body: "This can't be undone. Last chance.",
        yes: "Yes — wipe it all", no: "Cancel",
        onYes: () => { localStorage.removeItem(STORE_KEY); S = defaultState(); UI.screen = "today"; UI.onboard = 0; UI.ob = {}; render(); } }) });
  },
  "lib-filter": (el) => { UI.libFilter = el.dataset.v; renderLibrary(); },
  "hm-day": (el) => { showToast(el.dataset.v || el.getAttribute("data-v") || ""); },
  "weight-save": () => {
    const kg = parseFloat(document.getElementById("w-kg").value);
    if (!kg || kg < 25 || kg > 350) { showToast("Enter a weight in kg"); return; }
    const t = todayKey();
    S.weights = S.weights.filter((w) => w.date !== t);
    S.weights.push({ date: t, kg: Math.round(kg * 10) / 10 });
    save(); UI.sheet = null; document.querySelector(".sheet-backdrop")?.remove(); render(); showToast("Logged ⚖️");
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const fn = ACTIONS[el.dataset.a];
  if (fn) {
    e.preventDefault();
    try { fn(el); }
    catch (err) { showToast("⚠️ " + (err && err.message ? err.message : "Something went wrong")); }
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "lib-q") { // patch only the list so the input keeps focus + keyboard
    UI.libQ = e.target.value;
    const list = document.getElementById("lib-list");
    if (list) list.innerHTML = libListHTML();
  }
  if (e.target.id === "set-sound") { S.settings.sound = e.target.checked; save(); }
  if (e.target.id === "set-time") { S.profile.time = e.target.value; save(); }
  if (e.target.id === "set-anchor") { S.profile.anchor = e.target.value; save(); }
});

/* ---------- boot ---------- */
try {
  load();
  render();
} catch (e) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="card" style="margin-top:40px"><b style="color:var(--bad)">⚠️ FORGE hit an error starting up.</b><p class="sub" style="margin-top:8px">${esc(e && e.message ? e.message : String(e))}</p><button class="btn" onclick="location.reload()" style="margin-top:12px">Reload</button></div>`;
}
