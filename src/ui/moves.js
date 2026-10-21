/* ============================================================
   MOVES — the tower is the map
   ============================================================ */

function movesList() {
  const q = UI.libQ.trim().toLowerCase();
  const rows = Object.entries(EX).filter(([id, e]) => (!UI.libSt || e.st === UI.libSt) && (!q || e.name.toLowerCase().includes(q)));
  if (!rows.length) return `<p class="t-small" style="padding:16px 0">No moves match "${esc(UI.libQ)}".</p>`;
  return rows.map(([id, e]) => `<button class="list-row" data-a="sheet" data-v="ex:${id}" data-st="${e.st}">
      <span class="tile">${I(STATIONS[e.st].icon)}</span>
      <div class="col grow"><span class="t-strong">${esc(e.name)}</span>
        <span class="t-small">${STATIONS[e.st].name}${e.phase > S.phase ? ` · unlocks in Phase ${e.phase}` : ""}${S.prs[id] ? ` · best ${e.kind.includes("sec") ? fmtClock(S.prs[id]) : S.prs[id]}` : ""}</span></div>
      ${e.phase > S.phase ? I("lock", "chev") : I("chev-right", "chev")}</button>`).join("");
}

function renderMoves() {
  const counts = Object.fromEntries(STATION_ORDER.map((s) => [s, Object.values(EX).filter((e) => e.st === s).length]));
  $app().innerHTML = `<div class="screen">
    <div class="col" style="margin-top:6px"><h1 class="t-title">Your tower</h1>
      <p class="t-small">Tap a station to see what happens there.${ASSETS.photos.tower ? ` <button class="btn-text" style="min-height:0;padding:0;font-size:inherit" data-a="sheet" data-v="tower">See it on your photo</button>` : ""}</p></div>
    <section class="card"><div class="tower-map">
      ${towerSVG(UI.libSt)}
      <div class="station-list">${STATION_ORDER.map((s) => `<button class="station-btn" data-st="${s}" data-a="lib-st" data-v="${s}" aria-pressed="${UI.libSt === s}"
        style="${UI.libSt && UI.libSt !== s ? "opacity:.55" : ""}"><span class="tile">${I(STATIONS[s].icon)}</span>${STATIONS[s].short}<span class="count">${counts[s]}</span></button>`).join("")}</div>
    </div></section>
    ${UI.libSt ? notice("brand", "info", `<b>${STATIONS[UI.libSt].name}:</b> ${TOWER_CUES[UI.libSt]} <button class="btn-text" style="min-height:0;padding:0" data-a="lib-st" data-v="">Show all</button>`) : ""}
    <div class="search">${I("search")}<input type="text" id="lib-q" placeholder="Search moves" value="${esc(UI.libQ)}" aria-label="Search moves" autocomplete="off"></div>
    <div class="list" id="lib-list">${movesList()}</div>
  </div>`;
}
