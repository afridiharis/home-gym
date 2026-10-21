/* ============================================================
   SHEETS — everything one tap deep. Every sheet has a visible close button.
   ============================================================ */

function renderSheet() {
  document.querySelector(".sheet-backdrop")?.remove();
  if (!UI.sheet) return;
  const [kind, arg] = UI.sheet.split(":");
  const body = (SHEETS[kind] || (() => ""))(arg);
  if (!body) { UI.sheet = null; return; }
  const bd = document.createElement("div");
  bd.className = "sheet-backdrop";
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${body}</div>`;
  bd.addEventListener("click", (e) => { if (e.target === bd) closeSheet(); });
  document.body.appendChild(bd);
  if (kind === "ex") mountDemo(document.getElementById("demo-sheet"), arg, 220);
  bd.querySelector("button, input, a")?.focus({ preventScroll: true });
}
const sheetTop = (title, sub = "") => `<div class="sheet-top"><div class="col"><h2 class="t-head">${title}</h2>${sub ? `<span class="t-small">${sub}</span>` : ""}</div>
  <button class="btn-icon" data-a="sheet-close" aria-label="Close">${I("close", "sm")}</button></div>`;
const ul = (items) => `<ul class="stack t-body" style="margin-left:20px;gap:6px">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;

const SHEETS = {
  /* ---- the day planner ---- */
  plan() {
    const st = todayState();
    const tpl = DAY_TEMPLATES[st.dayType];
    const pain = st.pain || "green";
    const one = buildWorkout(st.dayType, pain), a = buildWorkout(st.dayType, pain, 1), b = buildWorkout(st.dayType, pain, 2);
    const names = (w) => w.items.filter((i) => !i.warmup).map((i) => i.ex.name.toLowerCase()).join(", ");
    const mode = UI.planPick || st.plan;
    const opt = (v, title, sub, extra = "") => `<button class="option ${mode === v ? "sel" : ""}" data-a="plan-pick" data-v="${v}">
      <span class="radio"></span><span class="col"><span class="t-strong">${title}</span><span class="t-small">${sub}</span>${extra}</span></button>`;
    const other = DAY_TEMPLATES[DAY_ORDER.find((d) => DAY_TEMPLATES[d].region !== tpl.region)];
    return `${sheetTop("How do you want to do today?")}
      ${opt("split", "Split it: morning + evening", `Part 1 (~${a.est} min): ${names(a)}. Part 2 (~${b.est} min, 4–6 h later): ${names(b)}.`, `<span class="pill-note">Same total work · research-backed</span>`)}
      ${opt("one", "All in one go", `${tpl.name}, about ${one.est} minutes.`)}
      <div class="option locked"><span class="tile" style="width:22px;height:22px;background:none">${I("lock", "sm")}</span>
        <span class="col"><span class="t-strong">Want two full sessions?</span><span class="t-small">Do this one first — then ${other.name} (${other.short.toLowerCase()}) unlocks 6 hours later, so your muscles have time to recover.</span></span></div>
      ${notice("brand", "info", "Splitting a day's work in two is safe — studies even show a small strength edge. <b>Adding</b> extra work is where the risk is, so FORGE keeps an eye on that.")}
      <button class="btn btn-primary block" data-a="plan-use">${I("check")}Use this plan</button>`;
  },

  /* ---- exercise detail ---- */
  ex(id) {
    const e = EX[id];
    if (!e) return "";
    const inLadder = Object.entries(LADDERS).find(([, l]) => l.rungs.some((r) => r.ex === id));
    const clip = ASSETS.clips[id];
    return `${sheetTop(esc(e.name), `${STATIONS[e.st].name}${e.phase > S.phase ? ` · unlocks in Phase ${e.phase}` : ""}`)}
      <div class="demo" data-st="${e.st}" id="demo-sheet">${clip ? `<video src="${clip}" autoplay muted loop playsinline aria-label="Demo of ${esc(e.name)}"></video>` : ""}</div>
      <div class="card"><div class="stack"><span class="t-strong">How to</span>${ul(e.cues.map(esc))}</div></div>
      ${notice("st:" + e.st, STATIONS[e.st].icon, `<b>On your tower:</b> ${TOWER_CUES[e.st]}`)}
      ${notice("warn", "spine", `<b>For your back:</b> ${esc(e.l5)}`)}
      ${S.prs[id] ? `<p class="t-small">Your best: <b>${e.kind.includes("sec") ? fmtClock(S.prs[id]) : S.prs[id] + " reps"}</b></p>` : ""}
      ${inLadder ? `<button class="btn btn-secondary block" data-a="sheet" data-v="ladder:${inLadder[0]}">${I("progress")}See the ${LADDERS[inLadder[0]].name.toLowerCase()} ladder</button>` : ""}`;
  },

  ladder(k) {
    const l = LADDERS[k];
    const idx = Math.min(S.levels[k] ?? 0, l.rungs.length - 1);
    return `${sheetTop(`${l.name} ladder`, `Rung ${idx + 1} of ${l.rungs.length}`)}
      <div class="ladder">${l.rungs.map((r, i) => {
        const e = EX[r.ex], lock = e.phase > S.phase;
        return `<button class="rung ${i < idx ? "done" : i === idx ? "now" : ""}" data-a="sheet" data-v="ex:${r.ex}" style="text-align:left">
          <span class="pip">${i < idx ? I("check", "sm") : lock ? I("lock", "sm") : ""}</span>
          <span class="col"><span class="t-strong">${esc(e.name)}</span><span class="t-small">${i === idx ? "You're here · " : ""}climb when: ${esc(r.crit)}${lock ? ` · Phase ${e.phase}` : ""}</span></span></button>`;
      }).join("")}</div>
      ${idx > 0 ? `<button class="btn btn-secondary block" data-a="ladder-down" data-v="${k}">${I("easier")}Too hard right now — drop a rung</button>` : ""}`;
  },

  /* ---- in-workout ---- */
  count() {
    const it = curItem();
    if (!it) return "";
    UI.countVal = UI.countVal ?? setTarget(it, UI.session.setIdx);
    return `${sheetTop("How many did you get?")}
      <div class="stepper"><button data-a="count-step" data-v="-1" aria-label="One less">${I("minus")}</button>
        <span class="t-num" id="count-val" aria-live="polite">${UI.countVal}</span>
        <button data-a="count-step" data-v="1" aria-label="One more">${I("plus")}</button></div>
      <button class="btn btn-primary block" data-a="count-log">${I("check")}Log it</button>`;
  },
  hurts() {
    return `${sheetTop("Back talking to you?", "Good call checking in.")}
      <button class="option" data-a="hurts-mild"><span class="tile" data-tone="warn">${I("info")}</span><span class="col"><span class="t-strong">Mild, just in my back</span><span class="t-small">3/10 or less, fades between sets — we'll lighten up</span></span></button>
      <button class="option" data-a="hurts-skip"><span class="tile">${I("easier")}</span><span class="col"><span class="t-strong">This move doesn't feel right</span><span class="t-small">Swap to an easier version</span></span></button>
      <button class="option" data-a="hurts-leg" data-tone="bad"><span class="tile">${I("alert")}</span><span class="col"><span class="t-strong">Pain or tingling into a leg</span><span class="t-small">We stop for today. No exceptions, no ego.</span></span></button>
      <button class="btn btn-secondary block" data-a="sheet-close">False alarm — carry on</button>`;
  },
  legstop() {
    return `${sheetTop("Right call. We stop.")}
      <p class="t-body">Leg symptoms mean no strength work today — that rule is what gets you strong long-term. Your logged sets are saved.</p>
      ${ul(["The gentle Spine Reset later, if it feels OK", "A short, easy walk", "Judge today by how tomorrow morning feels"])}
      ${notice("bad", "alert", "<b>Same-day doctor</b> if you get groin numbness, bladder or bowel changes, or leg weakness.")}
      <button class="btn btn-primary block" data-a="legstop-done">End session safely</button>`;
  },
  quitconfirm() {
    return `${sheetTop("Stop here?")}
      <p class="t-body">Nothing's logged yet — but the quick version still counts. Bad days are what it's for.</p>
      <button class="btn btn-primary block" data-a="sheet-close">Keep going</button>
      <button class="btn btn-secondary block" data-a="quit-quick">${I("rescue")}Switch to the quick version</button>
      <button class="btn btn-text" data-a="quit-anyway">Stop anyway</button>`;
  },
  paincheck() {
    return `${sheetTop("Quick back check first", "30 seconds of honesty = the right workout today.")}
      <div class="grid-3">${["green", "yellow", "red"].map((k) => `<button class="choice" data-tone="${toneOf[k]}" data-a="pain-then-start" data-v="${k}"><span class="dot"></span>${painLabel[k]}</button>`).join("")}</div>
      <p class="t-cap">Niggly trims the volume ~40% and drops knee raises. Rough swaps to the Spine Reset.</p>`;
  },
  confirm() {
    const c = UI.confirmCfg || {};
    return `${sheetTop(c.title || "Sure?")}<p class="t-body">${c.body || ""}</p>
      <button class="btn ${c.danger ? "btn-danger" : "btn-primary"} block" data-a="confirm-yes">${c.yes || "Yes"}</button>
      <button class="btn btn-secondary block" data-a="sheet-close">${c.no || "Cancel"}</button>`;
  },

  /* ---- logging ---- */
  walk() {
    return `${sheetTop("Log a walk", "The best-evidenced daily habit for keeping back pain away.")}
      <div class="grid-3">${[10, 15, 20, 30, 45, 60].map((m) => `<button class="btn btn-secondary" data-a="walk-save" data-v="${m}">${m} min</button>`).join("")}</div>`;
  },
  weight() {
    return `${sheetTop("Log bodyweight")}
      <label class="field"><span class="t-cap">Today's weight (kg)</span><input type="number" id="w-kg" inputmode="decimal" placeholder="${S.weights.length ? S.weights[S.weights.length - 1].kg : "e.g. 78"}"></label>
      <button class="btn btn-primary block" data-a="weight-save">Save</button>`;
  },
  level() {
    const l = xpLevel();
    return `${sheetTop(`Level ${l.lv} · ${l.name}`)}<div class="unlock-bar" data-tone="brand"><i style="width:${l.pct}%"></i></div>
      <p class="t-small">${S.xp} XP${l.next ? ` · ${l.next - S.xp} to ${LEVEL_NAMES[l.lv + 1]}` : " · max level"}</p>
      <p class="t-body">XP comes from showing up — sets, sessions, PRs. It never locks anything; it's just your consistency adding up.</p>`;
  },
  streak() {
    return `${sheetTop("Your streak is protected")}
      <div class="list">
        <div class="list-row" data-st="bar"><span class="tile">${I("snowflake")}</span><div class="col"><span class="t-strong">Freezes (${S.streak.freezes} saved)</span><span class="t-small">You earn one per 7 active days, up to 2. Miss a day and one is used automatically.</span></div></div>
        <div class="list-row" data-tone="bad"><span class="tile">${I("spine")}</span><div class="col"><span class="t-strong">Rough-back pause</span><span class="t-small">A red back day pauses the chain — it never breaks it.</span></div></div>
        <div class="list-row" data-tone="brand"><span class="tile">${I("undo")}</span><div class="col"><span class="t-strong">Repair window</span><span class="t-small">Slipped? Finish anything within a day or two and the chain re-links (once a fortnight).</span></div></div>
      </div>
      <p class="t-small">Best streak so far: ${plural(S.streak.best, "day")}.</p>`;
  },

  /* ---- Me ---- */
  schedule() {
    const p = S.profile;
    return `${sheetTop("Your week")}
      <div class="field"><span class="t-cap">Training days</span>
        <div class="days">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<button data-a="set-day" data-v="${i}" class="${p.trainDays.includes(i) ? "on" : ""}" aria-pressed="${p.trainDays.includes(i)}">${DAYS[i]}</button>`).join("")}</div></div>
      <div class="field"><span class="t-cap">Weekly goal (workouts)</span>
        <div class="seg">${[2, 3, 4, 5].map((n) => `<button data-a="set-target" data-v="${n}" class="${p.weeklyTarget === n ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <div class="grid-2">
        <label class="field"><span class="t-cap">Usual training time</span><input type="time" id="set-time" value="${p.time}"></label>
        <label class="field"><span class="t-cap">Usual wake time</span><input type="time" id="set-wake" value="${p.wake}"></label></div>
      <label class="field"><span class="t-cap">Habit cue — train right after…</span><input type="text" id="set-anchor" maxlength="60" placeholder="my evening tea" value="${esc(p.anchor || "")}"></label>
      <label class="field"><span class="t-cap">Name</span><input type="text" id="set-name" maxlength="30" value="${esc(p.name || "")}"></label>
      <button class="btn btn-primary block" data-a="sheet-close">Done</button>`;
  },
  bar() {
    const cur = S.profile.barSetting;
    return `${sheetTop("Bar height", "9 settings, 145–220 cm")}
      ${notice("warn", "alert", "<b>Ceiling check first.</b> At the top of a pull-up your head rises about 25–30 cm above the bar. In your photos the bar sits right up by the ceiling — measure the gap, and if it's under 30 cm drop the bar a hole or two (each hole ≈ 9 cm).")}
      <p class="t-body">Then pick the highest setting that clears the ceiling where you can dead-hang with your knees slightly bent — that also keeps them clear of the crossbar.</p>
      <div class="grid-3">${Array.from({ length: 9 }, (_, i) => i + 1).map((n) => `<button class="btn ${cur === n ? "btn-primary" : "btn-secondary"}" data-a="set-bar" data-v="${n}">
        ${n}<span class="sub">${(barHeightMm(n) / 10).toFixed(0)} cm</span></button>`).join("")}</div>`;
  },
  tower() {
    return `${sheetTop("Your tower", TOWER.model)}
      ${towerPhoto()}
      ${ASSETS.drawing ? `<details class="card drawing"><summary class="t-strong">Measured drawing with heights</summary><img src="${ASSETS.drawing}" alt="Measured drawing of the power tower with station heights" style="width:100%;height:auto;display:block;margin-top:10px"></details>` : towerSVG(null)}
      <div class="list">
        <div class="list-row"><span class="tile">${I("st-bar")}</span><div class="col"><span class="t-strong">Pull-up bar</span><span class="t-small">145–220 cm in 9 settings · straight centre + angled ends · no neutral grips</span></div></div>
        <div class="list-row"><span class="tile">${I("st-dips")}</span><div class="col"><span class="t-strong">Dip handles + arm pads</span><span class="t-small">Angled handles curving down and out = dips (≈115–120 cm) · arm pads + upright grips = knee raises</span></div></div>
        <div class="list-row"><span class="tile">${I("st-knee")}</span><div class="col"><span class="t-strong">Knee-raise station</span><span class="t-small">Foam forearm pads, back pad with 5 depth positions</span></div></div>
        <div class="list-row"><span class="tile">${I("st-push")}</span><div class="col"><span class="t-strong">Push-up handles</span><span class="t-small">Angled grips on the two front feet</span></div></div>
        <div class="list-row"><span class="tile">${I("alert")}</span><div class="col"><span class="t-strong">Limits</span><span class="t-small">Max user ${TOWER.maxKg} kg · footprint ${TOWER.footprint} · no anchor holes</span></div></div>
      </div>
      ${notice("warn", "wrench", "<b>Owners' tips:</b> it wobbles if you swing or kip, so keep reps strict. Use a mat on a flat floor, check the bolts weekly, and bend your knees behind you on pull-ups to clear the crossbar. If it still rocks, weigh down the base feet (sandbags or plates on the rear legs).")}`;
  },
  phase() {
    const ph = PHASES[S.phase - 1];
    return `${sheetTop(`Phase ${ph.n} · ${ph.name}`, `Weeks ${ph.weeks}`)}
      <p class="t-body">${ph.desc}</p>
      ${notice("brand", "lock", `<b>Gate to the next phase:</b> ${ph.gate}`)}
      <div class="grid-2">
        ${S.phase > 1 ? `<button class="btn btn-secondary" data-a="phase-down">${I("easier")}Drop back</button>` : "<span></span>"}
        ${S.phase < 4 ? `<button class="btn btn-tinted" data-tone="brand" data-a="phase-up">Advance ${I("chev-right", "sm")}</button>` : "<span></span>"}
      </div>`;
  },
  safety() {
    return `${sheetTop("Back safety")}
      <div class="list">
        <div class="list-row" data-tone="good"><span class="tile">${I("check")}</span><div class="col"><span class="t-strong">Green · good</span><span class="t-small">Train as planned. Targets go up when sessions feel OK.</span></div></div>
        <div class="list-row" data-tone="warn"><span class="tile">${I("info")}</span><div class="col"><span class="t-strong">Yellow · niggly</span><span class="t-small">FORGE trims ~40% of the volume and drops knee raises. One strength session max.</span></div></div>
        <div class="list-row" data-tone="bad"><span class="tile">${I("alert")}</span><div class="col"><span class="t-strong">Red · rough, or anything down a leg</span><span class="t-small">Spine Reset and walking only. Leg symptoms are never trained through.</span></div></div>
      </div>
      <p class="t-small">Judge yesterday's session by this morning's back. Worse morning = yesterday was too much.</p>
      <div class="card" data-tone="bad"><div class="stack"><span class="t-strong" style="color:var(--bad-ink)">See a doctor the same day if</span>${ul(RED_FLAGS)}</div></div>
      <p class="t-cap">FORGE is a training tool, not medical advice. If symptoms persist past ~6 weeks, get assessed by a physio.</p>`;
  },
  multi() {
    return `${sheetTop("Two sessions in a day")}
      <div class="list">
        <div class="list-row" data-tone="good"><span class="tile">${I("split")}</span><div class="col"><span class="t-strong">Splitting a day: yes</span><span class="t-small">Doing one day's workout as a morning half and an evening half is safe — some studies even show a small strength edge.</span></div></div>
        <div class="list-row" data-tone="warn"><span class="tile">${I("plus")}</span><div class="col"><span class="t-strong">Second full session: with care</span><span class="t-small">Other half of your body, at least 6 hours later, not on a niggly-back day. Never knee raises in both.</span></div></div>
        <div class="list-row" data-tone="bad"><span class="tile">${I("lock")}</span><div class="col"><span class="t-strong">Same muscles inside 24 h: no</span><span class="t-small">They need about a day to rebuild — that's when you actually get stronger.</span></div></div>
      </div>
      <p class="t-body">FORGE keeps count for you: about 20 hard sets a day is a big day, 26 is the ceiling, and 10–20 per muscle per week is the sweet spot. Walks and Spine Resets don't count against any of it.</p>
      <p class="t-cap">Sources: split-session studies (Häkkinen 1994, Hartman 2007), volume dose–response (Schoenfeld 2017), recovery time-course (MacDougall 1995).</p>`;
  },
  abs() {
    const kg = S.weights.length ? S.weights[S.weights.length - 1].kg : null;
    return `${sheetTop("The abs maths")}
      <p class="t-body">Visible abs are ~10–14% body fat for most men. The core work you're doing builds them; the deficit reveals them.</p>
      <div class="grid-2"><div class="stat"><span class="t-num">${kg ? `${Math.round(kg * 1.8)}–${Math.round(kg * 2.2)}g` : "1.8–2.2 g/kg"}</span><span class="t-cap">protein a day</span></div>
        <div class="stat"><span class="t-num">300–500</span><span class="t-cap">kcal deficit a day</span></div></div>
      ${ul(["Lose about 0.5–1% of bodyweight a week — faster costs strength.", "Weigh daily, judge by the weekly average.", "Take a week at maintenance every 6–8 weeks.", "If pull-up numbers drop two weeks running, eat a bit more."])}`;
  },
  guide() {
    return `${sheetTop("iPhone setup")}
      <div class="list">
        <div class="list-row"><span class="tile">${I("phone")}</span><div class="col"><span class="t-strong">1 · Add to Home Screen</span><span class="t-small">In Safari: Share → Add to Home Screen. Full-screen app, and iOS stops auto-clearing your data.</span></div></div>
        <div class="list-row"><span class="tile">${I("bell")}</span><div class="col"><span class="t-strong">2 · Calendar reminders</span><span class="t-small">Me → Reminders. Open the file and tap Add All — real alerts on training days.</span></div></div>
        <div class="list-row"><span class="tile">${I("clock")}</span><div class="col"><span class="t-strong">3 · A proper alarm</span><span class="t-small">Ask Siri: "Set a repeating alarm at ${esc(S.profile?.time || "18:00")} on weekdays called Forge."</span></div></div>
        <div class="list-row"><span class="tile">${I("timer")}</span><div class="col"><span class="t-strong">4 · During workouts</span><span class="t-small">Keep the screen on — iOS pauses web timers when it locks. FORGE saves every set, so you can always resume.</span></div></div>
        <div class="list-row"><span class="tile">${I("download")}</span><div class="col"><span class="t-strong">5 · Back up now and then</span><span class="t-small">Me → Back up my data. Ten seconds of peace of mind.</span></div></div>
      </div>
      <button class="btn btn-primary block" data-a="guide-done">Got it</button>`;
  },
  whatsnew() {
    return `${sheetTop("FORGE has a fresh look", "Same plan, your data's all here.")}
      <div class="list">
        <div class="list-row" data-tone="brand"><span class="tile">${I("play")}</span><div class="col"><span class="t-strong">One big button</span><span class="t-small">Today always shows exactly what to do next.</span></div></div>
        <div class="list-row" data-st="bar"><span class="tile">${I("moves")}</span><div class="col"><span class="t-strong">Built around your tower</span><span class="t-small">Every move shows which station to use and how to set it up.</span></div></div>
        <div class="list-row" data-tone="good"><span class="tile">${I("split")}</span><div class="col"><span class="t-strong">Split days &amp; two-a-days</span><span class="t-small">Morning + evening halves, or a second session — with research-backed limits.</span></div></div>
        <div class="list-row" data-tone="warn"><span class="tile">${I("undo")}</span><div class="col"><span class="t-strong">Never lose a session</span><span class="t-small">Every set is saved. Lock your phone, come back, resume.</span></div></div>
      </div>
      <div class="grid-2">
        <label class="field"><span class="t-cap">What should we call you?</span><input type="text" id="set-name" maxlength="30" placeholder="Name" value="${esc(S.profile.name || "")}"></label>
        <label class="field"><span class="t-cap">Usual wake time</span><input type="time" id="set-wake" value="${S.profile.wake}"></label>
      </div>
      <button class="btn btn-primary block" data-a="whatsnew-done">Let's go</button>`;
  },
  import() {
    return `${sheetTop("Restore a backup", "This replaces what's on this device.")}
      <textarea id="import-text" rows="6" placeholder="Paste the contents of a forge-backup file"></textarea>
      <label class="btn btn-secondary block" style="position:relative">${I("upload")}Choose a file<input type="file" id="import-file" accept=".json,application/json" style="position:absolute;inset:0;opacity:0"></label>
      <button class="btn btn-primary block" data-a="import-go">Restore</button>`;
  },
  copyout() { return UI.copyBody || ""; },
};

/* Copy-based fallback where downloads can't happen (home-screen app, sandboxed frames) */
function openCopySheet(name, content, label) {
  UI.copyBody = `${sheetTop(esc(label || "Your file"))}
    <p class="t-body">Downloads don't work in this mode. Copy the text and save it as <b>${esc(name)}</b>${name.endsWith(".ics") ? " — then open that file to add the events. (Or open FORGE in Safari, where the download works in one tap.)" : "."}</p>
    <textarea rows="7" readonly id="copy-src">${esc(content)}</textarea>
    <button class="btn btn-primary block" data-a="copy-text">Copy</button>`;
  openSheet("copyout");
}
