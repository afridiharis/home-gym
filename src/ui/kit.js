/* ============================================================
   FORGE UI kit — shared helpers. Event delegation via data-a.
   ============================================================ */

const UI = { screen: "today", sheet: null, ob: { step: 0 }, session: null, rest: null, timer: null, restTimer: null,
  libQ: "", libSt: null, done: null, confirmCfg: null, pendingConfirm: null };

const $app = () => document.getElementById("app");
const I = (name, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const kindUnit = (ex, n) => ex.kind === "secs" || ex.kind === "secside" ? (n === 1 ? "second" : "seconds") : (n === 1 ? "rep" : "reps");
const sideNote = (ex) => ex.kind === "perside" || ex.kind === "secside" ? " each side" : "";
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Late one" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

function showToast(msg) {
  document.getElementById("toast")?.remove();
  const t = document.createElement("div");
  t.id = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function confetti(n = 90) {
  const colors = ["var(--brand)", "var(--bar)", "var(--knee)", "var(--push)", "var(--dips)", "var(--warn)"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    const s = 6 + Math.random() * 7;
    c.style.cssText = `left:${Math.random() * 100}vw;width:${s}px;height:${s * (0.5 + Math.random())}px;background:${colors[i % colors.length]};animation-duration:${1.4 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.4}s;`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}

/* Tower illustration (VectorCraft art, inlined by the build). Highlight one station, dim the rest. */
function towerSVG(active, cls = "") {
  let svg = TOWER_SVG.replace("<svg", `<svg class="tower ${cls}" role="img" aria-label="Power tower${active ? ", " + STATIONS[active].name + " highlighted" : ""}"`);
  if (active) svg = svg.replace(/class="tw-(bar|dips|knee|push|floor)"/g, (m, st) => st === active ? m : `class="tw-${st} dim"`);
  return svg;
}
function stationChip(st) {
  return `<span class="chip" data-st="${st}">${I(STATIONS[st].icon)}${STATIONS[st].short}</span>`;
}
// a developed photo from ASSETS.photos: AVIF first, JPEG fallback, real size so nothing jumps
function photoTag(ph, alt) {
  return `<picture>${ph.avif ? `<source srcset="${ph.avif}" type="image/avif">` : ""}<img src="${ph.jpg}" width="${ph.w}" height="${ph.h}" alt="${esc(alt)}"></picture>`;
}
// the user's own tower with each station pinned where it is (positions are fractions of the photo)
const TOWER_PINS = [["bar", 0.5, 0.115], ["knee", 0.5, 0.445], ["dips", 0.2, 0.725], ["push", 0.5, 0.955, "Handles ↓ front feet"]];
function towerPhoto() {
  const ph = ASSETS.photos.tower;
  if (!ph) return "";
  return `<figure class="tower-photo">${photoTag(ph, "Your power tower, with each station labelled")}
    ${TOWER_PINS.map(([st, x, y, label]) => `<span class="chip pin" data-st="${st}" style="left:${x * 100}%;top:${y * 100}%">${I(STATIONS[st].icon)}${label || STATIONS[st].short}</span>`).join("")}</figure>`;
}
function ringSVG(done, total, cls = "ring", stroke = 7) {
  const r = 22, c = 2 * Math.PI * r, pct = total ? Math.min(1, done / total) : 0;
  return `<svg class="${cls}" viewBox="0 0 54 54" aria-hidden="true"><circle class="track" cx="27" cy="27" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="fill" cx="27" cy="27" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg>`;
}
function notice(tone, icon, html) { // tone: good|warn|bad|brand, or "st:bar" to tint by station
  const attr = tone.startsWith("st:") ? `data-st="${tone.slice(3)}"` : `data-tone="${tone}"`;
  return `<div class="notice" ${attr}>${I(icon)}<div>${html}</div></div>`;
}
const toneOf = { green: "good", yellow: "warn", red: "bad" };
const painLabel = { green: "Good", yellow: "Niggly", red: "Rough" };

/* Stations a session uses, in order of first appearance. */
function stationsOf(items) {
  const seen = [];
  for (const it of items) if (!it.warmup && !seen.includes(it.ex.st)) seen.push(it.ex.st);
  return seen;
}

/* Sheets */
function openSheet(kind) { UI.sheet = kind; renderSheet(); }
function closeSheet() {
  UI.sheet = null; UI.pendingConfirm = null;
  stopDemo();
  document.querySelector(".sheet-backdrop")?.remove();
}
function askConfirm(cfg) { UI.confirmCfg = cfg; UI.pendingConfirm = cfg.onYes || null; openSheet("confirm"); }

/* Theme: data-theme overrides prefers-color-scheme in both directions. */
function applyTheme() {
  const t = S.settings.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = dark ? "#0E1320" : "#F4F6FA"; });
}
