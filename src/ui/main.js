/* ============================================================
   FORGE — wiring: render root, nav, actions, inputs, boot
   ============================================================ */

const NAV = [
  { id: "today", ico: "today", label: "Today" },
  { id: "progress", ico: "progress", label: "Progress" },
  { id: "moves", ico: "moves", label: "Moves" },
  { id: "me", ico: "me", label: "Me" },
];
function renderNav() {
  document.getElementById("nav")?.remove();
  const nav = document.createElement("nav");
  nav.id = "nav"; nav.setAttribute("aria-label", "Main");
  nav.innerHTML = `<div class="inner">${NAV.map((n) => `<button data-a="nav" data-v="${n.id}" class="${UI.screen === n.id ? "active" : ""}" ${UI.screen === n.id ? 'aria-current="page"' : ""}>${I(n.ico)}${n.label}</button>`).join("")}</div>`;
  document.body.appendChild(nav);
}
function render() {
  applyTheme();
  if (!S.profile) { renderOnboard(); return; }
  recomputeStreak();
  ({ today: renderToday, progress: renderProgress, moves: renderMoves, me: renderMe }[UI.screen] || renderToday)();
  renderNav();
}
const rerenderSheet = () => renderSheet();

/* Start a strength-type session after the back check and guardrails. */
function requireCheckin(then) {
  if (painToday()) return then();
  UI.afterCheckin = then;
  openSheet("paincheck");
}
function startMain() {
  const st = todayState();
  const { part, check } = mainPlan(st);
  if (check.level === "block" && !UI.override) { showToast(check.notes.find((n) => n.level === "block").text); return; }
  startSession("strength", { dayType: st.dayType, part });
}
function startQuick() {
  const st = todayState();
  const q = buildQuick(st.dayType, st.pain || "green");
  const check = checkStrength({ items: q.items, dayType: st.dayType, quick: true });
  const hard = check.notes.find((n) => n.level === "block" && /back|Phase|hour of waking/.test(n.text));
  if (hard && !UI.override) { showToast(hard.text); return; }
  startSession("quick", { dayType: st.dayType });
}

const ACTIONS = {
  nav: (el) => { UI.screen = el.dataset.v; UI.trainAnyway = false; closeSheet(); render(); window.scrollTo(0, 0); },
  sheet: (el) => { UI.planPick = null; UI.countVal = null; openSheet(el.dataset.v); },
  "sheet-close": () => closeSheet(),
  "confirm-yes": () => { const fn = UI.pendingConfirm; closeSheet(); fn && fn(); },

  /* today */
  pain: (el) => { setPain(el.dataset.v); render(); },
  "pain-reset": () => { delete S.pain[todayKey()]; save(); render(); },
  "pain-then-start": (el) => { setPain(el.dataset.v); closeSheet(); render(); const f = UI.afterCheckin; UI.afterCheckin = null; if (f && el.dataset.v !== "red") f(); },
  "start-main": () => requireCheckin(startMain),
  "start-quick": () => requireCheckin(startQuick),
  "start-spine": () => {
    const c = checkSpine();
    if (c.level === "warn") return askConfirm({ title: c.notes[0].text, body: c.notes[0].why, yes: "Do it anyway", no: "Not now", onYes: () => startSession("spine") });
    startSession("spine");
  },
  "start-second": (el) => requireCheckin(() => {
    const dayType = el.dataset.v;
    const w = buildWorkout(dayType, painToday() || "green");
    const c = checkStrength({ items: w.items, dayType });
    if (c.level === "block") { showToast(c.notes.find((n) => n.level === "block").text); return; }
    startSession("strength", { dayType });
  }),
  "train-anyway": () => { UI.trainAnyway = true; render(); },
  override: () => {
    const { check } = mainPlan(todayState());
    askConfirm({ title: "Train anyway?", body: check.notes.filter((n) => n.level === "block").map((n) => `<b>${n.text}</b> ${n.why}`).join("<br><br>"),
      yes: "I understand — start", no: "Good point, not now", onYes: () => { UI.override = true; requireCheckin(startMain); } });
  },
  resume: () => resumeSession(),
  "resume-discard": () => askConfirm({ title: "Discard this session?", body: "The sets you logged in it won't be saved.", danger: true, yes: "Discard", onYes: () => { S.active = null; save(); render(); } }),
  "deload-start": () => { S.deload = todayKey(); save(); render(); showToast("Lighter week on — sets trimmed for 7 days"); },
  "deload-dismiss": () => { S.deloadDismissed = todayKey(); save(); render(); },
  "tower-checked": () => { S.towerCheck = todayKey(); save(); render(); showToast("Tower checked — nice."); },
  "plan-pick": (el) => { UI.planPick = el.dataset.v; rerenderSheet(); },
  "plan-use": () => { S.plans[todayKey()] = { mode: UI.planPick || S.plans[todayKey()]?.mode || "one" }; save(); closeSheet(); render(); showToast(S.plans[todayKey()].mode === "split" ? "Split day — part 1 first" : "One go it is"); },

  /* player */
  "log-set": () => logSet(),
  "hold-start": () => startHold(),
  "hold-stop": () => stopHoldEarly(),
  "time-adj": (el) => { const it = curItem(); it._adj = Math.max(5, (it._adj ?? setTarget(it, UI.session.setIdx)) + Number(el.dataset.v)); renderPlayer(); },
  "rest-add": () => { if (UI.rest) UI.rest.endTs += 15000; },
  "rest-skip": () => endRest(),
  "skip-ex": () => skipExercise(),
  "swap-easier": () => swapEasier(),
  quit: () => {
    if (!UI.session) return;
    const hasMain = UI.session.items.some((i) => !i.warmup && i.setLog?.some((v) => v != null));
    if (hasMain) askConfirm({ title: "End here?", body: "Everything you've logged is saved and counts. Stopping early beats not starting — every time.", yes: "Save & end", no: "Keep going", onYes: () => finishSession() });
    else openSheet("quitconfirm");
  },
  "quit-quick": () => { closeSheet(); quitSession(); startQuick(); },
  "quit-anyway": () => { closeSheet(); quitSession(); showToast("No worries — the day's still yours."); },
  "count-step": (el) => { UI.countVal = Math.max(0, (UI.countVal || 0) + Number(el.dataset.v)); const v = document.getElementById("count-val"); if (v) v.textContent = UI.countVal; },
  "count-log": () => { const v = UI.countVal; closeSheet(); UI.countVal = null; logSet(v); },
  "hurts-mild": () => { setPain("yellow"); closeSheet(); showToast("Logged. Shorten the range and keep it smooth."); },
  "hurts-skip": () => { closeSheet(); swapEasier(); },
  "hurts-leg": () => { setPain("red"); openSheet("legstop"); },
  "legstop-done": () => {
    closeSheet();
    if (!UI.session) { render(); return; }
    if (UI.session.items.some((i) => !i.warmup && i.setLog?.some((v) => v != null))) finishSession(); else quitSession();
  },
  "fb-rpe": (el) => { UI.done.rpe = el.dataset.v; renderDone(); },
  "fb-back": (el) => { UI.done.back = el.dataset.v; renderDone(); },
  "done-finish": () => {
    const { s, res, rpe, back } = UI.done;
    const { offers } = finalizeSession(res.logId, s, rpe || "right", back || "ok");
    if (back === "worse") showToast("Noted — tomorrow starts gentle.");
    if (offers.length) renderUnlocks(offers); else ACTIONS["done-close"]();
  },
  "done-close": () => { document.getElementById("player")?.remove(); UI.done = null; UI.screen = "today"; render(); window.scrollTo(0, 0); },
  "ladder-up": (el) => { ladderUp(el.dataset.v); sfx("levelup"); el.outerHTML = `<span class="badge-done">${I("check", "sm")}Climbed — it's in your next session</span>`; },
  "ladder-down": (el) => { const k = el.dataset.v; S.levels[k] = Math.max(0, (S.levels[k] ?? 0) - 1); save(); closeSheet(); render(); showToast("Dropped a rung — smart training."); },

  /* logging */
  "walk-save": (el) => {
    const mins = Number(el.dataset.v);
    tryRepair();
    S.xp += XP_RULES.walk;
    S.log.push({ id: uid(), date: todayKey(), ts: Date.now(), type: "walk", name: `${mins}-min walk`, mins, sets: [], xp: XP_RULES.walk, hard: {} });
    recomputeStreak(); checkBadges(); save(); closeSheet(); render();
    showToast(`Walk logged · +${XP_RULES.walk} XP`);
  },
  "weight-save": () => {
    const kg = parseFloat(document.getElementById("w-kg")?.value);
    if (!kg || kg < 25 || kg > 350) { showToast("Enter your weight in kg"); return; }
    S.weights = S.weights.filter((w) => w.date !== todayKey());
    S.weights.push({ date: todayKey(), kg: Math.round(kg * 10) / 10 });
    save(); closeSheet(); render(); showToast("Weight logged");
  },
  cal: (el) => { UI.calOffset = Math.min(0, (UI.calOffset || 0) + Number(el.dataset.v)); renderProgress(); },
  "lib-st": (el) => { UI.libSt = el.dataset.v && UI.libSt !== el.dataset.v ? el.dataset.v : null; renderMoves(); },

  /* me */
  "set-day": (el) => {
    const i = Number(el.dataset.v), d = S.profile.trainDays;
    S.profile.trainDays = d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort();
    if (!S.profile.trainDays.length) S.profile.trainDays = [i];
    save(); rerenderSheet();
  },
  "set-target": (el) => { S.profile.weeklyTarget = Number(el.dataset.v); save(); rerenderSheet(); },
  "set-bar": (el) => { S.profile.barSetting = Number(el.dataset.v); save(); closeSheet(); render(); showToast(`Bar set to ${el.dataset.v}`); },
  "set-theme": (el) => { S.settings.theme = el.dataset.v; save(); render(); },
  "set-rest": (el) => { S.settings.restMain = Number(el.dataset.v); save(); render(); },
  "phase-up": () => {
    const ph = PHASES[S.phase - 1];
    askConfirm({ title: `Move to Phase ${S.phase + 1}?`, body: `Be honest with yourself:<br><br><b>${ph.gate}</b>`, yes: "That's me — advance", no: "Not yet",
      onYes: () => { S.phase++; checkBadges(); save(); render(); showToast(`Welcome to Phase ${S.phase}`); } });
  },
  "phase-down": () => askConfirm({ title: "Drop back a phase?", body: "Smart during a flare — zero shame. Your ladder levels are kept.", yes: "Drop back",
    onYes: () => { S.phase--; save(); render(); showToast("Phase adjusted. The ladder isn't going anywhere."); } }),
  "ics-schedule": async () => {
    const r = await deliverFile("forge-training.ics", buildScheduleICS(), "text/calendar;charset=utf-8", "Training calendar");
    if (r === "downloaded") showToast("Downloaded — open the file, then Add All");
    else if (r === "shared") showToast("Open it in Calendar → Add All");
  },
  "ics-spine": async () => {
    const r = await deliverFile("forge-spine-reset.ics", buildSpineICS(S.profile.time), "text/calendar;charset=utf-8", "Spine Reset calendar");
    if (r === "downloaded") showToast("Downloaded — open the file, then Add All");
    else if (r === "shared") showToast("Open it in Calendar → Add All");
  },
  "guide-done": () => { S.seenGuide = true; save(); closeSheet(); },
  "export-data": async () => {
    const r = await exportData();
    if (r === "downloaded") showToast("Backup saved");
    else if (r === "shared") showToast("Backup shared — keep it somewhere safe");
  },
  "import-go": () => {
    try { importData(document.getElementById("import-text").value); closeSheet(); UI.ob = { step: 0 }; render(); showToast("Restored — welcome back"); }
    catch (e) { showToast("That doesn't look like a FORGE backup"); }
  },
  "copy-text": () => {
    const src = document.getElementById("copy-src");
    if (!src) return;
    src.select();
    const ok = () => showToast("Copied");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(src.value).then(ok, () => { document.execCommand("copy"); ok(); });
    else { document.execCommand("copy"); ok(); }
  },
  "rescue-dump": () => openCopySheet("forge-rescued-data.json", RESCUE_RAW || "", "Rescued data"),
  "reset-all": () => askConfirm({ title: "Wipe everything?", danger: true, body: "All history, streaks, levels and settings on this device. Back up first if there's any doubt.",
    yes: "Continue", no: "Keep my data",
    onYes: () => askConfirm({ title: "Really sure?", danger: true, body: "This can't be undone.", yes: "Yes — wipe it", no: "Cancel",
      onYes: () => { localStorage.removeItem(STORE_KEY); S = defaultState(); UI.screen = "today"; UI.ob = { step: 0 }; render(); } }) }),
  "whatsnew-done": () => { S.seenV2 = true; save(); closeSheet(); render(); },

  /* onboarding */
  "ob-next": () => { UI.ob.step++; renderOnboard(); window.scrollTo(0, 0); },
  "ob-prev": () => { UI.ob.step = Math.max(0, UI.ob.step - 1); renderOnboard(); },
  "ob-redflag": () => { UI.ob.rf = true; renderOnboard(); },
  "ob-rf-back": () => { UI.ob.rf = false; renderOnboard(); },
  "ob-set": (el) => {
    const k = el.dataset.k, v = el.dataset.v;
    UI.ob[k] = k === "legs" ? v === "yes" : ["vpull", "dip", "push"].includes(k) ? Number(v) : v;
    renderOnboard();
  },
  "ob-day": (el) => {
    const i = Number(el.dataset.v), d = UI.ob.days || [1, 2, 4, 5];
    UI.ob.time = document.getElementById("ob-time")?.value; UI.ob.wake = document.getElementById("ob-wake")?.value; UI.ob.name = document.getElementById("ob-name")?.value;
    UI.ob.days = d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort();
    renderOnboard();
  },
  "ob-finish": () => {
    const o = UI.ob;
    const days = (o.days || [1, 2, 4, 5]);
    if (!days.length) { showToast("Pick at least one training day"); return; }
    const map = { vpull: [0, 3, 5, 6], dip: [0, 2, 3, 4], push: [0, 1, 2, 3] };
    S.levels.vpull = map.vpull[o.vpull || 0]; S.levels.dip = map.dip[o.dip || 0]; S.levels.push = map.push[o.push || 0];
    S.phase = o.back === "1" ? 1 : 2;
    if (S.phase === 1) { S.levels.vpull = 0; S.levels.dip = 0; }
    S.profile = { trainDays: days, time: document.getElementById("ob-time")?.value || "18:00", wake: document.getElementById("ob-wake")?.value || "07:00",
      anchor: "", legs: !!o.legs, created: todayKey(), weeklyTarget: Math.min(5, days.length), barSetting: null,
      name: (document.getElementById("ob-name")?.value || "").trim().slice(0, 30) };
    S.seenV2 = true;
    save(); UI.screen = "today"; render(); window.scrollTo(0, 0);
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  try { fn(el); } catch (err) { console.error(err); showToast("Something went wrong — " + (err?.message || "try again")); }
});
document.addEventListener("input", (e) => {
  const id = e.target.id, v = e.target.value;
  if (id === "lib-q") { UI.libQ = v; const l = document.getElementById("lib-list"); if (l) l.innerHTML = movesList(); }
  if (!S.profile) return;
  if (id === "set-time" && /^\d{2}:\d{2}$/.test(v)) { S.profile.time = v; save(); }
  if (id === "set-wake" && /^\d{2}:\d{2}$/.test(v)) { S.profile.wake = v; save(); }
  if (id === "set-anchor") { S.profile.anchor = v.slice(0, 60); save(); }
  if (id === "set-name") { S.profile.name = v.trim().slice(0, 30); save(); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "set-sound") { S.settings.sound = e.target.checked; save(); if (S.settings.sound) { unlockAudio(); sfx("set-done"); } render(); }
  if (e.target.id === "import-file" && e.target.files?.[0]) {
    e.target.files[0].text().then((t) => { const ta = document.getElementById("import-text"); if (ta) ta.value = t; });
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !UI.session && !UI.done && !UI.sheet && S.profile) render();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

/* ---------- boot ---------- */
try {
  load();
  if (S.active && S.active.date !== todayKey()) { S.active = null; save(); }
  render();
  if (S.profile && !S.seenV2) openSheet("whatsnew");
} catch (e) {
  console.error(e);
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="card" style="margin-top:40px"><b style="color:var(--bad-ink)">FORGE hit a problem starting up.</b><p class="t-small" style="margin-top:8px">${esc(e?.message || String(e))}</p><button class="btn btn-secondary" onclick="location.reload()" style="margin-top:12px">Reload</button></div>`;
}
if ("serviceWorker" in navigator && window.self === window.top && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
