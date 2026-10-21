/* ============================================================
   PROGRESS — "how far you've come", never week-vs-week shame
   ============================================================ */

const LADDER_ST = { vpull: "bar", hpull: "dips", dip: "dips", push: "push", vpush: "floor", vkr: "knee", lsit: "push", squat: "floor", hinge: "floor" };

/* Sessions-until-next-rung for each ladder (2 good sessions per +1 rep, 2 more at the top). */
function nextUnlocks() {
  const out = [];
  for (const k of Object.keys(LADDERS)) {
    const t = ladderTarget(k);
    if (!t) continue;
    const L = LADDERS[k];
    if (t.idx >= L.rungs.length - 1) continue;
    const [lo, hi] = t.win;
    const ok = S.targets[t.tkey + ":ok"] || 0;
    const total = (hi - lo) * 2 + 2;
    const left = Math.max(1, (hi - t.target) * 2 + 2 - ok);
    const nx = EX[L.rungs[t.idx + 1].ex];
    out.push({ k, now: EX[t.rung.ex], next: nx, left, pct: Math.max(4, Math.round((1 - left / total) * 100)), locked: nx.phase > S.phase });
  }
  return out.sort((a, b) => a.left - b.left);
}

function cameFar(k) {
  const ids = new Set(LADDERS[k].rungs.map((r) => r.ex));
  const sets = [];
  for (const l of S.log) for (const s of l.sets || []) if (ids.has(s.ex)) sets.push({ ...s, ts: l.ts });
  if (sets.length < 2) return null;
  sets.sort((a, b) => a.ts - b.ts);
  const firstDay = sets[0].ts, lastEx = sets[sets.length - 1].ex;
  const first = sets.filter((s) => s.ts === firstDay).reduce((a, s) => (s.val > a.val ? s : a));
  const now = sets.filter((s) => s.ex === lastEx).slice(-6).reduce((a, s) => (s.val > a.val ? s : a));
  if (first.ex === now.ex && now.val <= first.val) return null;
  const fmt = (s) => `${EX[s.ex].name} × ${EX[s.ex].kind.includes("sec") ? fmtClock(s.val) : s.val}`;
  return { from: fmt(first), to: fmt(now) };
}

function renderProgress() {
  const wk = weekInfo();
  const lvl = xpLevel();
  const workouts = S.log.filter((l) => (l.type === "strength" && l.part !== 1) || l.type === "quick").length;
  const unl = nextUnlocks().slice(0, 3);
  const far = ["vpull", "dip", "push", "squat", "vkr"].map((k) => ({ k, f: cameFar(k) })).filter((x) => x.f);
  const kg = S.weights.length ? S.weights[S.weights.length - 1].kg : null;

  $app().innerHTML = `<div class="screen">
    <h1 class="t-title" style="margin-top:6px">Progress</h1>
    <section class="card hero"><div class="big-ring">
      <div class="center">${ringSVG(wk.done, wk.target, "ring big", 6)}<span class="t-num">${wk.done}/${wk.target}</span></div>
      <div class="col grow"><span class="t-cap">This week</span>
        <span class="t-head">${wk.done >= wk.target ? "Week goal hit!" : `${plural(wk.target - wk.done, "workout")} to go`}</span>
        <span class="t-small">${wk.streak ? `${plural(wk.streak, "week")} in a row` : "Hit this week's goal to start a week streak"}</span></div>
    </div>
    <div class="stat-row">
      <div class="stat"><span class="t-num">${S.streak.current}</span><span class="t-cap">day streak</span></div>
      <div class="stat"><span class="t-num">${wk.activeDays}</span><span class="t-cap">active days</span></div>
      <div class="stat"><span class="t-num">${workouts}</span><span class="t-cap">workouts</span></div>
    </div>
    <button class="list-row" data-a="sheet" data-v="level" style="min-height:48px;padding:0">
      <span class="tile" data-tone="brand">${I("star")}</span><div class="col grow"><span class="t-strong">Level ${lvl.lv} · ${lvl.name}</span>
      <div class="unlock-bar" data-tone="brand"><i style="width:${lvl.pct}%"></i></div></div>${I("chev-right", "chev")}</button>
    </section>

    ${unl.length ? `<h2 class="section-title">Next unlocks</h2><div class="list">${unl.map((u) => `
      <button class="list-row" data-a="sheet" data-v="ladder:${u.k}" data-st="${LADDER_ST[u.k]}">
        <span class="tile">${I(STATIONS[LADDER_ST[u.k]].icon)}</span>
        <div class="col grow"><span class="t-strong">${esc(u.next.name)}${u.locked ? ` · Phase ${u.next.phase}` : ""}</span>
          <span class="t-small">About ${plural(u.left, "strong session")} away (now: ${esc(u.now.name)})</span>
          <div class="unlock-bar"><i style="width:${u.pct}%"></i></div></div>${I("chev-right", "chev")}</button>`).join("")}</div>` : ""}

    ${far.length ? `<h2 class="section-title">How far you've come</h2><div class="list">${far.map(({ k, f }) => `
      <div class="list-row" data-st="${LADDER_ST[k]}"><span class="tile">${I(STATIONS[LADDER_ST[k]].icon)}</span>
      <div class="col grow"><span class="t-small">Started: ${esc(f.from)}</span><span class="t-strong">Now: ${esc(f.to)}</span></div></div>`).join("")}</div>` : ""}

    <h2 class="section-title">Calendar</h2>
    <section class="card">${calendar()}</section>

    <h2 class="section-title">Bodyweight & abs</h2>
    <section class="card"><div class="stack">
      ${S.weights.length >= 2 ? weightSpark() : ""}
      <div class="row between"><div class="col"><span class="t-strong">${kg ? `${kg} kg` : "No weight logged yet"}</span>
        <span class="t-small">${kg ? `Protein ${Math.round(kg * 1.8)}–${Math.round(kg * 2.2)} g a day · lose ${(kg * 0.005).toFixed(1)}–${(kg * 0.01).toFixed(1)} kg a week` : "Log it to get your protein and deficit targets"}</span></div>
        <button class="btn btn-tinted btn-sm" data-tone="brand" data-a="sheet" data-v="weight">Log</button></div>
      <p class="t-small">Visible abs ≈ 10–14% body fat. That's a 300–500 kcal daily deficit plus the core work you're already doing — no crunches needed.</p>
    </div></section>

    <h2 class="section-title">Badges</h2>
    <section class="card"><div class="badges">${BADGES.map((b) => `<div class="badge ${S.badges.includes(b.id) ? "got" : ""}">
      <span class="med">${I(BADGE_ICONS[b.id] || "star")}</span>${b.name}</div>`).join("")}</div></section>
  </div>`;
}

function calendar() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + (UI.calOffset || 0), 1);
  const lead = (base.getDay() + 6) % 7;
  const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const cells = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span class="dow">${d}</span>`);
  for (let i = 0; i < lead; i++) cells.push(`<span class="d empty"></span>`);
  for (let d = 1; d <= days; d++) {
    const key = dkey(new Date(base.getFullYear(), base.getMonth(), d));
    const logs = sessionsOn(key);
    const cls = logs.some(countsForWeek) ? "s" : logs.length ? "l" : S.pain[key] === "red" ? "p" : S.streak.frozen[key] ? "f" : "";
    cells.push(`<span class="d ${cls} ${key === todayKey() ? "today" : ""}" aria-label="${fmtDate(key)}: ${logs.length ? esc(logs.map((l) => l.name).join(", ")) : cls === "p" ? "rough back day" : cls === "f" ? "streak freeze" : "rest"}">${d}</span>`);
  }
  return `<div class="stack">
    <div class="row between"><button class="btn-icon" data-a="cal" data-v="-1" aria-label="Previous month">${I("chev-left", "sm")}</button>
      <span class="t-strong">${base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
      <button class="btn-icon" data-a="cal" data-v="1" aria-label="Next month" ${UI.calOffset >= 0 ? "disabled" : ""}>${I("chev-right", "sm")}</button></div>
    <div class="cal">${cells.join("")}</div>
    <div class="legend"><span><i style="background:var(--brand)"></i>Workout</span><span><i style="background:var(--brand-tint)"></i>Spine / walk</span>
      <span><i style="background:var(--bad-tint)"></i>Rough-back pause</span><span><i style="background:var(--bar-tint)"></i>Freeze</span></div>
  </div>`;
}

function weightSpark() {
  const data = S.weights.slice(-30);
  const W = 320, Hh = 80, pad = 6;
  const v = data.map((d) => d.kg), mn = Math.min(...v), mx = Math.max(...v), span = Math.max(0.5, mx - mn);
  const px = (i) => pad + (i / Math.max(1, data.length - 1)) * (W - pad * 2);
  const py = (k) => pad + (1 - (k - mn) / span) * (Hh - pad * 2);
  const d = data.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(p.kg).toFixed(1)}`).join("");
  const area = `${d}L${px(data.length - 1).toFixed(1)},${Hh}L${px(0)},${Hh}Z`;
  const last = data[data.length - 1];
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Bodyweight trend, ${data[0].kg} to ${last.kg} kg">
    <path d="${area}" fill="var(--knee-tint)"/><path d="${d}" fill="none" stroke="var(--knee-ink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${px(data.length - 1)}" cy="${py(last.kg)}" r="5" fill="var(--knee-ink)" stroke="var(--surface)" stroke-width="2"/></svg>`;
}
