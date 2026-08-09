/* ============================================================
   FORGE — animated exercise demos
   Tiny stick-figure engine: poses are joint coordinates in a
   120x100 viewBox, tweened with rAF. No video, no network.
   Pose: {hd,nk,hp,el,ha,kn,an} (+el2,ha2,kn2,an2 for asymmetric
   moves — omitted sides are auto-offset for depth).
   ============================================================ */

const DPROP = {
  floor: '<line x1="6" y1="88" x2="114" y2="88"/>',
  bar: '<line x1="24" y1="10" x2="96" y2="10"/>',
  handles: '<line x1="42" y1="46" x2="60" y2="46"/><line x1="64" y1="46" x2="82" y2="46"/>',
  lowHandles: '<line x1="46" y1="64" x2="58" y2="64"/><line x1="62" y1="64" x2="74" y2="64"/>',
  wall: '<line x1="72" y1="6" x2="72" y2="88"/>',
  box: '<rect x="18" y="70" width="20" height="18" rx="2"/>',
  boxR: '<rect x="62" y="70" width="22" height="18" rx="2"/>',
  step: '<rect x="36" y="84" width="48" height="4" rx="1"/>',
  vkr: '<rect x="42" y="22" width="5" height="40" rx="2"/><line x1="44" y1="38" x2="72" y2="38"/>',
  post: '<line x1="90" y1="16" x2="90" y2="88"/>',
  weight: '<rect x="70" y="64" width="9" height="11" rx="1"/>',
};

const DEMOS = {
  deadhang: { props: [DPROP.bar, DPROP.floor], dur: 1400, poses: [
    { hd: [60, 30], nk: [60, 40], hp: [60, 62], el: [60, 26], ha: [60, 11], kn: [60, 74], an: [60, 84] },
    { hd: [60, 32], nk: [60, 42], hp: [60, 65], el: [60, 27], ha: [60, 11], kn: [60, 76], an: [60, 86] },
  ]},
  scapPull: { props: [DPROP.bar, DPROP.floor], dur: 1100, poses: [
    { hd: [60, 33], nk: [60, 43], hp: [60, 65], el: [60, 28], ha: [60, 11], kn: [60, 76], an: [60, 86] },
    { hd: [60, 28], nk: [60, 38], hp: [60, 60], el: [60, 25], ha: [60, 11], kn: [60, 72], an: [60, 82] },
  ]},
  pullup: { props: [DPROP.bar, DPROP.floor], dur: 1300, poses: [
    { hd: [60, 30], nk: [60, 40], hp: [60, 62], el: [60, 26], ha: [60, 11], kn: [59, 74], an: [60, 84] },
    { hd: [63, 9], nk: [61, 18], hp: [60, 44], el: [70, 18], ha: [60, 11], kn: [56, 58], an: [58, 72] },
  ]},
  hangKnee: { props: [DPROP.bar, DPROP.floor], dur: 1300, poses: [
    { hd: [60, 30], nk: [60, 40], hp: [60, 62], el: [60, 26], ha: [60, 11], kn: [60, 74], an: [60, 84] },
    { hd: [60, 30], nk: [60, 40], hp: [59, 62], el: [60, 26], ha: [60, 11], kn: [72, 52], an: [67, 64] },
  ]},
  hangLeg: { props: [DPROP.bar, DPROP.floor], dur: 1500, poses: [
    { hd: [60, 30], nk: [60, 40], hp: [60, 62], el: [60, 26], ha: [60, 11], kn: [60, 74], an: [60, 84] },
    { hd: [60, 30], nk: [60, 40], hp: [58, 62], el: [60, 26], ha: [60, 11], kn: [73, 62], an: [86, 61] },
  ]},
  dipSupport: { props: [DPROP.handles, DPROP.floor], dur: 1500, poses: [
    { hd: [60, 16], nk: [60, 26], hp: [58, 50], el: [61, 36], ha: [62, 46], kn: [55, 64], an: [57, 78] },
    { hd: [60, 17], nk: [60, 27], hp: [58, 51], el: [61, 37], ha: [62, 46], kn: [55, 65], an: [57, 79] },
  ]},
  dip: { props: [DPROP.handles, DPROP.floor], dur: 1400, poses: [
    { hd: [60, 16], nk: [60, 26], hp: [58, 50], el: [61, 36], ha: [62, 46], kn: [55, 64], an: [57, 78] },
    { hd: [63, 26], nk: [61, 35], hp: [56, 58], el: [72, 38], ha: [62, 46], kn: [52, 70], an: [55, 82] },
  ]},
  row: { props: [DPROP.handles, DPROP.floor], dur: 1300, poses: [
    { hd: [70, 62], nk: [62, 66], hp: [44, 78], el: [60, 56], ha: [61, 47], kn: [30, 80], an: [22, 87] },
    { hd: [69, 50], nk: [61, 54], hp: [43, 72], el: [55, 50], ha: [61, 47], kn: [30, 79], an: [22, 87] },
  ]},
  pushup: { props: [DPROP.floor], dur: 1300, poses: [
    { hd: [76, 52], nk: [68, 58], hp: [46, 68], el: [69, 72], ha: [70, 87], kn: [33, 75], an: [20, 84] },
    { hd: [75, 66], nk: [67, 70], hp: [44, 77], el: [79, 76], ha: [70, 87], kn: [32, 81], an: [20, 86] },
  ]},
  pike: { props: [DPROP.floor], dur: 1400, poses: [
    { hd: [75, 66], nk: [70, 60], hp: [48, 40], el: [73, 74], ha: [76, 87], kn: [37, 60], an: [27, 84] },
    { hd: [77, 78], nk: [72, 70], hp: [50, 46], el: [81, 79], ha: [76, 87], kn: [39, 64], an: [27, 84] },
  ]},
  wallHS: { props: [DPROP.wall, DPROP.floor], dur: 1600, poses: [
    { hd: [60, 70], nk: [60, 60], hp: [61, 36], el: [60, 74], ha: [60, 87], kn: [63, 22], an: [65, 10] },
    { hd: [60, 71], nk: [60, 61], hp: [62, 37], el: [60, 75], ha: [60, 87], kn: [64, 23], an: [66, 11] },
  ]},
  hspu: { props: [DPROP.wall, DPROP.floor], dur: 1500, poses: [
    { hd: [60, 70], nk: [60, 60], hp: [61, 36], el: [60, 74], ha: [60, 87], kn: [63, 22], an: [65, 10] },
    { hd: [60, 79], nk: [60, 70], hp: [61, 46], el: [70, 78], ha: [60, 87], kn: [63, 30], an: [66, 16] },
  ]},
  vkr: { props: [DPROP.vkr, DPROP.floor], dur: 1300, poses: [
    { hd: [50, 16], nk: [50, 26], hp: [50, 52], el: [58, 38], ha: [68, 38], kn: [52, 68], an: [52, 84] },
    { hd: [50, 16], nk: [50, 26], hp: [50, 52], el: [58, 38], ha: [68, 38], kn: [68, 50], an: [63, 64] },
  ]},
  catcamel: { props: [DPROP.floor], dur: 1500, poses: [
    { hd: [76, 58], nk: [68, 54], hp: [40, 56], el: [72, 70], ha: [74, 87], kn: [34, 87], an: [18, 87] },
    { hd: [80, 52], nk: [68, 62], hp: [40, 64], el: [72, 72], ha: [74, 87], kn: [34, 87], an: [18, 87] },
  ]},
  curlup: { props: [DPROP.floor], dur: 1600, poses: [
    { hd: [17, 78], nk: [27, 80], hp: [52, 82], el: [40, 84], ha: [48, 84], kn: [66, 68], an: [72, 86], kn2: [30, 84], an2: [14, 86] },
    { hd: [19, 71], nk: [29, 76], hp: [52, 82], el: [40, 84], ha: [48, 84], kn: [66, 68], an: [72, 86], kn2: [30, 84], an2: [14, 86] },
  ]},
  sideplank: { props: [DPROP.floor], dur: 1500, poses: [
    { hd: [36, 62], nk: [38, 70], hp: [58, 78], el: [34, 87], ha: [44, 87], kn: [68, 82], an: [80, 87] },
    { hd: [36, 58], nk: [38, 66], hp: [58, 70], el: [34, 87], ha: [44, 87], kn: [68, 78], an: [80, 87] },
  ]},
  birddog: { props: [DPROP.floor], dur: 1600, poses: [
    { hd: [76, 54], nk: [68, 56], hp: [40, 58], el: [70, 71], ha: [72, 87], el2: [66, 71], ha2: [64, 87], kn: [36, 87], an: [22, 87], kn2: [42, 87], an2: [30, 87] },
    { hd: [78, 50], nk: [68, 54], hp: [40, 56], el: [82, 52], ha: [94, 50], el2: [66, 70], ha2: [64, 87], kn: [22, 58], an: [8, 56], kn2: [42, 87], an2: [30, 87] },
  ]},
  plank: { props: [DPROP.floor], dur: 1600, poses: [
    { hd: [74, 56], nk: [66, 61], hp: [44, 69], el: [72, 87], ha: [82, 87], kn: [32, 77], an: [20, 85] },
    { hd: [74, 57], nk: [66, 62], hp: [44, 70], el: [72, 87], ha: [82, 87], kn: [32, 78], an: [20, 86] },
  ]},
  deadbug: { props: [DPROP.floor], dur: 1600, poses: [
    { hd: [17, 78], nk: [27, 80], hp: [52, 82], el: [31, 68], ha: [33, 56], el2: [36, 82], ha2: [44, 84], kn: [62, 66], an: [56, 54], kn2: [66, 70], an2: [72, 86] },
    { hd: [17, 78], nk: [27, 80], hp: [52, 82], el: [20, 70], ha: [10, 64], el2: [36, 82], ha2: [44, 84], kn: [72, 72], an: [86, 76], kn2: [66, 70], an2: [72, 86] },
  ]},
  hollow: { props: [DPROP.floor], dur: 1500, poses: [
    { hd: [19, 66], nk: [29, 71], hp: [54, 78], el: [18, 62], ha: [8, 56], kn: [72, 70], an: [86, 62] },
    { hd: [21, 68], nk: [31, 73], hp: [54, 78], el: [20, 64], ha: [10, 58], kn: [74, 72], an: [88, 64] },
  ]},
  gluteBridge: { props: [DPROP.floor], dur: 1400, poses: [
    { hd: [16, 82], nk: [26, 82], hp: [50, 82], el: [36, 85], ha: [44, 85], kn: [64, 66], an: [68, 85] },
    { hd: [16, 82], nk: [26, 81], hp: [50, 66], el: [36, 85], ha: [44, 85], kn: [64, 62], an: [68, 85] },
  ]},
  hipThrust: { props: [DPROP.box, DPROP.floor], dur: 1400, poses: [
    { hd: [14, 64], nk: [24, 69], hp: [46, 80], el: [32, 78], ha: [40, 82], kn: [62, 66], an: [66, 85] },
    { hd: [12, 60], nk: [23, 64], hp: [47, 66], el: [32, 72], ha: [40, 74], kn: [63, 62], an: [66, 85] },
  ]},
  slideCurl: { props: [DPROP.floor], dur: 1500, poses: [
    { hd: [16, 82], nk: [26, 81], hp: [50, 68], el: [36, 85], ha: [44, 85], kn: [64, 62], an: [68, 85] },
    { hd: [16, 82], nk: [26, 82], hp: [50, 74], el: [36, 85], ha: [44, 85], kn: [80, 74], an: [92, 82] },
  ]},
  squat: { props: [DPROP.floor], dur: 1400, poses: [
    { hd: [60, 20], nk: [60, 29], hp: [60, 54], el: [62, 42], ha: [63, 52], kn: [60, 71], an: [60, 86] },
    { hd: [58, 38], nk: [56, 46], hp: [51, 66], el: [68, 50], ha: [78, 52], kn: [66, 72], an: [60, 86] },
  ]},
  splitSquat: { props: [DPROP.floor], dur: 1400, poses: [
    { hd: [60, 22], nk: [60, 31], hp: [59, 56], el: [61, 44], ha: [62, 54], kn: [70, 70], an: [75, 86], kn2: [48, 72], an2: [43, 86] },
    { hd: [60, 32], nk: [60, 41], hp: [58, 64], el: [61, 52], ha: [62, 62], kn: [72, 74], an: [75, 86], kn2: [47, 80], an2: [42, 87] },
  ]},
  bulgSquat: { props: [DPROP.box, DPROP.floor], dur: 1400, poses: [
    { hd: [64, 24], nk: [64, 33], hp: [62, 57], el: [66, 46], ha: [67, 56], kn: [72, 71], an: [76, 86], kn2: [46, 74], an2: [28, 69] },
    { hd: [63, 34], nk: [62, 43], hp: [60, 66], el: [65, 54], ha: [66, 64], kn: [74, 75], an: [76, 86], kn2: [45, 82], an2: [28, 69] },
  ]},
  pistolAsst: { props: [DPROP.post, DPROP.floor], dur: 1600, poses: [
    { hd: [60, 22], nk: [60, 31], hp: [59, 56], el: [74, 38], ha: [88, 40], kn: [60, 71], an: [60, 86], kn2: [70, 62], an2: [80, 64] },
    { hd: [58, 42], nk: [57, 50], hp: [54, 70], el: [74, 46], ha: [88, 48], kn: [64, 78], an: [60, 86], kn2: [74, 68], an2: [88, 66] },
  ]},
  calfRaise: { props: [DPROP.step, DPROP.floor], dur: 1200, poses: [
    { hd: [60, 24], nk: [60, 33], hp: [60, 58], el: [62, 46], ha: [63, 56], kn: [60, 72], an: [60, 84] },
    { hd: [60, 19], nk: [60, 28], hp: [60, 53], el: [62, 41], ha: [63, 51], kn: [60, 68], an: [60, 80] },
  ]},
  slRDL: { props: [DPROP.floor], dur: 1600, poses: [
    { hd: [60, 22], nk: [60, 31], hp: [59, 56], el: [62, 44], ha: [63, 54], kn: [60, 71], an: [60, 86], kn2: [56, 72], an2: [52, 86] },
    { hd: [84, 46], nk: [76, 50], hp: [57, 56], el: [74, 60], ha: [72, 68], kn: [60, 71], an: [60, 86], kn2: [40, 62], an2: [26, 68] },
  ]},
  suitcase: { props: [DPROP.floor], dur: 1300, poses: [
    { hd: [60, 20], nk: [60, 29], hp: [60, 54], el: [72, 44], ha: [74, 58], el2: [50, 44], ha2: [48, 54], kn: [66, 70], an: [70, 86], kn2: [54, 71], an2: [50, 86] },
    { hd: [60, 20], nk: [60, 29], hp: [60, 54], el: [72, 44], ha: [74, 58], el2: [50, 44], ha2: [48, 54], kn: [54, 70], an: [48, 86], kn2: [66, 71], an2: [72, 86] },
  ]},
  palloff: { props: [DPROP.post, DPROP.floor], dur: 1400, poses: [
    { hd: [56, 20], nk: [56, 29], hp: [56, 54], el: [64, 40], ha: [68, 44], kn: [58, 71], an: [56, 86], kn2: [50, 71], an2: [48, 86] },
    { hd: [56, 20], nk: [56, 29], hp: [56, 54], el: [70, 42], ha: [82, 44], kn: [58, 71], an: [56, 86], kn2: [50, 71], an2: [48, 86] },
  ]},
  walkDemo: { props: [DPROP.floor], dur: 900, poses: [
    { hd: [60, 20], nk: [60, 29], hp: [60, 54], el: [68, 42], ha: [72, 50], el2: [52, 42], ha2: [48, 50], kn: [68, 69], an: [74, 86], kn2: [53, 71], an2: [46, 86] },
    { hd: [60, 20], nk: [60, 29], hp: [60, 54], el: [52, 42], ha: [48, 50], el2: [68, 42], ha2: [72, 50], kn: [53, 71], an: [46, 86], kn2: [68, 69], an2: [74, 86] },
  ]},
  lsit: { props: [DPROP.lowHandles, DPROP.floor], dur: 1600, poses: [
    { hd: [56, 30], nk: [57, 39], hp: [57, 62], el: [59, 52], ha: [60, 64], kn: [73, 60], an: [87, 58] },
    { hd: [56, 31], nk: [57, 40], hp: [57, 63], el: [59, 53], ha: [60, 64], kn: [73, 61], an: [87, 59] },
  ]},
  lsitTuck: { props: [DPROP.lowHandles, DPROP.floor], dur: 1500, poses: [
    { hd: [56, 30], nk: [57, 39], hp: [57, 62], el: [59, 52], ha: [60, 64], kn: [70, 52], an: [72, 64] },
    { hd: [56, 31], nk: [57, 40], hp: [57, 63], el: [59, 53], ha: [60, 64], kn: [70, 53], an: [72, 65] },
  ]},
  lsitFoot: { props: [DPROP.lowHandles, DPROP.floor], dur: 1600, poses: [
    { hd: [56, 30], nk: [57, 39], hp: [57, 62], el: [59, 52], ha: [60, 64], kn: [74, 68], an: [86, 84] },
    { hd: [56, 29], nk: [57, 38], hp: [57, 61], el: [59, 51], ha: [60, 64], kn: [74, 67], an: [86, 84] },
  ]},
  hinge: { props: [DPROP.floor], dur: 1600, poses: [
    { hd: [60, 22], nk: [60, 31], hp: [59, 56], el: [60, 44], ha: [60, 54], kn: [60, 71], an: [60, 86] },
    { hd: [80, 42], nk: [73, 47], hp: [54, 58], el: [72, 58], ha: [70, 66], kn: [58, 72], an: [60, 86] },
  ]},
};

/* exercise id → demo id */
const DEMO_MAP = {
  deadhang: "deadhang", scapPull: "scapPull",
  negPullup: "pullup", asstPullup: "pullup", chinup: "pullup", pullup: "pullup",
  ctbPullup: "pullup", archPullup: "pullup", wtdPullup: "pullup",
  hangKnee: "hangKnee", hangLeg: "hangLeg",
  dipSupport: "dipSupport", dipNeg: "dip", dipPartial: "dip", dip: "dip", dipSlow: "dip", wtdDip: "dip",
  rowBent: "row", rowStraight: "row", rowElev: "row", rowArcher: "row",
  pushIncline: "pushup", pushup: "pushup", pushDecline: "pushup", pushDiamond: "pushup",
  pushArcher: "pushup", pushPseudo: "pushup",
  pikePush: "pike", pikeElev: "pike", wallHS: "wallHS", hspuNeg: "hspu", hspu: "hspu",
  vkrBent: "vkr", vkrChest: "vkr", vkrStraight: "vkr",
  catcamel: "catcamel", curlup: "curlup", sideplank: "sideplank", birddog: "birddog",
  plank: "plank", deadbug: "deadbug", hollowBent: "hollow", hollow: "hollow",
  palloff: "palloff", suitcase: "suitcase",
  lsitFoot: "lsitFoot", lsitTuck: "lsitTuck", lsitOne: "lsit", lsitFull: "lsit",
  squatAsst: "squat", squat: "squat", splitSquat: "splitSquat", bulgSquat: "bulgSquat",
  stepup: "bulgSquat", pistolAsst: "pistolAsst",
  gluteBridge: "gluteBridge", slBridge: "gluteBridge", hipThrust: "hipThrust", slHipThrust: "hipThrust",
  slideCurl: "slideCurl", slRDL: "slRDL", calfRaise: "calfRaise", hipHingeDrill: "hinge", walk: "walkDemo",
};

const DEMO_SIDE_OFFSET = [4, 2];
function demoFlat(p) {
  const o = DEMO_SIDE_OFFSET;
  const d2 = (a, b) => p[a] ? p[a] : [p[b][0] + o[0], p[b][1] + o[1]];
  return [p.hd, p.nk, p.hp, p.el, p.ha, d2("el2", "el"), d2("ha2", "ha"), p.kn, p.an, d2("kn2", "kn"), d2("an2", "an")];
}

let demoRAF = null;
function stopDemo() { if (demoRAF) { cancelAnimationFrame(demoRAF); demoRAF = null; } }

function mountDemo(container, exId, size) {
  const id = DEMO_MAP[exId];
  const demo = id && DEMOS[id];
  if (!demo || !container) return false;
  const w = size || 168;
  container.innerHTML = `
    <svg viewBox="0 0 120 100" width="${w}" height="${Math.round(w * 100 / 120)}" style="display:block">
      <g stroke="var(--ink-3)" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55">${demo.props.join("")}</g>
      <g id="d-far" stroke="var(--ink-3)" stroke-width="3" stroke-linecap="round" fill="none">
        <path id="d-armB" /><path id="d-legB" />
      </g>
      <g stroke="var(--ink)" stroke-width="3.2" stroke-linecap="round" fill="none">
        <path id="d-torso" /><path id="d-armA" /><path id="d-legA" />
      </g>
      <circle id="d-head" r="5.6" fill="var(--ink)" />
    </svg>`;
  const el = (i) => container.querySelector("#" + i);
  const parts = { head: el("d-head"), torso: el("d-torso"), armA: el("d-armA"), armB: el("d-armB"), legA: el("d-legA"), legB: el("d-legB") };
  const flats = demo.poses.map(demoFlat);
  const draw = (pose) => {
    const [hd, nk, hp, elA, haA, elB, haB, knA, anA, knB, anB] = pose;
    parts.head.setAttribute("cx", hd[0]); parts.head.setAttribute("cy", hd[1]);
    parts.torso.setAttribute("d", `M${nk[0]},${nk[1]} L${hp[0]},${hp[1]}`);
    parts.armA.setAttribute("d", `M${nk[0]},${nk[1]} L${elA[0]},${elA[1]} L${haA[0]},${haA[1]}`);
    parts.armB.setAttribute("d", `M${nk[0]},${nk[1]} L${elB[0]},${elB[1]} L${haB[0]},${haB[1]}`);
    parts.legA.setAttribute("d", `M${hp[0]},${hp[1]} L${knA[0]},${knA[1]} L${anA[0]},${anA[1]}`);
    parts.legB.setAttribute("d", `M${hp[0]},${hp[1]} L${knB[0]},${knB[1]} L${anB[0]},${anB[1]}`);
  };
  const lerp = (a, b, t) => a.map((pt, i) => [pt[0] + (b[i][0] - pt[0]) * t, pt[1] + (b[i][1] - pt[1]) * t]);
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  let reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) {}
  if (reduced || flats.length < 2) { draw(flats[flats.length > 1 ? 1 : 0]); return true; }
  stopDemo();
  const seg = demo.dur, hold = 260, cycle = 2 * (seg + hold);
  const t0 = performance.now();
  const tick = (now) => {
    let t = (now - t0) % cycle;
    let pose;
    if (t < seg) pose = lerp(flats[0], flats[1], ease(t / seg));
    else if (t < seg + hold) pose = flats[1];
    else if (t < 2 * seg + hold) pose = lerp(flats[1], flats[0], ease((t - seg - hold) / seg));
    else pose = flats[0];
    draw(pose);
    demoRAF = requestAnimationFrame(tick);
  };
  demoRAF = requestAnimationFrame(tick);
  return true;
}
