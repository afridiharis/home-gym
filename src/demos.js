/* ============================================================
   FORGE — animated exercise demos (v2)
   A rigged figure drawn in a 120×100 box (y down, floor at y 88).
   Each demo is two poses written as angles (0° = right, 90° = down)
   on fixed bone lengths, so proportions never drift. Hands and feet
   that must stay put (on the bar, a handle, the floor) use IK.
   Poses are blended in angle space at a real tempo; the player shows
   the end position as a ghost, an arrow riding the joint that moves
   most, the working muscles lit up, and a caption for every phase.
   No video, no network, ~0 KB of media.
   ============================================================ */

const BONE = { neck: 9, torso: 25, uarm: 13, farm: 10.5, thigh: 17, shin: 15, foot: 6 };
const DEPTH = [3, -1]; // far-side limbs that aren't posed get this offset

/* ---------- props: the tower parts and kit (drawn behind the figure) ---------- */
const R = (x, y, w, h, rx = 1.4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
const DPROP = {
  floor: '<line class="ln" x1="2" y1="88" x2="118" y2="88"/>',
  bar: R(26, 8.6, 68, 2.8),                       // pull-up bar, centre y 10
  barFrame: R(92, 8, 3, 30, 1),                     // a glimpse of the upright
  dipH: R(50, 45.6, 26, 2.8) + R(74, 30, 3, 58, 1), // dip handle + its upright
  pushH: R(63, 81.4, 14, 3) + R(68, 84.4, 4, 3.6, 1), // grips on the front feet
  lowH: R(48, 64.6, 18, 2.8) + R(54, 67.4, 6, 20.6, 1), // L-sit grips on the front feet
  vkr: R(41, 21, 5.5, 42, 2.5) + R(46, 37.6, 26, 3, 1.5) + R(41, 63, 3, 25, 1),
  wall: R(69, 2, 4, 86, 1),
  box: (x, w = 20, top = 70) => R(x, top, w, 88 - top, 2),
  post: (x, top = 12, bottom = 88) => R(x, top, 3, bottom - top, 1),
  step: R(58, 81, 36, 7, 1.5),
};

/* ---------- demos ----------
   pose: { at: [joint, x, y], torso, neck, arm, arm2, leg, leg2, foot, foot2, arch, armK }
   arm/leg = [upperAngle, lowerAngle]  or  { to: [x, y], bend: ±1 } (IK)
   meta:   say = captions for [to B, hold at B, back to A, rest at A]
           tempo = ms for those four phases, muscles = what lights up
   ------------------------------------------------------------------ */
const HANG = { at: ["ha", 60, 10], torso: -90, neck: -90, arm: [-90, -90], leg: [90, 90], foot: 62 };
const DEMOS = {
  /* --- the bar --- */
  deadhang: { props: ["bar", "barFrame"], vb: [0, -4, 120, 106], hold: true, muscles: ["grip", "back"], musLabel: "Grip and shoulders",
    say: ["Hang long, shoulders relaxed", "Breathe out", "Stay long", "Breathe in"], tempo: [1600, 700, 1600, 700],
    poses: [HANG, { ...HANG, leg: [90, 92], neck: -88 }] },
  scapPull: { props: ["bar", "barFrame"], vb: [0, -4, 120, 106], muscles: ["back"], musLabel: "Upper back",
    say: ["Pull shoulders down — arms stay straight", "Squeeze 1 s", "Slowly let go", "Long hang"], tempo: [800, 800, 1300, 600],
    poses: [HANG, { ...HANG, armK: 0.86 }] },
  pullup: { props: ["bar", "barFrame"], vb: [0, -4, 120, 106], muscles: ["back", "arms"], musLabel: "Lats and biceps",
    say: ["Pull your chest to the bar", "Chin over", "Lower slowly, 2–3 s", "Full hang"], tempo: [1100, 400, 2200, 600],
    poses: [
      { at: ["nk", 60, 33.5], torso: -90, neck: -90, arm: { to: [60, 10], bend: 1 }, leg: [90, 90], foot: 62 },
      { at: ["nk", 57, 15.5], torso: -95, neck: -80, arm: { to: [60, 10], bend: 1 }, leg: [97, 97], foot: 70 },
    ] },
  hangKnee: { props: ["bar", "barFrame"], vb: [0, -4, 120, 106], muscles: ["abs", "hipflex"], musLabel: "Abs",
    say: ["Knees up to hip height", "Pause", "Lower slowly — no swing", "Hang still"], tempo: [1000, 400, 1600, 600],
    poses: [HANG, { ...HANG, leg: [2, 90], foot: 0 }] },
  hangLeg: { props: ["bar", "barFrame"], vb: [0, -4, 120, 106], muscles: ["abs", "hipflex"], musLabel: "Abs",
    say: ["Lift straight legs up", "Pause", "Lower slowly — no swing", "Hang still"], tempo: [1200, 400, 1800, 600],
    poses: [HANG, { ...HANG, torso: -94, leg: [-4, -4], foot: -60 }] },

  /* --- dip handles --- */
  dipSupport: { props: ["dipH", "floor"], hold: true, muscles: ["chest", "arms"], musLabel: "Chest and triceps",
    say: ["Push tall, shoulders down", "Hold", "Stay tall", "Breathe"], tempo: [1500, 600, 1500, 600],
    poses: [
      { at: ["ha", 62, 47], torso: -86, neck: -88, arm: [92, 90], leg: [96, 150] },
      { at: ["ha", 62, 47], torso: -86, neck: -84, arm: [92, 90], leg: [97, 148] },
    ] },
  dip: { props: ["dipH", "floor"], muscles: ["chest", "arms"], musLabel: "Chest and triceps",
    say: ["Lower slowly, lean a little forward", "Pause", "Press up", "Lock out tall"], tempo: [1800, 300, 1100, 600],
    poses: [
      { at: ["nk", 62, 23.6], torso: -86, neck: -88, arm: { to: [62, 47], bend: 1 }, leg: [96, 150] },
      { at: ["nk", 64, 35.5], torso: -72, neck: -76, arm: { to: [62, 47], bend: 1 }, leg: [104, 160] },
    ] },
  row: { vb: [0, 36, 120, 64], props: ["dipH", "floor"], muscles: ["back", "arms"], musLabel: "Upper back and biceps",
    say: ["Pull your chest up to the handles", "Squeeze shoulder blades", "Lower slowly", "Arms long, body straight"], tempo: [1100, 500, 1600, 600],
    poses: [
      { at: ["nk", 62, 70.5], torso: 0, neck: 0, arm: { to: [62, 47], bend: 1 }, leg: { to: [18.5, 86], bend: 1 }, foot: 0 },
      { at: ["nk", 58, 55.5], torso: -24, neck: -24, arm: { to: [62, 47], bend: 1 }, leg: { to: [18.5, 86], bend: 1 }, foot: 0 },
    ] },
  rowStraight: { vb: [0, 36, 120, 64], props: ["dipH", "floor"], muscles: ["back", "arms"], musLabel: "Upper back and biceps",
    say: ["Pull your chest up to the handles", "Squeeze shoulder blades", "Lower slowly", "Body straight as a plank"], tempo: [1100, 500, 1600, 600],
    poses: [
      { at: ["an", 7.2, 85.5], torso: -15.8, neck: -15.8, arm: { to: [62, 47], bend: 1 }, leg: [164.2, 164.2], foot: -82 },
      { at: ["an", 7.2, 85.5], torso: -31.4, neck: -31.4, arm: { to: [62, 47], bend: 1 }, leg: [148.6, 148.6], foot: -68 },
    ] },
  pushIncline: { props: ["dipH", "floor"], muscles: ["chest", "arms"], musLabel: "Chest and triceps",
    say: ["Lower your chest to the handles", "Pause", "Push away — body straight", "Lock out"], tempo: [1500, 300, 1100, 600],
    poses: [
      { at: ["an", 13.2, 84.6], torso: -60, neck: -60, arm: { to: [62, 47], bend: -1 }, leg: [120, 120], foot: 30 },
      { at: ["an", 13.2, 84.6], torso: -50, neck: -50, arm: { to: [62, 47], bend: -1 }, leg: [130, 130], foot: 30 },
    ] },

  /* --- push-up grips / floor --- */
  pushup: { vb: [0, 38, 120, 62], props: ["pushH", "floor"], muscles: ["chest", "arms"], musLabel: "Chest and triceps",
    say: ["Lower your chest slowly", "Pause", "Push up — body straight", "Lock out"], tempo: [1600, 300, 1100, 600],
    poses: [
      { at: ["an", 20.1, 84], torso: -28.9, neck: -28.9, arm: { to: [70, 80], bend: -1 }, leg: [151.1, 151.1], foot: 25 },
      { at: ["an", 20.1, 84], torso: -10.1, neck: -10.1, arm: { to: [70, 80], bend: -1 }, leg: [169.9, 169.9], foot: 25 },
    ] },
  pike: { vb: [0, 40, 120, 60], props: ["floor"], muscles: ["shoulders", "arms"], musLabel: "Shoulders and triceps",
    say: ["Lower your head toward the floor", "Pause", "Press back up", "Hips high"], tempo: [1600, 300, 1100, 600],
    poses: [
      { at: ["hp", 37.9, 55.6], torso: 38, neck: 38, arm: { to: [76, 85.5], bend: -1 }, leg: [108, 108], foot: 20 },
      { at: ["hp", 41, 58], torso: 47, neck: 20, arm: { to: [76, 85.5], bend: -1 }, leg: [115, 115], foot: 20 },
    ] },
  wallHS: { props: ["wall", "floor"], hold: true, muscles: ["shoulders", "arms"], musLabel: "Shoulders and triceps",
    say: ["Hold — body stacked", "Push the floor away", "Hold", "Breathe"], tempo: [1500, 600, 1500, 600],
    poses: [
      { at: ["nk", 60, 62], torso: 92, neck: 90, arm: { to: [60, 85.5], bend: 1 }, leg: [-85, -85], foot: 0 },
      { at: ["nk", 60, 62.4], torso: 92, neck: 90, arm: { to: [60, 85.5], bend: 1 }, leg: [-84, -84], foot: 0 },
    ] },
  hspu: { props: ["wall", "floor"], muscles: ["shoulders", "arms"], musLabel: "Shoulders and triceps",
    say: ["Lower slowly, head to the floor", "Light touch", "Press up", "Lock out"], tempo: [1800, 300, 1300, 600],
    poses: [
      { at: ["nk", 60, 62], torso: 92, neck: 90, arm: { to: [60, 85.5], bend: 1 }, leg: [-85, -85], foot: 0 },
      { at: ["nk", 60, 72.8], torso: 92, neck: 90, arm: { to: [60, 85.5], bend: 1 }, leg: [-85, -85], foot: 0 },
    ] },

  /* --- knee-raise station --- */
  vkr: { props: ["vkr", "floor"], muscles: ["abs", "hipflex"], musLabel: "Abs",
    say: ["Knees up to hip height", "Pause", "Lower slowly — back stays on the pad", "Legs long"], tempo: [1000, 400, 1500, 600],
    poses: [
      { at: ["el", 53, 36], torso: -90, neck: -90, arm: [90, 0], leg: [90, 90], foot: 66 },
      { at: ["el", 53, 36], torso: -90, neck: -90, arm: [90, 0], leg: [2, 90], foot: 0 },
    ] },

  /* --- floor: spine care and core --- */
  catcamel: { vb: [0, 34, 120, 66], props: ["floor"], muscles: ["back"], musLabel: "Spine mobility",
    say: ["Round your back up, head down", "Pause", "Let your back dip gently, head up", "Pause"], tempo: [1700, 500, 1700, 500],
    poses: [
      { at: ["hp", 51.9, 68.5], torso: -15.1, neck: 100, arch: -4.2, arm: [90, 90], leg: [90, 180], foot: 176 },
      { at: ["hp", 51.9, 68.5], torso: -15.1, neck: -32, arch: 3.5, arm: [90, 90], leg: [90, 180], foot: 176 },
    ] },
  curlup: { vb: [0, 42, 120, 58], props: ["floor"], muscles: ["abs"], musLabel: "Abs",
    say: ["Lift head and shoulders a little", "Hold 8–10 s, breathe", "Lower", "Rest"], tempo: [900, 2400, 900, 800],
    poses: [
      { at: ["hp", 51, 82], torso: 180, neck: 180, arm: { to: [47, 84.6], bend: -1 }, leg: { to: [68, 85.6], bend: -1 }, foot: 0, leg2: [4, 4], foot2: -86 },
      { at: ["hp", 51, 82], torso: 188, neck: 190, arm: { to: [47, 84.6], bend: -1 }, leg: { to: [68, 85.6], bend: -1 }, foot: 0, leg2: [4, 4], foot2: -86 },
    ] },
  sideplank: { vb: [0, 38, 120, 62], track: "hp", props: ["floor"], muscles: ["obliques"], musLabel: "Side abs",
    say: ["Lift your hips, top arm up", "Straight line — hold", "Lower down", "Switch sides next"], tempo: [900, 2600, 900, 900],
    poses: [
      { at: ["el", 28, 85.5], torso: 204.8, neck: 195, arm: [90, 0], arm2: [-60, -60], leg: [4, 4], foot: -86 },
      { at: ["el", 28, 85.5], torso: 193.2, neck: 184, arm: [90, 0], arm2: [-90, -90], leg: [13.2, 13.2], foot: -77 },
    ] },
  birddog: { vb: [0, 34, 120, 66], props: ["floor"], muscles: ["back", "glutes"], musLabel: "Back and glutes",
    say: ["Reach one arm and the opposite leg out", "Hold 8–10 s — hips level", "Bring them back", "Switch sides"], tempo: [1000, 2200, 1000, 700],
    poses: [
      { at: ["hp", 51.9, 68.5], torso: -15.1, neck: -8, arm: [90, 90], arm2: [92, 90], leg: [90, 180], leg2: [92, 178], foot: 176, foot2: 176 },
      { at: ["hp", 51.9, 68.5], torso: -15.1, neck: -12, arm: [-4, -4], arm2: [92, 90], leg: [90, 180], leg2: [186, 186], foot: 176, foot2: 96 },
    ] },
  plank: { vb: [0, 46, 120, 54], track: "hp", props: ["floor"], muscles: ["abs", "glutes"], musLabel: "Abs and glutes",
    say: ["Lift your knees — body straight", "Squeeze glutes and fists — hold", "Knees down", "Rest"], tempo: [900, 3200, 900, 1000],
    poses: [
      { at: ["el", 68, 85.5], torso: -18, neck: -18, arm: [90, 0], leg: [162, 190], foot: 40 },
      { at: ["el", 68, 85.5], torso: -11, neck: -11, arm: [90, 0], leg: [169, 169], foot: 30 },
    ] },
  deadbug: { vb: [0, 42, 120, 58], props: ["floor"], muscles: ["abs"], musLabel: "Deep abs",
    say: ["Reach one arm back, the opposite leg out", "Low back stays flat", "Return", "Switch sides"], tempo: [1300, 600, 1300, 600],
    poses: [
      { at: ["hp", 51, 82], torso: 180, neck: 180, arm: [-90, -90], arm2: [-92, -90], leg: [-90, 0], leg2: [-92, 2], foot: -90, foot2: -88 },
      { at: ["hp", 51, 82], torso: 180, neck: 180, arm: [196, 190], arm2: [-92, -90], leg: [-90, 0], leg2: [-8, -8], foot: -90, foot2: -96 },
    ] },
  hollow: { vb: [0, 42, 120, 58], props: ["floor"], hold: true, muscles: ["abs"], musLabel: "Abs",
    say: ["Hold the hollow", "Low back pressed down", "Hold", "Breathe"], tempo: [1500, 600, 1500, 600],
    poses: [
      { at: ["hp", 52, 82], torso: 192, neck: 196, arm: [200, 198], leg: [-16, -16], foot: -70 },
      { at: ["hp", 52, 82], torso: 190, neck: 194, arm: [198, 196], leg: [-14, -14], foot: -72 },
    ] },
  palloff: { props: [DPROP.post(88), "floor"], band: [88, 38], muscles: ["obliques"], musLabel: "Core — resist the twist",
    say: ["Press straight out", "Resist the twist", "Bring it back in", "Breathe"], tempo: [1000, 1300, 1000, 600],
    poses: [
      { at: ["an", 52, 86], torso: -90, neck: -90, arm: { to: [64, 38], bend: 1 }, leg: [91, 90], leg2: [87, 90], foot: 0, foot2: 0 },
      { at: ["an", 52, 86], torso: -90, neck: -90, arm: { to: [76, 36], bend: 1 }, leg: [91, 90], leg2: [87, 90], foot: 0, foot2: 0 },
    ] },
  suitcase: { props: ["floor"], weight: true, muscles: ["obliques", "grip"], musLabel: "Side abs and grip",
    say: ["March tall", "Don't lean to the side", "March tall", "Don't lean"], tempo: [700, 250, 700, 250],
    poses: [
      { at: ["hp", 60, 54], torso: -90, neck: -90, arm: [90, 90], arm2: [62, 84], leg: [58, 100], leg2: [90, 90], foot: 0, foot2: 0 },
      { at: ["hp", 60, 54], torso: -90, neck: -90, arm: [90, 90], arm2: [62, 84], leg: [90, 90], leg2: [58, 100], foot: 0, foot2: 0 },
    ] },
  walkDemo: { props: ["floor"], muscles: [], musLabel: "",
    say: ["March on the spot", "", "Easy pace", ""], tempo: [650, 150, 650, 150],
    poses: [
      { at: ["hp", 60, 54], torso: -90, neck: -90, arm: [112, 88], arm2: [66, 18], leg: [58, 100], leg2: [92, 90], foot: 0, foot2: 0 },
      { at: ["hp", 60, 54], torso: -90, neck: -90, arm: [66, 18], arm2: [112, 88], leg: [92, 90], leg2: [58, 100], foot: 0, foot2: 0 },
    ] },
  lsit: { vb: [0, 20, 120, 80], props: ["lowH", "floor"], hold: true, muscles: ["abs", "hipflex"], musLabel: "Abs",
    say: ["Push down hard, lift your legs", "Hold", "Hold", "Breathe"], tempo: [1500, 600, 1500, 600],
    poses: [
      { at: ["ha", 57, 66], torso: -90, neck: -90, arm: [90, 90], leg: [0, 0], foot: -60 },
      { at: ["ha", 57, 66], torso: -90, neck: -88, arm: [90, 90], leg: [-2, -2], foot: -62 },
    ] },
  lsitTuck: { vb: [0, 20, 120, 80], props: ["lowH", "floor"], hold: true, muscles: ["abs", "hipflex"], musLabel: "Abs",
    say: ["Push down hard, knees up", "Hold", "Hold", "Breathe"], tempo: [1500, 600, 1500, 600],
    poses: [
      { at: ["ha", 57, 66], torso: -90, neck: -90, arm: [90, 90], leg: [-24, 78] },
      { at: ["ha", 57, 66], torso: -90, neck: -88, arm: [90, 90], leg: [-26, 76] },
    ] },
  lsitFoot: { vb: [0, 20, 120, 80], props: ["lowH", "floor"], hold: true, muscles: ["abs", "arms"], musLabel: "Abs and triceps",
    say: ["Push down, lift your hips", "Heels stay light on the floor", "Hold", "Breathe"], tempo: [1500, 600, 1500, 600],
    poses: [
      { at: ["ha", 57, 66], torso: -90, neck: -90, arm: [90, 90], leg: [12, 62], foot: -30 },
      { at: ["ha", 57, 66], torso: -90, neck: -88, arm: [90, 90], leg: [10, 63], foot: -30 },
    ] },

  /* --- legs and hinge --- */
  gluteBridge: { track: "hp", vb: [0, 42, 120, 58], props: ["floor"], muscles: ["glutes", "hams"], musLabel: "Glutes and hamstrings",
    say: ["Squeeze glutes, lift your hips", "Hold 1 s at the top", "Lower slowly", "Reset"], tempo: [1000, 900, 1400, 600],
    poses: [
      { at: ["nk", 26, 81.7], torso: 180, neck: 180, arm: [8, 0], leg: { to: [68, 85.6], bend: -1 }, foot: 0 },
      { at: ["nk", 26, 81.7], torso: 159, neck: 182, arm: [12, 2], leg: { to: [68, 85.6], bend: -1 }, foot: 0 },
    ] },
  slBridge: { track: "hp", vb: [0, 42, 120, 58], props: ["floor"], muscles: ["glutes", "hams"], musLabel: "Glutes and hamstrings",
    say: ["One leg up — lift your hips", "Hold 1 s, hips level", "Lower slowly", "Reset"], tempo: [1000, 900, 1400, 600],
    poses: [
      { at: ["nk", 26, 81.7], torso: 180, neck: 180, arm: [8, 0], leg: { to: [68, 85.6], bend: -1 }, foot: 0, leg2: [-24, -24], foot2: -100 },
      { at: ["nk", 26, 81.7], torso: 159, neck: 182, arm: [12, 2], leg: { to: [68, 85.6], bend: -1 }, foot: 0, leg2: [-21, -21], foot2: -100 },
    ] },
  hipThrust: { vb: [0, 44, 120, 56], props: [DPROP.box(10, 24), "floor"], muscles: ["glutes", "hams"], musLabel: "Glutes and hamstrings",
    say: ["Drive your hips up — squeeze", "Pause 1 s", "Lower slowly", "Reset"], tempo: [1000, 900, 1400, 600],
    poses: [
      { at: ["nk", 29, 65.5], torso: 218, neck: 205, arm: [150, 188], leg: { to: [72, 85.6], bend: -1 }, foot: 0 },
      { at: ["nk", 29, 65.5], torso: 181, neck: 188, arm: [150, 188], leg: { to: [72, 85.6], bend: -1 }, foot: 0 },
    ] },
  slideCurl: { vb: [0, 42, 120, 58], props: ["floor"], muscles: ["hams", "glutes"], musLabel: "Hamstrings and glutes",
    say: ["Slide your heels out", "Hips stay high", "Pull your heels back in", "Squeeze"], tempo: [1500, 300, 1300, 600],
    poses: [
      { at: ["nk", 26, 81.7], torso: 159, neck: 182, arm: [12, 2], leg: { to: [68, 85.2], bend: -1 }, foot: -60 },
      { at: ["nk", 26, 81.7], torso: 170, neck: 182, arm: [10, 1], leg: { to: [82, 85.2], bend: -1 }, foot: -70 },
    ] },
  squat: { track: "hp", props: [DPROP.box(30, 16, 73), "floor"], muscles: ["thighs", "glutes"], musLabel: "Thighs and glutes",
    say: ["Sit back and down", "Tap the box lightly", "Stand up tall", "Breathe"], tempo: [1800, 400, 1200, 700],
    poses: [
      { at: ["an", 58, 86], torso: -90, neck: -90, arm: [82, 86], leg: [90, 90], foot: 0 },
      { at: ["an", 58, 86], torso: -55, neck: -62, arm: [-4, 0], leg: [15, 105], foot: 0 },
    ] },
  squatAsst: { track: "hp", props: [DPROP.post(75), DPROP.box(24, 18, 74.5), "floor"], muscles: ["thighs", "glutes"], musLabel: "Thighs and glutes",
    say: ["Hold the tower, sit back", "Tap the box lightly", "Stand up — legs do the work", "Tall"], tempo: [1800, 400, 1200, 700],
    poses: [
      { at: ["an", 52, 86], torso: -90, neck: -90, arm: { to: [72.4, 38], bend: 1 }, leg: [90, 90], foot: 0 },
      { at: ["an", 52, 86], torso: -62, neck: -70, arm: { to: [72.4, 40], bend: 1 }, leg: [10, 105], foot: 0 },
    ] },
  splitSquat: { track: "hp", props: ["floor"], muscles: ["thighs", "glutes"], musLabel: "Thighs and glutes",
    say: ["Drop the back knee straight down", "Pause", "Drive up through the front foot", "Tall"], tempo: [1700, 400, 1200, 700],
    poses: [
      { at: ["hp", 58, 57.5], torso: -90, neck: -90, arm: [94, 84], arm2: [86, 92], leg: { to: [71, 86], bend: -1 }, leg2: { to: [39.5, 82], bend: -1 }, foot: 0, foot2: 40 },
      { at: ["hp", 56.5, 70.5], torso: -88, neck: -90, arm: [94, 84], arm2: [86, 92], leg: { to: [71, 86], bend: -1 }, leg2: { to: [39.5, 82], bend: -1 }, foot: 0, foot2: 40 },
    ] },
  bulgSquat: { track: "hp", props: [DPROP.box(14, 24), "floor"], muscles: ["thighs", "glutes"], musLabel: "Thighs and glutes",
    say: ["Lower straight down", "Pause", "Drive up through the front foot", "Tall"], tempo: [1700, 400, 1200, 700],
    poses: [
      { at: ["hp", 57, 56.5], torso: -82, neck: -86, arm: [96, 84], leg: { to: [72, 86], bend: -1 }, leg2: { to: [30, 66.6], bend: -1 }, foot: 0, foot2: 178 },
      { at: ["hp", 55, 68.5], torso: -76, neck: -82, arm: [96, 84], leg: { to: [72, 86], bend: -1 }, leg2: { to: [30, 66.6], bend: -1 }, foot: 0, foot2: 178 },
    ] },
  pistolAsst: { track: "hp", props: [DPROP.post(80), "floor"], muscles: ["thighs", "glutes"], musLabel: "Thighs and glutes",
    say: ["Sit down slowly on one leg", "Pause", "Stand up — arms help a little", "Tall"], tempo: [2000, 400, 1400, 700],
    poses: [
      { at: ["an", 58, 86], torso: -90, neck: -90, arm: { to: [77.6, 38], bend: 1 }, leg: [90, 90], leg2: [72, 102], foot: 0, foot2: 10 },
      { at: ["an", 58, 86], torso: -60, neck: -66, arm: { to: [77.6, 44], bend: 1 }, leg: [20, 108], leg2: [-4, -4], foot: 0, foot2: -70 },
    ] },
  calfRaise: { track: "an", props: [DPROP.post(75, 12, 81), "step"], muscles: ["calves"], musLabel: "Calves",
    say: ["Rise up high on the ball of your foot", "Squeeze 1 s", "Lower slowly", "Deep stretch, 2 s"], tempo: [900, 900, 1500, 1600],
    poses: [
      { at: ["ft", 62, 79.4], torso: -90, neck: -90, arm: { to: [72.6, 34], bend: 1 }, arm2: [92, 88], leg: [90, 90], leg2: [100, 150], foot: -15 },
      { at: ["ft", 62, 79.4], torso: -90, neck: -90, arm: { to: [72.6, 34], bend: 1 }, arm2: [92, 88], leg: [90, 90], leg2: [100, 150], foot: 55 },
    ] },
  slRDL: { props: ["floor"], muscles: ["hams", "glutes"], musLabel: "Hamstrings and glutes",
    say: ["Hinge — back leg reaches behind", "Flat back", "Stand up tall", "Balance"], tempo: [1800, 400, 1400, 700],
    poses: [
      { at: ["an", 58, 86], torso: -90, neck: -90, arm: [90, 90], arm2: [88, 92], leg: [90, 90], leg2: [96, 92], foot: 0, foot2: 20 },
      { at: ["an", 58, 86], torso: -15, neck: -15, arm: [90, 90], arm2: [88, 92], leg: [80, 95], leg2: [165, 165], foot: 0, foot2: 75 },
    ] },
  hinge: { track: "hp", props: ["floor"], muscles: ["hams", "glutes"], musLabel: "Hamstrings and glutes",
    say: ["Push your hips back", "Flat back, soft knees", "Squeeze up to standing", "Tall"], tempo: [1700, 400, 1300, 700],
    poses: [
      { at: ["an", 58, 86], torso: -90, neck: -90, arm: [88, 90], leg: [90, 90], foot: 0 },
      { at: ["an", 58, 86], torso: -45, neck: -40, arm: [90, 90], leg: [65, 95], foot: 0 },
    ] },
};

/* exercise id → demo id (keep complete: every EX needs one) */
const DEMO_MAP = {
  deadhang: "deadhang", scapPull: "scapPull",
  negPullup: "pullup", asstPullup: "pullup", chinup: "pullup", pullup: "pullup",
  ctbPullup: "pullup", archPullup: "pullup", wtdPullup: "pullup",
  hangKnee: "hangKnee", hangLeg: "hangLeg",
  dipSupport: "dipSupport", dipNeg: "dip", dipPartial: "dip", dip: "dip", dipSlow: "dip", wtdDip: "dip",
  rowBent: "row", rowStraight: "rowStraight", rowElev: "rowStraight", rowArcher: "rowStraight",
  pushIncline: "pushIncline", pushup: "pushup", pushDecline: "pushup", pushDiamond: "pushup",
  pushArcher: "pushup", pushPseudo: "pushup",
  pikePush: "pike", pikeElev: "pike", wallHS: "wallHS", hspuNeg: "hspu", hspu: "hspu",
  vkrBent: "vkr", vkrChest: "vkr", vkrStraight: "vkr",
  catcamel: "catcamel", curlup: "curlup", sideplank: "sideplank", birddog: "birddog",
  plank: "plank", deadbug: "deadbug", hollowBent: "hollow", hollow: "hollow",
  palloff: "palloff", suitcase: "suitcase",
  lsitFoot: "lsitFoot", lsitTuck: "lsitTuck", lsitOne: "lsit", lsitFull: "lsit",
  squatAsst: "squatAsst", squat: "squat", splitSquat: "splitSquat", bulgSquat: "bulgSquat",
  stepup: "bulgSquat", pistolAsst: "pistolAsst",
  gluteBridge: "gluteBridge", slBridge: "slBridge", hipThrust: "hipThrust", slHipThrust: "hipThrust",
  slideCurl: "slideCurl", slRDL: "slRDL", calfRaise: "calfRaise", hipHingeDrill: "hinge", walk: "walkDemo",
};

/* ---------- rig: forward + inverse kinematics ---------- */
const DEG = Math.PI / 180;
const stepTo = (p, deg, len) => [p[0] + Math.cos(deg * DEG) * len, p[1] + Math.sin(deg * DEG) * len];
const angOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
function ik2(root, to, l1, l2, bend) {
  const d = Math.min(Math.hypot(to[0] - root[0], to[1] - root[1]), l1 + l2 - 0.01);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 0.01));
  const mid = stepTo(root, angOf(root, to) + bend * Math.acos(Math.max(-1, Math.min(1, c))) / DEG, l1);
  return [mid, stepTo(mid, angOf(mid, to), l2)];
}
function rig(s) {
  const B = BONE, j = { hp: [0, 0] }, k = s.armK ?? 1;
  j.nk = stepTo(j.hp, s.torso, B.torso);
  j.hd = stepTo(j.nk, s.neck ?? s.torso, B.neck);
  const fk = (root, v, l1, l2) => { const m = stepTo(root, v[0], l1); return [m, stepTo(m, v[1], l2)]; };
  const limbs = [["el", "ha", "arm", "nk", B.uarm * k, B.farm * k], ["el2", "ha2", "arm2", "nk", B.uarm * k, B.farm * k],
                 ["kn", "an", "leg", "hp", B.thigh, B.shin], ["kn2", "an2", "leg2", "hp", B.thigh, B.shin]];
  for (const [m, e, key, root, l1, l2] of limbs) if (Array.isArray(s[key])) [j[m], j[e]] = fk(j[root], s[key], l1, l2);
  if (j.an && s.foot != null) j.ft = stepTo(j.an, s.foot, B.foot);
  const [aj, ax, ay] = s.at, o = j[aj], dx = ax - o[0], dy = ay - o[1];
  for (const key in j) j[key] = [j[key][0] + dx, j[key][1] + dy];
  for (const [m, e, key, root, l1, l2] of limbs) if (s[key] && !Array.isArray(s[key])) [j[m], j[e]] = ik2(j[root], s[key].to, l1, l2, s[key].bend ?? 1);
  // far side: mirror the near limb with a small depth offset when not posed
  const off = (p) => [p[0] + DEPTH[0], p[1] + DEPTH[1]];
  if (!s.arm2) { j.el2 = off(j.el); j.ha2 = off(j.ha); }
  if (!s.leg2) { j.kn2 = off(j.kn); j.an2 = off(j.an); }
  const toe = (kn, an, ang) => stepTo(an, ang ?? angOf(kn, an) - 90, B.foot);
  j.ft = toe(j.kn, j.an, s.foot);
  j.ft2 = s.leg2 ? toe(j.kn2, j.an2, s.foot2 ?? s.foot) : off(j.ft);
  j.arch = s.arch || 0;
  return j;
}
const lerpN = (a, b, t) => a + (b - a) * t;
const lerpA = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };
function blend(A, B, t) {
  const o = { at: [A.at[0], lerpN(A.at[1], B.at[1], t), lerpN(A.at[2], B.at[2], t)] };
  for (const k of ["torso", "neck", "foot", "foot2"]) if (A[k] != null) o[k] = lerpA(A[k], B[k] ?? A[k], t);
  for (const k of ["arch", "armK"]) if (A[k] != null || B[k] != null) o[k] = lerpN(A[k] ?? (k === "armK" ? 1 : 0), B[k] ?? (k === "armK" ? 1 : 0), t);
  for (const k of ["arm", "arm2", "leg", "leg2"]) {
    const a = A[k], b = B[k] ?? a;
    if (!a) continue;
    o[k] = Array.isArray(a) ? [lerpA(a[0], b[0], t), lerpA(a[1], b[1], t)]
      : { to: [lerpN(a.to[0], b.to[0], t), lerpN(a.to[1], b.to[1], t)], bend: a.bend };
  }
  return o;
}

/* ---------- drawing ---------- */
const f1 = (n) => Math.round(n * 10) / 10;
const P = (p) => `${f1(p[0])},${f1(p[1])}`;
const mixP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function capsule(a, b, ra, rb) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.01;
  const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
  const pa = [a[0] + nx * ra, a[1] + ny * ra], pb = [b[0] + nx * rb, b[1] + ny * rb];
  const qb = [b[0] - nx * rb, b[1] - ny * rb], qa = [a[0] - nx * ra, a[1] - ny * ra];
  return `M${P(pa)}L${P(pb)}A${f1(rb)},${f1(rb)} 0 0 0 ${P(qb)}L${P(qa)}A${f1(ra)},${f1(ra)} 0 0 0 ${P(pa)}Z`;
}
const dot = (c, r) => `M${f1(c[0] - r)},${f1(c[1])}a${f1(r)},${f1(r)} 0 1 0 ${f1(2 * r)},0a${f1(r)},${f1(r)} 0 1 0 ${f1(-2 * r)},0Z`;
/* the spine is a curve (arch bends it), drawn with chest/waist/hip widths */
function spinePt(j, t) {
  const a = j.hp, b = j.nk, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L], m = mixP(a, b, 0.5), c = [m[0] + n[0] * j.arch * 2, m[1] + n[1] * j.arch * 2];
  const u = 1 - t;
  const p = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  const d = [2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1])];
  const dl = Math.hypot(d[0], d[1]) || 1;
  return { p, n: [-d[1] / dl, d[0] / dl] };
}
const TORSO_W = [[0, 6], [0.3, 5.2], [0.7, 6.8], [1, 6.2]];
const torsoW = (t) => { for (let i = 1; i < TORSO_W.length; i++) if (t <= TORSO_W[i][0]) {
  const [t0, w0] = TORSO_W[i - 1], [t1, w1] = TORSO_W[i]; return w0 + (w1 - w0) * (t - t0) / (t1 - t0); } return 6; };
function torsoPath(j, t0 = 0, t1 = 1, k = 1) {
  const L = [], Rr = [], N = 8;
  for (let i = 0; i <= N; i++) {
    const t = t0 + (t1 - t0) * i / N, { p, n } = spinePt(j, t), w = torsoW(t) * k;
    L.push([p[0] + n[0] * w, p[1] + n[1] * w]); Rr.push([p[0] - n[0] * w, p[1] - n[1] * w]);
  }
  const wE = torsoW(t1) * k, wS = torsoW(t0) * k;
  return `M${P(L[0])}` + L.slice(1).map((q) => `L${P(q)}`).join("") +
    `A${f1(wE)},${f1(wE)} 0 0 0 ${P(Rr[N])}` + Rr.slice(0, N).reverse().map((q) => `L${P(q)}`).join("") +
    `A${f1(wS)},${f1(wS)} 0 0 0 ${P(L[0])}Z`;
}
function bodyParts(j) {
  const arm = (nk, el, ha) => capsule(nk, el, 2.9, 2.5) + capsule(el, ha, 2.5, 2.0) + dot(ha, 2.5);
  const leg = (hp, kn, an, ft) => capsule(hp, kn, 4.4, 3.3) + capsule(kn, an, 3.3, 2.3) + capsule(an, ft, 2.3, 1.6);
  return {
    far: arm(j.nk, j.el2, j.ha2) + leg(j.hp, j.kn2, j.an2, j.ft2),
    torso: torsoPath(j) + capsule(j.nk, mixP(j.nk, j.hd, 0.62), 2.7, 2.5) + dot(j.hd, 6.2),
    legA: leg(j.hp, j.kn, j.an, j.ft),
    armA: arm(j.nk, j.el, j.ha),
  };
}
/* muscle highlights, split by layer so near limbs still cover far ones */
function hotParts(j, muscles) {
  const out = { far: "", torso: "", legA: "", armA: "" };
  const seg = (a, b, t0, t1, ra, rb) => capsule(mixP(a, b, t0), mixP(a, b, t1), ra, rb);
  for (const m of muscles) {
    if (m === "thighs" || m === "hams") { out.legA += seg(j.hp, j.kn, 0.2, 0.86, 3.6, 2.7); out.far += seg(j.hp, j.kn2, 0.2, 0.86, 3.6, 2.7); }
    if (m === "hipflex") { out.legA += seg(j.hp, j.kn, 0.05, 0.42, 3.4, 3.0); }
    if (m === "calves") { out.legA += seg(j.kn, j.an, 0.12, 0.7, 2.7, 2.0); out.far += seg(j.kn2, j.an2, 0.12, 0.7, 2.7, 2.0); }
    if (m === "glutes") out.legA += dot(j.hp, 4.6);
    if (m === "abs" || m === "obliques") out.torso += torsoPath(j, 0.12, 0.58, 0.66);
    if (m === "back" || m === "chest") out.torso += torsoPath(j, 0.5, 0.9, 0.7);
    if (m === "shoulders") out.armA += dot(j.nk, 3.6);
    if (m === "arms") { out.armA += seg(j.nk, j.el, 0.15, 0.85, 2.3, 2.0); out.far += seg(j.nk, j.el2, 0.15, 0.85, 2.3, 2.0); }
    if (m === "grip") { out.armA += seg(j.el, j.ha, 0.2, 1, 2.0, 2.1); out.far += seg(j.el2, j.ha2, 0.2, 1, 2.0, 2.1); }
  }
  return out;
}
const TRACK_JOINTS = ["hd", "hp", "ha", "ha2", "an", "an2", "kn", "kn2", "ft"];
function trackOf(demo) {
  const a = rig(demo.poses[0]), b = rig(demo.poses[demo.poses.length - 1]);
  let best = null, bestD = 0;
  for (const k of TRACK_JOINTS) { const d = Math.hypot(b[k][0] - a[k][0], b[k][1] - a[k][1]); if (d > bestD) { bestD = d; best = k; } }
  if (demo.track) { best = demo.track; bestD = Math.hypot(b[best][0] - a[best][0], b[best][1] - a[best][1]); }
  if (demo.hold || bestD < 3.5) return null;
  const pts = [];
  for (let i = 0; i <= 16; i++) pts.push(rig(blend(demo.poses[0], demo.poses[1], i / 16))[best]);
  // push the path off the body: away from the figure's centre
  const c = ["hd", "nk", "hp", "kn", "an"].map((k) => a[k]).reduce((s, p) => [s[0] + p[0] / 5, s[1] + p[1] / 5], [0, 0]);
  const ch = [pts[16][0] - pts[0][0], pts[16][1] - pts[0][1]], cl = Math.hypot(ch[0], ch[1]) || 1;
  let n = [-ch[1] / cl, ch[0] / cl];
  const mid = pts[8];
  if ((mid[0] - c[0]) * n[0] + (mid[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const gap = best === "ft" ? 6 : 9;
  return pts.map((p) => [p[0] + n[0] * gap, p[1] + n[1] * gap]);
}
const arrowHead = (p, ang) => {
  const a = ang * DEG, s = 3.4;
  const tip = [p[0] + Math.cos(a) * s, p[1] + Math.sin(a) * s];
  const l = [p[0] + Math.cos(a + 2.5) * s, p[1] + Math.sin(a + 2.5) * s], r = [p[0] + Math.cos(a - 2.5) * s, p[1] + Math.sin(a - 2.5) * s];
  return `M${P(tip)}L${P(l)}L${P(r)}Z`;
};

/* ---------- player ---------- */
const DEMO_LIVE = new Set();
function stopDemo() { for (const d of DEMO_LIVE) cancelAnimationFrame(d.raf); DEMO_LIVE.clear(); }
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const propSVG = (demo) => demo.props.map((p) => DPROP[p] ?? p).join("");

function mountDemo(container, exId, size, opts = {}) {
  const id = DEMO_MAP[exId] || exId;
  const demo = DEMOS[id];
  if (!demo || !container) return false;
  if (!opts.keep) stopDemo();
  const vb = demo.vb || [0, 0, 120, 100];
  const ar = vb[2] / vb[3];
  const w = Math.round((size || 300) * (ar > 1.5 ? 1.3 : 1));
  const ghostJ = rig(demo.poses[demo.poses.length - 1]);
  const ghost = bodyParts(ghostJ);
  const track = trackOf(demo);
  const label = opts.compact ? "" : (demo.musLabel ?? "");
  container.querySelectorAll(".dm-svg, .dm-cap, .dm-mus").forEach((n) => n.remove());
  container.insertAdjacentHTML("beforeend", `
    <svg class="dm-svg" viewBox="${vb.join(" ")}" style="--dm-w:${w}px;--dm-ar:${ar.toFixed(3)}${opts.fit ? `;--dm-fit:${opts.fit}` : ""}" role="img" aria-label="Animated demo">
      <g class="dm-props">${propSVG(demo)}</g>
      <path class="dm-ghost" d="${ghost.far + ghost.torso + ghost.legA + ghost.armA}"/>
      ${track ? `<path class="dm-track" d="M${track.map(P).join("L")}"/>` : ""}
      ${demo.band ? `<path class="dm-band"/>` : ""}
      <g class="dm-far"><path class="dm-b"/><path class="dm-hot"/></g>
      <g class="dm-near"><path class="dm-b" data-p="torso"/><path class="dm-hot" data-p="torso"/>
        <path class="dm-b" data-p="legA"/><path class="dm-hot" data-p="legA"/>
        <path class="dm-b" data-p="armA"/><path class="dm-hot" data-p="armA"/></g>
      ${demo.weight ? `<rect class="dm-weight" width="9" height="10" rx="2.4"/>` : ""}
      ${track ? `<path class="dm-arrow"/>` : ""}
    </svg>
    ${opts.compact ? "" : `<div class="dm-cap"><span class="dm-say"><span class="dm-txt"></span><i class="dm-prog"></i></span>${opts.counter ? `<span class="dm-rep"></span>` : ""}</div>`}
    ${label ? `<span class="dm-mus"><i></i>${label}</span>` : ""}`);
  const svg = container.querySelector(".dm-svg");
  const far = svg.querySelector(".dm-far"), near = svg.querySelector(".dm-near");
  const farB = far.querySelector(".dm-b"), farH = far.querySelector(".dm-hot");
  const nearB = {}, nearH = {};
  near.querySelectorAll("[data-p]").forEach((n) => (n.classList.contains("dm-hot") ? nearH : nearB)[n.dataset.p] = n);
  const arrow = svg.querySelector(".dm-arrow"), band = svg.querySelector(".dm-band"), weight = svg.querySelector(".dm-weight");
  const txt = container.querySelector(".dm-txt"), prog = container.querySelector(".dm-prog"), rep = container.querySelector(".dm-rep");
  const hots = [farH, ...Object.values(nearH)];
  const draw = (j, heat) => {
    const b = bodyParts(j), h = hotParts(j, demo.muscles || []);
    farB.setAttribute("d", b.far); farH.setAttribute("d", h.far);
    for (const k of ["torso", "legA", "armA"]) { nearB[k].setAttribute("d", b[k]); nearH[k].setAttribute("d", h[k]); }
    for (const n of hots) n.style.opacity = heat;
    if (band) band.setAttribute("d", `M${P(demo.band)}L${P(j.ha)}`);
    if (weight) { weight.setAttribute("x", f1(j.ha[0] - 4.5)); weight.setAttribute("y", f1(j.ha[1] + 1.5)); }
  };
  const [t1, h1, t2, h2] = demo.tempo || [1400, 400, 1400, 500];
  const cycle = t1 + h1 + t2 + h2;
  let reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) {}
  const say = demo.say || [];
  let lastSay = -1, n = 1;
  const setSay = (i) => {
    if (!txt || i === lastSay) return;
    lastSay = i;
    const s = say[i] || say[i - 1] || say[0] || "";
    if (s) txt.textContent = s;
  };
  if (reduced || demo.poses.length < 2) {
    draw(ghostJ, 0.9); setSay(1);
    if (rep) rep.textContent = demo.hold || opts.timed ? "Hold" : "";
    return true;
  }
  const live = { raf: 0, paused: false, t0: performance.now(), pausedAt: 0 };
  DEMO_LIVE.add(live);
  const A = demo.poses[0], Bp = demo.poses[1];
  const tick = (now) => {
    if (!svg.isConnected) { DEMO_LIVE.delete(live); return; }
    if (live.paused) { live.raf = requestAnimationFrame(tick); return; }
    const el = now - live.t0, t = el % cycle, c = Math.floor(el / cycle) + 1;
    let k, ph, pt;
    if (t < t1) { ph = 0; pt = t / t1; k = easeIO(pt); }
    else if (t < t1 + h1) { ph = 1; pt = (t - t1) / h1; k = 1; }
    else if (t < t1 + h1 + t2) { ph = 2; pt = (t - t1 - h1) / t2; k = 1 - easeIO(pt); }
    else { ph = 3; pt = (t - t1 - h1 - t2) / h2; k = 0; }
    draw(rig(blend(A, Bp, k)), ph === 3 ? 0.42 : 0.92);
    setSay(ph);
    if (prog) prog.style.width = `${Math.round(pt * 100)}%`;
    if (rep && c !== n) n = c;
    if (rep) rep.textContent = demo.hold || opts.timed ? "Hold" : `Rep ${n}`;
    if (arrow && track) {
      const moving = ph === 0 || ph === 2;
      arrow.style.opacity = moving ? 1 : 0;
      if (moving) {
        const f = Math.max(0, Math.min(15.99, k * 16)), i = Math.floor(f), r = f - i;
        const p = mixP(track[i], track[i + 1], r);
        const ang = ph === 0 ? angOf(track[i], track[i + 1]) : angOf(track[i + 1], track[i]);
        arrow.setAttribute("d", arrowHead(p, ang));
      }
    }
    live.raf = requestAnimationFrame(tick);
  };
  live.raf = requestAnimationFrame(tick);
  if (!opts.noTap) {
    container.onclick = (e) => {
      if (e.target.closest("button, a, video")) return;
      live.paused = !live.paused;
      if (live.paused) live.pausedAt = performance.now(); else live.t0 += performance.now() - live.pausedAt;
      container.classList.toggle("dm-paused", live.paused);
    };
  }
  return true;
}
