/* ============================================================
   TODAY — one obvious next action
   ============================================================ */

function todayState() {
  const t = todayKey();
  const pain = painToday();
  const logs = sessionsOn(t);
  const isTrainDay = S.profile.trainDays.includes(new Date().getDay());
  const dayType = todaysDayType();
  const plan = S.plans[t]?.mode || "one";
  const strength = logs.filter((l) => l.type === "strength");
  const p1 = strength.find((l) => l.dayType === dayType && l.part === 1);
  const mainDone = strength.some((l) => !l.part || l.part === 2);
  const spineDone = logs.filter((l) => l.type === "spine").length;
  const walks = logs.filter((l) => l.type === "walk").length;
  const quickDone = logs.some((l) => l.type === "quick" || l.type === "rescue");
  const late = new Date().getHours() >= 20 && logs.length === 0;
  return { t, pain, logs, isTrainDay, dayType, plan, p1, mainDone, spineDone, walks, quickDone, late, strength };
}

/* What tapping the main Start would do, and whether the guardrails allow it. */
function mainPlan(st) {
  const part = st.plan === "split" || st.p1 ? (st.p1 ? 2 : 1) : null;
  const w = buildWorkout(st.dayType, st.pain || "green", part);
  const check = checkStrength({ items: w.items, dayType: st.dayType, part });
  return { part, w, check };
}

function renderToday() {
  const st = todayState();
  const wk = weekInfo();
  const resume = restoreActive();
  const deload = deloadSuggestion();
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const name = S.profile.name ? `, ${esc(S.profile.name)}` : "";

  let html = `<div class="screen">
    <header class="today-head">
      <div class="col"><span class="t-cap">${date}</span><h1 class="t-title">${greeting()}${name}</h1></div>
      <button class="ring-wrap" data-a="nav" data-v="progress" aria-label="${wk.done} of ${wk.target} workouts this week. Open progress.">
        ${ringSVG(wk.done, wk.target)}
        <span class="col" style="gap:0;white-space:nowrap"><span class="t-strong">${wk.done} of ${wk.target}</span><span class="t-cap">this week</span></span>
      </button>
    </header>`;

  if (!storageOK) html += notice("bad", "alert", "<b>Your data can't be saved here.</b> Private browsing or blocked storage — open FORGE in normal Safari.");
  if (RESCUE_RAW) html += notice("warn", "alert", `<b>Old data couldn't be read.</b> It's kept safe — <button class="btn-text" data-a="nav" data-v="me">rescue it in Me</button>.`);

  if (resume) {
    const it = resume.items[resume.idx];
    html += `<section class="card hero" data-st="${it.ex.st}">
      <div class="row">${I("undo")}<span class="t-cap">Unfinished session</span></div>
      <div class="col"><h2 class="t-head">${esc(resume.name)}</h2><p class="t-body">Pick up at ${esc(it.ex.name)}, set ${resume.setIdx + 1}. Everything you logged is saved.</p></div>
      <button class="btn btn-primary block" data-a="resume">${I("play")}Resume</button>
      <button class="btn btn-text" data-a="resume-discard">Discard it</button>
    </section>`;
  }

  if (deload && !resume) {
    html += `<section class="card" data-tone="warn"><div class="stack">
      <div class="row">${I("moon-z")}<h2 class="t-head">Lighter week?</h2></div>
      <p class="t-body">${deload}</p>
      <div class="grid-2"><button class="btn btn-tinted" data-a="deload-start">Start lighter week</button><button class="btn btn-secondary" data-a="deload-dismiss">Not now</button></div>
    </div></section>`;
  }

  html += checkinCard(st);
  if (!resume) html += heroCard(st);
  html += alsoToday(st);
  html += weekStrip();
  html += `<p class="t-small" style="text-align:center;padding:4px 12px">${NUDGES[Math.floor(Date.now() / 864e5) % NUDGES.length]}</p>`;
  html += `</div>`;
  $app().innerHTML = html;
}

function checkinCard(st) {
  if (st.pain) {
    const auto = st.pain === "yellow" && S.log.some((l) => l.date === dayShift(st.t, -1) && l.back === "worse") && !S.painConfirmed?.[st.t];
    return `<div class="row between card" style="padding:12px 16px" data-tone="${toneOf[st.pain]}">
      <span class="row" style="gap:10px"><span class="choice compact" style="min-height:0;padding:0;background:none"><span class="dot"></span></span>
      <span class="col" style="gap:0"><span class="t-strong">Back today: ${painLabel[st.pain]}</span>${auto ? `<span class="t-cap">Set because yesterday's session bothered your back</span>` : ""}</span></span>
      <button class="btn btn-secondary btn-sm" data-a="pain-reset">Change</button></div>`;
  }
  return `<section class="card" aria-labelledby="ci-h"><div class="stack">
    <div class="col"><h2 class="t-head" id="ci-h">How's your back today?</h2><p class="t-small">Your answer shapes today's workout.</p></div>
    <div class="grid-3">
      ${["green", "yellow", "red"].map((k) => `<button class="choice" data-tone="${toneOf[k]}" data-a="pain" data-v="${k}"><span class="dot"></span>${painLabel[k]}</button>`).join("")}
    </div>
    <p class="t-cap">Anything going down a leg? Choose <b>Rough</b>.</p>
  </div></section>`;
}

function blockedPanel(check, override = true) {
  const n = check.notes.find((x) => x.level === "block");
  const when = check.availableAt ? `<b>${readyWhen(check.availableAt)}</b> ` : "";
  const canOverride = override && !(painToday() === "red" || S.phase === 1);
  return `<div class="stack">
    ${notice("warn", "lock", `<b>${n.text}</b><br>${when}${n.why}`)}
    <div class="grid-2"><button class="btn btn-tinted" data-tone="brand" data-a="start-spine">${I("spine")}Spine Reset</button>
    <button class="btn btn-secondary" data-a="sheet" data-v="walk">${I("walk")}Log a walk</button></div>
    ${canOverride ? `<button class="btn btn-text" data-a="override">I understand — train anyway</button>` : ""}
  </div>`;
}
function warnNotes(check) {
  const w = check.notes.filter((x) => x.level === "warn");
  return w.length ? notice("warn", "info", w.map((x) => `<b>${x.text}</b> ${x.why}`).join("<br>")) : "";
}

function heroCard(st) {
  const tpl = DAY_TEMPLATES[st.dayType];
  // Phase 1 or rough back: the Spine Reset is the workout
  if (S.phase === 1 || st.pain === "red") {
    const red = st.pain === "red";
    const done = st.spineDone > 0;
    return `<section class="card hero" data-st="floor">
      <span class="t-cap">${red ? "Gentle day" : "Phase 1 · calm the back first"}</span>
      <div class="col"><h2 class="t-display">${done ? "Today's done." : "Spine Reset"}</h2>
      <p class="t-body">${done ? "That was exactly the right training. A short walk stacks well if it feels OK." : red ? "No strength today — gentle McGill work and a walk are the protocol, not a cop-out." : "While your back settles, the daily Reset plus walking is the whole program. Strength unlocks in Phase 2."}</p></div>
      ${done ? "" : `<button class="btn btn-primary block" data-a="start-spine">${I("play")}Start Spine Reset · 10 min</button>`}
      ${red ? notice("bad", "alert", "Same-day doctor if: groin numbness, bladder or bowel changes, or leg weakness.") : ""}
    </section>`;
  }

  // done for today → second-session option
  if (st.mainDone) {
    const opt = secondSessionOption();
    let second = "";
    if (opt) {
      const t2 = DAY_TEMPLATES[opt.dayType];
      second = opt.check.level === "block"
        ? `<div class="list-row" style="padding:0">${`<span class="tile">${I("lock")}</span>`}<div class="col grow"><span class="t-strong">Second session: ${t2.name}</span>
            <span class="t-small">${opt.check.availableAt ? `${readyWhen(opt.check.availableAt)} ` : ""}${opt.check.notes.find((n) => n.level === "block").text}</span></div></div>`
        : `<button class="btn btn-secondary block" data-a="start-second" data-v="${opt.dayType}">${I("plus")}Add ${t2.name} · ${t2.short}</button>`;
    }
    return `<section class="card hero" data-tone="good">
      <div class="row"><span class="tile done">${I("check")}</span><span class="t-cap">Done for today</span></div>
      <div class="col"><h2 class="t-display">Forged.</h2><p class="t-body">${st.spineDone ? "Strength and spine work both in. Perfect day." : "Strength is in. Cap it with the Spine Reset when you have 10 minutes."}</p></div>
      ${second}
    </section>`;
  }

  const restDay = !st.isTrainDay && !st.p1 && !UI.trainAnyway;
  if (restDay) {
    const done = st.spineDone > 0;
    return `<section class="card hero" data-st="floor">
      <span class="t-cap">Rest day · recovery builds the strength</span>
      <div class="col"><h2 class="t-display">${done ? "Rest day, handled." : "Spine Reset"}</h2>
      <p class="t-body">${done ? "Your streak is fed. A walk stacks beautifully on top." : "10 minutes keeps your streak alive and your back armoured."}</p></div>
      ${done ? "" : `<button class="btn btn-primary block" data-a="start-spine">${I("play")}Start Spine Reset</button>`}
      <button class="btn btn-secondary block" data-a="train-anyway">Train anyway · ${tpl.name}</button>
    </section>`;
  }

  const { part, w, check } = mainPlan(st);
  const sts = stationsOf(w.items);
  const moves = w.items.filter((i) => !i.warmup).map((i) => i.ex.name);
  const title = part ? `${tpl.name} · part ${part} of 2` : tpl.name;
  const lateQuick = st.late && !part;
  const blocked = check.level === "block" && !UI.override;

  let actions;
  if (blocked) actions = blockedPanel(check);
  else if (lateQuick) actions = `
      <button class="btn btn-primary block" data-a="start-quick">${I("rescue")}Quick version · 8 min</button>
      <p class="t-small" style="text-align:center">Late start? The quick version fully counts.</p>
      <button class="btn btn-secondary block" data-a="start-main">Full ${tpl.name} · ${w.est} min</button>`;
  else actions = `
      ${warnNotes(check)}
      <button class="btn btn-primary block" data-a="start-main">${I("play")}${part ? `Start part ${part}` : "Start workout"}</button>
      <div class="grid-2">
        <button class="btn btn-secondary" data-a="sheet" data-v="plan">${I("split")}${part ? "Change plan" : "Split AM + PM"}</button>
        <button class="btn btn-secondary" data-a="start-quick">${I("rescue")}Quick 8 min</button>
      </div>`;

  return `<section class="card hero">
    <div class="chips">${sts.map(stationChip).join("")}</div>
    <div class="col"><h2 class="t-display">${title}</h2>
      <p class="t-body">${tpl.short} · ${plural(moves.length, "move")} · about ${w.est} min${st.pain === "yellow" ? " · eased for a niggly back" : ""}${w.deload ? " · lighter week" : ""}</p>
      ${part ? `<p class="t-small">${moves.join(" · ")}</p>` : ""}
      ${S.profile.anchor ? `<p class="t-cap">After ${esc(S.profile.anchor.replace(/^(right )?after /i, ""))}</p>` : ""}
    </div>
    ${actions}
  </section>`;
}

function alsoToday(st) {
  const rows = [];
  const spineHero = S.phase === 1 || st.pain === "red" || (!st.isTrainDay && !st.p1 && !UI.trainAnyway && !st.mainDone);
  if (!spineHero || st.spineDone) {
    rows.push(`<div class="list-row" data-st="floor"><span class="tile ${st.spineDone ? "done" : ""}">${I(st.spineDone ? "check" : "spine")}</span>
      <div class="col grow"><span class="t-strong">Spine Reset</span><span class="t-small">${st.spineDone ? `Done${st.spineDone > 1 ? ` ×${st.spineDone}` : ""} · 10 min daily back armour` : "10 min · daily back armour"}</span></div>
      <button class="btn btn-tinted btn-sm" data-tone="brand" data-a="start-spine">${st.spineDone ? "Again" : "Start"}</button></div>`);
  }
  rows.push(`<div class="list-row" data-tone="good"><span class="tile ${st.walks >= 2 ? "done" : ""}">${I(st.walks >= 2 ? "check" : "walk")}</span>
    <div class="col grow"><span class="t-strong">Walk</span><span class="t-small">${st.walks} of 2 today · best back medicine there is</span></div>
    <button class="btn btn-tinted btn-sm" data-tone="brand" data-a="sheet" data-v="walk">Log</button></div>`);
  if (!S.profile.barSetting && S.phase > 1) {
    rows.push(`<div class="list-row" data-st="bar"><span class="tile">${I("st-bar")}</span>
      <div class="col grow"><span class="t-strong">Set your bar height · 1 min</span><span class="t-small">Check the ceiling gap first — your head needs room above the bar</span></div>
      <button class="btn btn-tinted btn-sm" data-tone="brand" data-a="sheet" data-v="bar">Set</button></div>`);
  }
  if (towerCheckDue()) {
    rows.push(`<div class="list-row" data-st="bar"><span class="tile">${I("wrench")}</span>
      <div class="col grow"><span class="t-strong">Tower check · 1 min</span><span class="t-small">Tighten the bolts, check the grips — owners say they work loose</span></div>
      <button class="btn btn-tinted btn-sm" data-tone="brand" data-a="tower-checked">Done</button></div>`);
  }
  return `<h2 class="section-title">Also today</h2><div class="list">${rows.join("")}</div>`;
}

function weekStrip() {
  const ws = weekStart(todayKey());
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const d = dayShift(ws, i);
    const logs = sessionsOn(d);
    const strength = logs.some(countsForWeek);
    const any = logs.length > 0;
    const isToday = d === todayKey();
    const planned = S.profile.trainDays.includes((i + 1) % 7);
    const label = new Date(...d.split("-").map((n, j) => (j === 1 ? n - 1 : +n))).toLocaleDateString(undefined, { weekday: "narrow" });
    const cls = strength ? "s" : any ? "l" : S.pain[d] === "red" ? "p" : S.streak.frozen[d] ? "f" : "";
    const mark = strength ? I("check", "sm") : any ? "·" : S.pain[d] === "red" ? "‖" : S.streak.frozen[d] ? I("snowflake", "sm") : planned ? "○" : "";
    cells.push(`<div class="col" style="align-items:center;gap:6px"><span class="t-cap">${label}</span><span class="d ${cls} ${isToday ? "today" : ""}" style="width:36px;height:36px;aspect-ratio:auto">${mark}</span></div>`);
  }
  return `<section class="card" aria-label="This week"><div class="row between" style="margin-bottom:12px"><span class="t-strong">This week</span>
    <button class="btn btn-text btn-sm" data-a="sheet" data-v="streak">${I("snowflake", "sm")} ${plural(S.streak.freezes, "freeze")}</button></div>
    <div class="cal" style="grid-template-columns:repeat(7,1fr)">${cells.join("")}</div></section>`;
}
