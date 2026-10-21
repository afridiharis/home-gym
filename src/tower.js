/* ============================================================
   FORGE — the tower
   Sportsroyals Power Tower YTA03 (ASIN B0DJSYBQWS). Specs and owner
   feedback: docs/redesign/research.md §3.
   ============================================================ */

const TOWER = {
  model: "Sportsroyals Power Tower YTA03",
  barMin: 1450, barMax: 2200, settings: 9,      // mm, 9 height settings
  maxKg: 150, weightKg: 20,
  footprint: "1050 × 870 mm",
};
const barHeightMm = (setting) => Math.round(TOWER.barMin + (setting - 1) * (TOWER.barMax - TOWER.barMin) / (TOWER.settings - 1));

/* The five places on (and in front of) the tower where work happens. */
const STATIONS = {
  bar:   { name: "Pull-up bar",        short: "Bar",        icon: "st-bar",
           where: "The bar at the top", go: "Go to the pull-up bar" },
  dips:  { name: "Dip handles",        short: "Dips",       icon: "st-dips",
           where: "The angled handles under the arm pads", go: "Go to the dip handles" },
  knee:  { name: "Knee-raise station", short: "Knee raise", icon: "st-knee",
           where: "Back pad + foam forearm pads", go: "Step into the knee-raise station" },
  push:  { name: "Push-up handles",    short: "Handles",    icon: "st-push",
           where: "The angled grips on the front feet", go: "Use the push-up handles" },
  floor: { name: "Floor + mat",        short: "Floor",      icon: "st-floor",
           where: "On the mat in front of the tower", go: "On the mat" },
};
const STATION_ORDER = ["bar", "dips", "knee", "push", "floor"];

/* Station line for the player: where to go + the setting that matters. */
function stationHint(st) {
  if (st === "bar") {
    const s = S.profile?.barSetting;
    return s ? `Bar on setting ${s} (${(barHeightMm(s) / 10).toFixed(0)} cm) · use the angled ends` : "Use the angled ends · strict, no swinging";
  }
  return { dips: "Legs still — the tower wobbles if you swing", knee: "Back flat on the pad, zero swing",
           push: "Hands on the front-foot grips, body one straight line", floor: "In front of the tower, no equipment needed" }[st];
}

/* Weekly tower care (owner feedback: grips loosen, bolts back off). */
function towerCheckDue() {
  const last = S.towerCheck || S.createdAt;
  return (new Date(todayKey()) - new Date(last)) / 864e5 >= 7;
}
