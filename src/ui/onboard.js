/* ============================================================
   ONBOARDING — three short steps, then straight to Today
   ============================================================ */

function renderOnboard() {
  const o = UI.ob;
  const steps = [obWelcome, obStart, obWeek];
  document.getElementById("nav")?.remove();
  $app().innerHTML = `<div class="ob screen">
    <div class="row between">
      ${o.step > 0 ? `<button class="btn-icon" data-a="ob-prev" aria-label="Back">${I("chev-left", "sm")}</button>` : LOGO_SVG}
      <div class="ob-progress grow" style="max-width:160px" aria-label="Step ${o.step + 1} of ${steps.length}">${steps.map((_, i) => `<i class="${i <= o.step ? "on" : ""}"></i>`).join("")}</div>
    </div>
    ${steps[o.step]()}
  </div>`;
}

function obWelcome() {
  if (UI.ob.rf) return `
    <h1 class="t-display" style="color:var(--bad-ink)">Doctor first, then we train.</h1>
    <p class="t-body">These can mean a nerve is being squeezed in a way that needs a doctor today — not a workout app.</p>
    <div class="card" data-tone="bad"><ul class="stack" style="margin-left:18px;color:var(--ink-2)">${RED_FLAGS.map((r) => `<li>${r}</li>`).join("")}</ul></div>
    <p class="t-body">Please get checked first. FORGE will be right here when you're cleared.</p>
    <div class="foot"><button class="btn btn-secondary block" data-a="ob-rf-back">I misread — none of these apply</button></div>`;
  return `
    <div class="ob-art">${MARK_SVG}</div>
    <h1 class="t-display" style="text-align:center">Get strong.<br>Guard your back.</h1>
    <p class="t-body" style="text-align:center">A back-safe strength plan built for the power tower in your room. Ten minutes of spine care a day, and streaks that forgive.</p>
    <div class="card"><div class="stack"><span class="t-strong">Quick check: any of these right now?</span>
      <ul class="stack t-small" style="margin-left:18px;gap:6px">${RED_FLAGS.map((r) => `<li>${r}</li>`).join("")}</ul></div></div>
    <div class="foot">
      <button class="btn btn-primary block" data-a="ob-next">None of those — let's go</button>
      <button class="btn btn-secondary block" data-a="ob-redflag">I have one of these</button>
      ${isConstrained() ? `<button class="btn btn-text" data-a="sheet" data-v="import">Moving from Safari? Restore a backup</button>` : ""}
    </div>`;
}

function obStart() {
  const o = UI.ob;
  const seg = (k, opts) => `<div class="seg">${opts.map((t, i) => `<button data-a="ob-set" data-k="${k}" data-v="${i}" class="${(o[k] ?? 0) == i ? "on" : ""}">${t}</button>`).join("")}</div>`;
  return `
    <h1 class="t-title">Where are you starting?</h1>
    <p class="t-body">Best guesses are fine — FORGE adjusts as you log.</p>
    <div class="field"><span class="t-cap">Strict pull-ups in a row</span>${seg("vpull", ["0", "1–4", "5–9", "10+"])}</div>
    <div class="field"><span class="t-cap">Full dips in a row</span>${seg("dip", ["0", "1–4", "5–9", "10+"])}</div>
    <div class="field"><span class="t-cap">Push-ups in a row</span>${seg("push", ["0–5", "6–15", "16–30", "30+"])}</div>
    <div class="foot"><button class="btn btn-primary block" data-a="ob-next">Next</button></div>`;
}

function obWeek() {
  const o = UI.ob;
  const days = o.days || [1, 2, 4, 5];
  return `
    <h1 class="t-title">Your week</h1>
    <div class="field"><span class="t-cap">Training days (4 is the sweet spot)</span>
      <div class="days">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<button data-a="ob-day" data-v="${i}" class="${days.includes(i) ? "on" : ""}" aria-pressed="${days.includes(i)}">${DAYS[i]}</button>`).join("")}</div></div>
    <div class="grid-2">
      <label class="field"><span class="t-cap">Usual training time</span><input type="time" id="ob-time" value="${o.time || "18:00"}"></label>
      <label class="field"><span class="t-cap">Usual wake time</span><input type="time" id="ob-wake" value="${o.wake || "07:00"}"></label>
    </div>
    ${notice("brand", "today", "FORGE keeps strength work out of the first hour after you wake — discs are most vulnerable then.")}
    <p class="t-cap">Nothing here is fixed — change days and times whenever you like${alertsAvailable() ? ", and set repeat nudges under Alerts" : " in Me"}.</p>
    <label class="field"><span class="t-cap">Your name (optional)</span><input type="text" id="ob-name" maxlength="30" placeholder="So Today can say hi" value="${esc(o.name || "")}"></label>
    <div class="foot"><button class="btn btn-primary block" data-a="ob-finish">${I("check")}Start training</button></div>`;
}
