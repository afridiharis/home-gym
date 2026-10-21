/* ============================================================
   PLAYER — full-screen, one exercise at a time, one tap to log
   ============================================================ */

function warmupItem(b) {
  const ex = EX[b.ex];
  return { exId: b.ex, ex, sets: b.sets, target: b.target, timed: ex.kind === "secs" || ex.kind === "secside" || b.ex === "walk",
    warmup: true, label: b.label, ramp: b.ramp };
}

function startSession(kind, opts = {}) {
  unlockAudio();
  const pain = painToday() || "green";
  let sess;
  if (kind === "strength") sess = buildWorkout(opts.dayType || todaysDayType(), pain, opts.part ?? null);
  else if (kind === "quick") sess = buildQuick(opts.dayType || todaysDayType(), pain);
  else if (kind === "spine") sess = buildRoutine(SPINE_ROUTINE, "spine");
  else sess = buildRoutine(RESCUE_ROUTINE, "rescue");
  sess.kind = kind;
  sess.items = [...(sess.warmup || []).map(warmupItem), ...sess.items];
  sess.items.forEach((it) => { it.setLog = it.setLog || []; });
  sess.idx = 0; sess.setIdx = 0; sess.startTs = Date.now();
  UI.session = sess;
  UI.override = false;
  snapshotActive(sess);
  acquireWake();
  renderPlayer();
  countdown();
  if (!S.seenSwipe) { S.seenSwipe = true; save(); setTimeout(() => UI.session && showToast("Tip: swipe left or right to move between moves"), 3900); }
}
// 3-2-1-Go over the first move: time to get to the station; tap to skip
function countdown() {
  document.getElementById("countdown")?.remove();
  const it = curItem();
  const el = document.createElement("div");
  el.id = "countdown";
  el.dataset.st = it.ex.st;
  el.setAttribute("role", "status");
  document.body.appendChild(el);
  let n = 3, timer;
  const end = () => { clearTimeout(timer); el.remove(); };
  const step = () => {
    if (!el.isConnected) return;
    if (n === 0) { el.innerHTML = `<span class="n go">Go</span>`; sfx("go"); timer = setTimeout(end, 700); return; }
    el.innerHTML = `<span class="n">${n}</span><span class="t-strong">${n === 3 ? `Get to the ${STATIONS[it.ex.st].short.toLowerCase()}` : esc(it.ex.name)}</span>`;
    sfx("tick");
    n--;
    timer = setTimeout(step, 1000);
  };
  el.addEventListener("click", () => { end(); sfx("go"); });
  step();
}
function resumeSession() {
  const a = restoreActive();
  if (!a) return;
  unlockAudio();
  UI.session = a;
  acquireWake();
  renderPlayer();
}

const curItem = () => UI.session.items[UI.session.idx];
const setTarget = (it, i) => (it.pyramid ? it.pyramid[Math.min(i, it.pyramid.length - 1)] : it.target);

function renderPlayer(dir = 0) {
  const s = UI.session;
  if (!s) return;
  const it = curItem();
  const ex = it.ex;
  const tgt = it._adj ?? setTarget(it, s.setIdx);
  const mains = s.items.filter((x) => !x.warmup);
  const pos = mains.indexOf(it);
  const segs = s.items.map((x, i) => { const n = loggedSets(x);
    return `<i class="${n >= x.sets ? "done" : n ? "part" : ""} ${i === s.idx ? "now" : ""}"></i>`; }).join("");
  const setLabel = loggedSets(it) >= it.sets ? `All ${it.sets} sets done` : `Set ${Math.min(s.setIdx + 1, it.sets)} of ${it.sets}`;
  const unit = kindUnit(ex, tgt) + sideNote(ex);
  const head = it.warmup ? `Warm-up${it.label ? " · " + esc(it.label) : ""}` : `Move ${pos + 1} of ${mains.length}${it.note ? " · " + esc(it.note) : ""}`;
  const clip = ASSETS.clips[it.exId];

  const el = document.createElement("div");
  el.id = "player";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${s.name}: ${ex.name}`);
  el.innerHTML = `<div class="inner ${dir > 0 ? "in-next" : dir < 0 ? "in-prev" : ""}" data-st="${ex.st}">
    <div class="p-top">
      <button class="btn-icon" data-a="quit" aria-label="End session">${I("close")}</button>
      <div class="segments" aria-hidden="true">${segs}</div>
      <button class="hurt-btn" data-a="sheet" data-v="hurts">${I("spine", "sm")}Back hurts</button>
    </div>
    <div class="station-line">
      <div class="mini-tower">${towerSVG(ex.st)}</div>
      <div class="col grow"><span class="t-strong">${STATIONS[ex.st].go}</span><span class="t-small">${stationHint(ex.st)}</span></div>
    </div>
    <div class="demo" id="demo-box">${clip ? `<video src="${clip}" autoplay muted loop playsinline aria-label="Demo of ${esc(ex.name)}"></video>` : ""}
      ${it.warmup ? `<span class="chip warm-tag" data-tone="warn">${I("today", "sm")}Warm-up</span>` : ""}</div>
    <div class="col">
      <span class="t-cap">${head}</span>
      <h1 class="t-title">${esc(ex.name)}</h1>
      <p class="t-body">${esc(ex.cues[0])}. <button class="btn-text" style="min-height:0;padding:0" data-a="sheet" data-v="ex:${it.exId}">Form tips</button></p>
    </div>
    ${it.timed ? holdBlock(it, tgt, unit) : `<div class="target">
      <span class="t-num">${tgt}</span>
      <div class="col"><span class="t-head">${unit}</span><span class="t-cap">${setLabel}</span>
      <div class="set-dots">${Array.from({ length: it.sets }, (_, i) => `<i class="${it.setLog[i] != null ? "done" : i === s.setIdx ? "now" : ""}"></i>`).join("")}</div></div>
    </div>`}
    <div class="p-actions">
      ${it.timed ? "" : `<button class="btn btn-primary block" data-a="log-set">${I("check")}Done · ${tgt} ${kindUnit(ex, tgt)}</button>`}
      <div class="tertiary">
        <button data-a="swap-easier">${I("easier")}Easier</button>
        ${it.timed ? `<button data-a="time-adj" data-v="10">${I("plus")}+10 s</button>` : `<button data-a="sheet" data-v="count">${I("edit")}Different count</button>`}
        <button data-a="skip-ex">${I("skip")}Skip</button>
      </div>
    </div>
  </div>`;
  const old = document.getElementById("player");
  old ? old.replaceWith(el) : document.body.appendChild(el);
  if (!clip) mountDemo(document.getElementById("demo-box"), it.exId, 200);
}

function holdBlock(it, tgt, unit) {
  const c = 2 * Math.PI * 96;
  return `<div class="hold" aria-live="polite">
      <svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="96" fill="none" stroke="var(--surface-2)" stroke-width="14"/>
      <circle id="hold-arc" cx="110" cy="110" r="96" fill="none" stroke="var(--st)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="0"/></svg>
      <span class="t-num val" id="hold-val">${fmtClock(tgt)}</span>
    </div>
    <div class="col" style="align-items:center"><span class="t-cap">Hold${sideNote(it.ex)} · ${loggedSets(it) >= it.sets ? `all ${it.sets} sets done` : `set ${Math.min(UI.session.setIdx + 1, it.sets)} of ${it.sets}`}</span></div>
    <button class="btn btn-primary block" id="hold-btn" data-a="hold-start">${I("play")}${it.exId === "walk" ? "Start" : "Start hold"}</button>`;
}

/* ---------- holds ---------- */
function startHold() {
  const it = curItem();
  const tgt = it._adj ?? setTarget(it, UI.session.setIdx);
  const endTs = Date.now() + tgt * 1000;
  const c = 2 * Math.PI * 96;
  clearInterval(UI.timer);
  sfx("go");
  const btn = document.getElementById("hold-btn");
  if (btn) { btn.innerHTML = `${I("check")}Done early`; btn.dataset.a = "hold-stop"; btn.classList.replace("btn-primary", "btn-secondary"); }
  let lastTick = null;
  UI.holdEnd = endTs; UI.holdTgt = tgt;
  UI.timer = setInterval(() => {
    const left = Math.max(0, Math.ceil((endTs - Date.now()) / 1000));
    const v = document.getElementById("hold-val"), arc = document.getElementById("hold-arc");
    if (v) v.textContent = fmtClock(left);
    if (arc) arc.style.strokeDashoffset = String(c * (1 - left / tgt));
    if (left <= 3 && left > 0 && left !== lastTick) { lastTick = left; sfx("tick"); }
    if (left === 0) { clearInterval(UI.timer); logSet(tgt); }
  }, 200);
}
function stopHoldEarly() {
  clearInterval(UI.timer);
  const left = Math.max(0, Math.ceil(((UI.holdEnd || Date.now()) - Date.now()) / 1000));
  logSet(Math.max(1, (UI.holdTgt || 0) - left));
}

/* ---------- logging + rest ---------- */
function logSet(val) {
  const s = UI.session, it = curItem();
  if (val == null) val = it._adj ?? setTarget(it, s.setIdx);
  it.setLog[s.setIdx] = val;
  delete it._adj;
  sfx("set-done");
  const lastSet = s.setIdx >= it.sets - 1;
  const nextOpen = s.items.findIndex((x, i) => i > s.idx && loggedSets(x) < x.sets);
  if (lastSet && nextOpen < 0) { finishSession(); return; }
  if (lastSet) { s.idx = nextOpen; s.setIdx = openSet(s.items[nextOpen]); } else s.setIdx++;
  snapshotActive(s);
  const restSec = it.warmup ? 0 : s.type === "strength" || s.type === "quick" ? (it.ladder && !it.volume ? S.settings.restMain : S.settings.restAcc) : S.settings.restSpine;
  renderPlayer();
  if (restSec > 0) startRest(restSec);
}

function startRest(sec) {
  UI.rest = { endTs: Date.now() + sec * 1000 };
  document.querySelectorAll("#rest").forEach((n) => n.remove());
  const nx = curItem();
  const ntgt = setTarget(nx, UI.session.setIdx);
  const div = document.createElement("div");
  div.id = "rest"; div.dataset.st = nx.ex.st;
  div.setAttribute("role", "dialog"); div.setAttribute("aria-label", "Rest");
  div.innerHTML = `
    <span class="t-cap" style="color:var(--st-ink)">Rest — shake it out</span>
    <span class="t-num clock" id="rest-val" aria-live="polite">${fmtClock(sec)}</span>
    <div class="card next"><div class="row">
      <span class="tile" style="background:var(--surface)">${I(STATIONS[nx.ex.st].icon, "lg")}</span>
      <div class="col grow"><span class="t-cap">Next up</span><span class="t-strong">${esc(nx.ex.name)}</span>
      <span class="t-small">Set ${UI.session.setIdx + 1} of ${nx.sets} · ${ntgt} ${kindUnit(nx.ex, ntgt)}${sideNote(nx.ex)}</span></div></div></div>
    <div class="grid-2" style="width:100%;max-width:420px">
      <button class="btn btn-secondary" data-a="rest-add">${I("plus")}15 s</button>
      <button class="btn btn-primary" data-a="rest-skip">Skip rest</button>
    </div>
    <button class="btn btn-text" data-a="quit">End session</button>`;
  document.body.appendChild(div);
  clearInterval(UI.restTimer);
  let warned = false, lastTick = null;
  UI.restTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((UI.rest.endTs - Date.now()) / 1000));
    const el = document.getElementById("rest-val");
    if (el) { el.textContent = fmtClock(left); el.classList.toggle("ending", left <= 5); }
    if (left === 10 && !warned) { warned = true; sfx("warn10"); }
    if (left <= 3 && left > 0 && left !== lastTick) { lastTick = left; sfx("tick"); }
    if (left === 0) { endRest(); sfx("rest-end"); }
  }, 200);
}
function endRest() { clearInterval(UI.restTimer); UI.rest = null; document.querySelectorAll("#rest").forEach((n) => n.remove()); }

function skipExercise() {
  const s = UI.session;
  if (s.idx >= s.items.length - 1) { clearInterval(UI.timer); finishSession(); return; }
  goToItem(s.idx + 1, 1);
}

/* ---------- moving between moves: swipe, arrow keys, Skip ---------- */
const loggedSets = (it) => it.setLog.filter((v) => v != null).length;
// the set to pick up on: the first one not logged yet (a move you come back to keeps what you logged)
const openSet = (it) => Math.min(loggedSets(it), it.sets - 1);

function goToItem(i, dir) {
  const s = UI.session;
  if (!s || i < 0 || i >= s.items.length || i === s.idx) return;
  clearInterval(UI.timer); endRest();
  delete curItem()._adj;
  s.idx = i; s.setIdx = openSet(s.items[i]);
  snapshotActive(s);
  renderPlayer(dir);
}

// the card follows the finger; touch-action: pan-y on #player keeps vertical scrolling native
let swipe = null;
document.addEventListener("pointerdown", (e) => {
  const inner = e.target.closest?.("#player .inner");
  if (!inner || !UI.session || e.pointerType === "mouse") return;
  if (e.clientX < 20 || e.clientX > innerWidth - 20) return; // leave the screen edges to the system
  swipe = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, dx: 0, on: false, inner };
});
document.addEventListener("pointermove", (e) => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (!swipe.on) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; } // a scroll, not a swipe
    if (Math.abs(dx) < 12) return;
    swipe.on = true;
    swipe.inner.style.transition = "none";
  }
  const s = UI.session;
  const atEnd = (dx > 0 && s.idx === 0) || (dx < 0 && s.idx === s.items.length - 1);
  swipe.dx = atEnd ? dx / 3 : dx; // rubber-band past the first and last move
  swipe.inner.style.transform = `translateX(${swipe.dx}px)`;
});
function endSwipe(e) {
  if (!swipe || e.pointerId !== swipe.id) return;
  const sw = swipe;
  swipe = null;
  if (!sw.on) return;
  UI.swipedAt = Date.now();
  const s = UI.session;
  const fast = Math.abs(sw.dx) > 50 && Math.abs(sw.dx) / (performance.now() - sw.t) > 0.45;
  const far = Math.abs(sw.dx) > innerWidth * 0.22;
  const to = sw.dx < 0 ? s.idx + 1 : s.idx - 1;
  if (e.type === "pointerup" && (far || fast) && to >= 0 && to < s.items.length) {
    sw.inner.style.transition = "transform .15s ease-in";
    sw.inner.style.transform = `translateX(${sw.dx < 0 ? -110 : 110}%)`;
    setTimeout(() => goToItem(to, sw.dx < 0 ? 1 : -1), 140);
    return;
  }
  if (e.type === "pointerup" && (far || fast)) showToast(sw.dx < 0 ? "That's the last move — log it or tap ✕ to finish" : "This is the first move");
  sw.inner.style.transition = "transform .2s ease-out";
  sw.inner.style.transform = "";
}
document.addEventListener("pointerup", endSwipe);
document.addEventListener("pointercancel", endSwipe);
document.addEventListener("keydown", (e) => {
  if (!UI.session || UI.sheet || UI.rest || document.getElementById("countdown")) return;
  if (e.key === "ArrowRight") goToItem(UI.session.idx + 1, 1);
  if (e.key === "ArrowLeft") goToItem(UI.session.idx - 1, -1);
});
function swapEasier() {
  clearInterval(UI.timer);
  const it = curItem();
  delete it._adj;
  if (it.ladder) {
    const r = ladderRung(it.ladder);
    const curIdx = r ? r.idx : 0;
    if (curIdx > 0) {
      const easier = LADDERS[it.ladder].rungs[curIdx - 1];
      it.exId = easier.ex; it.ex = EX[easier.ex];
      const win = easier.scheme.reps || easier.scheme.secs;
      it.target = win[0]; it.timed = !!easier.scheme.secs; it.ladder = null; // no progression credit for a swap
      showToast(`Swapped to ${it.ex.name} for today`);
    } else { it.target = Math.max(1, Math.floor(it.target * 0.6)); showToast("Target lowered — quality over quantity"); }
  } else {
    it.target = Math.max(1, Math.floor((it.target || 8) * 0.6));
    showToast("Target lowered — listen to your body");
  }
  snapshotActive(UI.session);
  renderPlayer();
}
function quitSession() {
  clearInterval(UI.timer); endRest(); stopDemo(); releaseWake();
  UI.session = null; S.active = null; save();
  document.getElementById("player")?.remove();
  render();
}

/* ---------- finish: celebrate → one-tap feedback → unlocks ---------- */
function finishSession() {
  const s = UI.session;
  clearInterval(UI.timer); endRest(); stopDemo();
  const mins = Math.max(1, Math.round((Date.now() - s.startTs) / 60000));
  const res = completeSession(s, mins);
  releaseWake();
  // a fresh URL replays the play-once burst every finish; afterwards pin the still (Safari may not hold the last frame)
  UI.done = { s, mins, res, rpe: null, back: null, burst: ASSETS.celebrate && `${ASSETS.celebrate}?r=${Date.now()}` };
  if (ASSETS.celebrateStill) setTimeout(() => {
    if (!UI.done) return;
    UI.done.burst = ASSETS.celebrateStill;
    const b = document.querySelector(".done-hero img.burst");
    if (b) b.src = ASSETS.celebrateStill;
  }, 1900);
  UI.session = null;
  document.getElementById("player")?.remove();
  const special = res.prList.length || res.badges.length || res.levelUp || (S.streak.current > 0 && S.streak.current % 7 === 0);
  sfx(res.prList.length ? "pr" : res.levelUp ? "levelup" : "complete");
  if (special || Math.random() < 0.15) confetti(); // variable reward, not every time
  renderDone();
}

function renderDone() {
  const { s, mins, res } = UI.done;
  const wk = weekInfo();
  const strengthy = s.type === "strength" || s.type === "quick";
  const title = s.type === "strength" ? (s.part === 1 ? "Part 1 done." : "Forged.") : s.type === "spine" ? "Back armoured." : "Streak fed.";
  const sub = s.part === 1 ? `${part2When(Date.now() + GUARD.SPLIT_GAP_H * 3600e3)} — FORGE will have it waiting on Today.` : `${esc(s.name)} · ${mins} min`;
  const el = document.createElement("div");
  el.id = "player";
  el.innerHTML = `<div class="inner">
    <div class="done-hero">
      ${ASSETS.celebrate ? `<picture>${ASSETS.celebrateStill ? `<source srcset="${ASSETS.celebrateStill}" media="(prefers-reduced-motion: reduce)">` : ""}<img class="burst" src="${UI.done.burst}" alt="" width="160" height="160"></picture>` : `<span class="tile lg" data-tone="brand">${I("trophy", "lg")}</span>`}
      <h1 class="t-display">${title}</h1>
      <p class="t-body">${sub}</p>
      <span class="chip" data-tone="brand">${I("star", "sm")}+${res.xp} XP${res.levelUp ? ` · level ${xpLevel().lv}!` : ""}</span>
    </div>
    <div class="card"><div class="row">${ringSVG(wk.done, wk.target)}<div class="col grow">
      <span class="t-strong">${wk.done} of ${wk.target} workouts this week</span>
      <span class="t-small">${wk.done >= wk.target ? `Week goal hit${wk.streak > 1 ? ` · ${wk.streak} weeks in a row` : ""}` : `${wk.target - wk.done} more to hit your week`} · ${plural(S.streak.current, "day")} streak</span></div></div></div>
    ${res.prList.length ? `<div class="card" data-tone="brand"><div class="stack"><span class="row t-strong">${I("trophy")}New personal record${res.prList.length > 1 ? "s" : ""}</span>
      ${res.prList.map((p) => `<span class="t-body">${esc(p.ex)} — <b>${p.timed ? fmtClock(p.val) : p.val + " reps"}</b></span>`).join("")}</div></div>` : ""}
    ${res.badges.map((b) => `<div class="card"><div class="row"><span class="tile" data-tone="brand">${I(BADGE_ICONS[b.id] || "star")}</span><div class="col"><span class="t-cap">Badge earned</span><span class="t-strong">${b.name}</span></div></div></div>`).join("")}
    ${strengthy ? `<div class="card"><div class="stack">
      <span class="t-strong">How did that feel?</span>
      <div class="grid-3">${[["easy", "Easy", "good"], ["right", "About right", "brand"], ["hard", "Hard", "warn"]].map(([v, l, t]) =>
        `<button class="choice compact ${UI.done.rpe === v ? "sel" : ""}" data-tone="${t}" data-a="fb-rpe" data-v="${v}">${l}</button>`).join("")}</div>
      <span class="t-strong">And your back?</span>
      <div class="grid-2">${[["ok", "Same or better", "good"], ["worse", "Worse", "bad"]].map(([v, l, t]) =>
        `<button class="choice compact ${UI.done.back === v ? "sel" : ""}" data-tone="${t}" data-a="fb-back" data-v="${v}">${l}</button>`).join("")}</div>
      <p class="t-cap">Targets only go up after sessions that felt OK — never on a hard day or a grumpy back.</p>
    </div></div>` : ""}
    <div class="p-actions"><button class="btn btn-primary block" data-a="done-finish">${I("check")}Finish</button></div>
  </div>`;
  document.getElementById("player")?.remove();
  document.body.appendChild(el);
}

function renderUnlocks(offers) {
  const el = document.createElement("div");
  el.id = "player";
  el.innerHTML = `<div class="inner">
    <div class="done-hero"><span class="tile lg" data-tone="good">${I("progress", "lg")}</span><h1 class="t-title">Level up on the ladder</h1>
    <p class="t-body">You've hit the top of the range two sessions running.</p></div>
    ${offers.map((o, i) => o.locked
      ? `<div class="card">${notice("warn", "lock", `<b>${esc(o.to)}</b> unlocks in Phase ${o.needPhase}. Your body's ready — the timeline just needs to catch up.`)}</div>`
      : `<div class="card"><div class="stack"><span class="t-small">${esc(o.from)} is conquered.</span><span class="t-head">Ready for ${esc(o.to)}?</span>
         <button class="btn btn-tinted block" data-tone="good" data-a="ladder-up" data-v="${o.ladder}">${I("check")}Climb to ${esc(o.to)}</button></div></div>`).join("")}
    <div class="p-actions"><button class="btn btn-primary block" data-a="done-close">Done</button></div>
  </div>`;
  document.getElementById("player")?.remove();
  document.body.appendChild(el);
}
