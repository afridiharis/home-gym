/* ============================================================
   ME — schedule, the tower, the plan, reminders, backup
   ============================================================ */

function rowBtn(icon, tone, title, sub, action, v = "") {
  return `<button class="list-row" data-a="${action}" data-v="${v}" ${tone}><span class="tile">${I(icon)}</span>
    <div class="col grow"><span class="t-strong">${title}</span>${sub ? `<span class="t-small">${sub}</span>` : ""}</div>${I("chev-right", "chev")}</button>`;
}

function renderMe() {
  const p = S.profile;
  const ph = PHASES[S.phase - 1];
  const days = p.trainDays.map((d) => DAYS[d]).join(", ");
  $app().innerHTML = `<div class="screen">
    <div class="row" style="margin-top:6px">
      <span style="width:44px;height:44px;display:block">${MARK_SVG}</span>
      <div class="col"><h1 class="t-title">${p.name ? esc(p.name) : "Me"}</h1><span class="t-small">Level ${xpLevel().lv} · ${S.xp} XP</span></div>
    </div>

    <h2 class="section-title">Your week</h2>
    <div class="list">
      ${rowBtn("calendar", 'data-tone="brand"', "Training days", `${days} · ${p.weeklyTarget} a week`, "sheet", "schedule")}
      ${rowBtn("clock", 'data-tone="brand"', "Times", `Usually ${p.time} · wake around ${p.wake}`, "sheet", "schedule")}
    </div>

    <h2 class="section-title">Your tower</h2>
    <div class="list">
      ${rowBtn("st-bar", 'data-st="bar"', "Bar height", p.barSetting ? `Setting ${p.barSetting} of 9 · ${(barHeightMm(p.barSetting) / 10).toFixed(0)} cm` : "Not set yet — makes the player more precise", "sheet", "bar")}
      ${rowBtn("wrench", 'data-st="floor"', "Tower check", S.towerCheck ? `Last done ${fmtDate(S.towerCheck)}` : "Tighten bolts weekly; weigh the feet if it rocks", "tower-checked")}
      ${rowBtn("moves", 'data-st="floor"', "Tower details", `${TOWER.model} · max ${TOWER.maxKg} kg`, "sheet", "tower")}
      ${ASSETS.poster ? `<a class="list-row" href="${ASSETS.poster}" target="_blank" rel="noopener" data-st="push"><span class="tile">${I("book")}</span>
        <div class="col grow"><span class="t-strong">Wall chart (A3)</span><span class="t-small">Print it and stick it by the tower</span></div>${I("download", "chev")}</a>` : ""}
    </div>

    <h2 class="section-title">Your plan</h2>
    <div class="list">
      ${rowBtn("progress", 'data-tone="brand"', `Phase ${ph.n} · ${ph.name}`, "Where you are and what unlocks next", "sheet", "phase")}
      ${rowBtn("spine", 'data-tone="bad"', "Back safety", "Traffic-light rules and when to see a doctor", "sheet", "safety")}
      ${rowBtn("split", 'data-tone="good"', "Two sessions in a day", "What's healthy, and how FORGE keeps it that way", "sheet", "multi")}
      ${rowBtn("heart", 'data-tone="good"', "The abs maths", "Protein, deficit, and why no crunches", "sheet", "abs")}
    </div>

    <h2 class="section-title">Reminders</h2>
    <div class="list">
      ${rowBtn("bell", 'data-tone="brand"', "Add training days to Calendar", `Real iPhone alerts ${S.settings.alertMin ? S.settings.alertMin + " min before" : "on time"}`, "ics-schedule")}
      ${rowBtn("spine", 'data-st="floor"', "Daily Spine Reset reminder", "One calendar alert a day", "ics-spine")}
      ${rowBtn("phone", 'data-tone="brand"', "iPhone setup guide", "Home screen, alarms, keeping data safe", "sheet", "guide")}
    </div>

    <h2 class="section-title">App</h2>
    <div class="list">
      <div class="list-row"><span class="tile">${I(S.settings.sound ? "sound" : "sound-off")}</span><div class="col grow"><span class="t-strong">Sounds</span><span class="t-small">Timer cues and celebrations</span></div>
        <label class="toggle"><input type="checkbox" id="set-sound" ${S.settings.sound ? "checked" : ""} aria-label="Sounds"><span class="tr"></span><span class="th"></span></label></div>
      <div class="list-row"><span class="tile">${I("today")}</span><div class="col grow"><span class="t-strong">Appearance</span>
        <div class="seg" style="margin-top:6px">${["auto", "light", "dark"].map((t) => `<button data-a="set-theme" data-v="${t}" class="${S.settings.theme === t ? "on" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div></div></div>
      <div class="list-row"><span class="tile">${I("timer")}</span><div class="col grow"><span class="t-strong">Rest after main lifts</span>
        <div class="seg" style="margin-top:6px">${[90, 120, 150, 180].map((v) => `<button data-a="set-rest" data-v="${v}" class="${S.settings.restMain === v ? "on" : ""}">${v}s</button>`).join("")}</div></div></div>
      ${rowBtn("download", "", "Back up my data", "Saves a file you can import later", "export-data")}
      ${rowBtn("upload", "", "Restore a backup", "", "sheet", "import")}
      ${RESCUE_RAW ? rowBtn("alert", 'data-tone="warn"', "Rescue old data", "Show the data that couldn't be read", "rescue-dump") : ""}
    </div>
    <button class="btn btn-text" data-a="reset-all" style="color:var(--bad-ink)">Reset everything</button>
    <p class="t-cap" style="text-align:center">FORGE · built for your tower and your back · not medical advice</p>
  </div>`;
}
