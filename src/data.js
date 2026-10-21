/* ============================================================
   FORGE — program data
   Evidence notes: McGill Big 3 protocol, traffic-light pain rules,
   ladder progressions for the Sportsroyals power tower.
   ============================================================ */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------- Exercise library ----------
   kind: 'reps' | 'secs' | 'perside' (reps per side) | 'secside' (secs per side)
   l5: safety note shown in player & library. phase: minimum phase (1-4).
*/
const EX = {
  /* --- Spine routine (McGill) --- */
  catcamel:   { name: "Cat–Camel", icon: "🐈", kind: "reps", pattern: "spine", phase: 1,
    cues: ["On all fours, slowly cycle between gentle arch and gentle round", "Move through comfortable range only — this is motion, not stretching", "Slow: ~3–4 seconds per cycle"],
    l5: "Never force end-range. This lubricates the spine before everything else." },
  curlup:     { name: "McGill Curl-Up", icon: "🧱", kind: "reps", pattern: "spine", phase: 1,
    cues: ["Lie down, one knee bent, hands under your lower-back arch", "Lift head + shoulders a few centimetres — the spine does NOT bend", "Hold 8–10s, breathe, lower slowly"],
    l5: "Hands under the lumbar arch preserve neutral. No chin-tuck, no sit-up." },
  sideplank:  { name: "Side Plank", icon: "📐", kind: "secside", pattern: "spine", phase: 1,
    cues: ["From knees first; from feet when strong", "Straight line ear–shoulder–hip–knee", "Hold 8–10s per rep, breathe"],
    l5: "Builds the obliques with zero disc bending. Start from knees if it's hard." },
  birddog:    { name: "Bird Dog", icon: "🐦", kind: "perside", pattern: "spine", phase: 1,
    cues: ["All fours. Opposite arm + leg out, 'kick the heel straight back'", "Make a fist, brace the belly, hold 8–10s", "Sweep the floor between reps, no back sag"],
    l5: "Hips stay level. If shaky, do leg-only first." },
  deadhang:   { name: "Dead Hang", icon: "🦍", kind: "secs", pattern: "vpull", phase: 1,
    cues: ["Grip the bar, shoulders 'active-ish' — not fully slumped", "Let the spine lengthen, breathe slowly", "Step down slowly — never drop off"],
    l5: "Gentle traction for the spine. Feet lightly on floor at first is fine. Stop if leg symptoms increase." },
  hipHingeDrill: { name: "Hip Hinge Drill", icon: "🥢", kind: "reps", pattern: "hinge", phase: 1,
    cues: ["Broomstick along spine: head, upper back, sacrum all touching", "Push hips BACK, shins vertical, soft knees", "If the stick loses contact, you bent the spine — reset"],
    l5: "This pattern replaces spine-bending in daily life. Practise until automatic." },
  walk:       { name: "Brisk Walk", icon: "🚶", kind: "secs", pattern: "spine", phase: 1,
    cues: ["Brisk pace, relaxed arm swing", "Multiple short bouts are fine (3×10 min)", "Build toward 30 min most days"],
    l5: "The single best-evidenced daily habit for keeping back pain away (WalkBack RCT, Lancet 2024)." },

  /* --- Vertical pull ladder --- */
  scapPull:   { name: "Scapular Pulls", icon: "🔻", kind: "reps", pattern: "vpull", phase: 2,
    cues: ["Hang, then pull shoulder blades down & together — arms stay straight", "2s hold at the top of each rep", "Slow and controlled"],
    l5: "Keep the trunk quiet — no swinging." },
  negPullup:  { name: "Negative Pull-Ups", icon: "⬇️", kind: "reps", pattern: "vpull", phase: 2,
    cues: ["Step up using the tower frame, chin over bar", "Lower yourself in 3–5 seconds", "Step down at the bottom — don't drop"],
    l5: "Control is everything. Dropping off the bar jars the spine." },
  asstPullup: { name: "Assisted Pull-Ups", icon: "🪜", kind: "reps", pattern: "vpull", phase: 2,
    cues: ["A foot on a sturdy chair behind you, or a band over the bar", "Push with the leg only as much as needed", "Chest toward the bar, full lockout at bottom"],
    l5: "Brace the trunk lightly — don't let the lower back over-arch." },
  chinup:     { name: "Chin-Ups", icon: "💪", kind: "reps", pattern: "vpull", phase: 2,
    cues: ["Palms toward you — about 10–15% easier than pull-ups", "Pull chest to bar, elbows to ribs", "3s lower on every rep"],
    l5: "Strict only. No kipping — it shears the spine and can rock the tower." },
  pullup:     { name: "Pull-Ups", icon: "🔥", kind: "reps", pattern: "vpull", phase: 2,
    cues: ["Palms away, hands just outside shoulders", "Lead with the chest, pull the bar to you", "Full hang at the bottom of every rep"],
    l5: "Mild traction makes these back-friendly — as long as every rep is strict." },
  ctbPullup:  { name: "Chest-to-Bar Pull-Ups", icon: "⚡", kind: "reps", pattern: "vpull", phase: 3,
    cues: ["Pull higher — touch the chest to the bar", "Keep the body a rigid line", "Lower yourself slowly (3–5s)"],
    l5: "Rigid trunk, zero swing." },
  archPullup: { name: "Archer Pull-Ups", icon: "🏹", kind: "perside", pattern: "vpull", phase: 4,
    cues: ["Pull toward one hand, other arm goes straight", "Alternate sides", "Build toward one-arm strength"],
    l5: "Advanced — only when fully symptom-free." },
  wtdPullup:  { name: "Weighted Pull-Ups", icon: "🎒", kind: "reps", pattern: "vpull", phase: 4,
    cues: ["Backpack packed tight so the load can't shift", "Start ~5% bodyweight, add 2.5kg when 3×5 is clean", "Strict reps only"],
    l5: "Load changes everything — keep the trunk braced and reps slow." },

  /* --- Horizontal pull ladder (rows under the dip handles) --- */
  rowBent:    { name: "Row (bent knees)", icon: "🚣", kind: "reps", pattern: "hpull", phase: 2,
    cues: ["Lie under the dip handles, one hand on each", "Feet flat, knees bent, body a straight plank", "Pull chest to handles, squeeze shoulder blades 1s"],
    l5: "A moving plank for the back of the body — keep the hips in line." },
  rowStraight:{ name: "Row (straight legs)", icon: "🚣", kind: "reps", pattern: "hpull", phase: 2,
    cues: ["Heels on floor, legs straight, body rigid", "Chest to handle height every rep", "1s squeeze at the top"],
    l5: "Brace like a plank. If the hips sag, bend the knees again." },
  rowElev:    { name: "Row (feet elevated)", icon: "🚀", kind: "reps", pattern: "hpull", phase: 3,
    cues: ["Heels up on a chair or box (~45cm)", "Body stays a rigid line", "Lower yourself slowly"],
    l5: "Harder brace required — stop the set when the line breaks." },
  rowArcher:  { name: "Archer Rows", icon: "🏹", kind: "perside", pattern: "hpull", phase: 4,
    cues: ["One arm does most of the work, other stays straight", "Alternate sides"], l5: "Advanced. Keep hips square." },

  /* --- Dip ladder --- */
  dipSupport: { name: "Dip Support Hold", icon: "🏛️", kind: "secs", pattern: "dip", phase: 2,
    cues: ["Arms locked on the dip handles, shoulders pushed down", "Legs quiet, ribs down", "Own 60s total before trying negatives"],
    l5: "Neutral spine is easy here — just don't swing the legs." },
  dipNeg:     { name: "Dip Negatives", icon: "⬇️", kind: "reps", pattern: "dip", phase: 2,
    cues: ["Lower in 3–5s to upper-arms-parallel", "Step back up via the frame", "Elbows track back, slight forward lean"],
    l5: "Depth cap: upper arms parallel to floor. Shoulder pinch = go shallower." },
  dipPartial: { name: "Partial Dips", icon: "🌓", kind: "reps", pattern: "dip", phase: 2,
    cues: ["Half depth, full control", "Add depth week by week"], l5: "Keep the legs still — swinging rocks the tower and the spine." },
  dip:        { name: "Dips", icon: "💥", kind: "reps", pattern: "dip", phase: 2,
    cues: ["Upper arms to parallel, slight forward torso lean", "Elbows track backward", "Press to full lockout"],
    l5: "Lumbar-neutral by nature. Keep legs quiet; no bouncing at the bottom." },
  dipSlow:    { name: "Slow-Tempo Dips", icon: "🐢", kind: "reps", pattern: "dip", phase: 3,
    cues: ["3s down, 1s pause, 3s up", "No bounce at the bottom"], l5: "Tempo builds strength without extra load on anything." },
  wtdDip:     { name: "Weighted Dips", icon: "🎒", kind: "reps", pattern: "dip", phase: 4,
    cues: ["Backpack worn tight (front-load for a more upright torso)", "Start ~5% bodyweight", "+2.5kg when 3×5 is clean"],
    l5: "Brace before every set. Strict depth cap stays." },

  /* --- Push-up family --- */
  pushIncline:{ name: "Incline Push-Ups", icon: "📶", kind: "reps", pattern: "push", phase: 1,
    cues: ["Hands on the dip handles or a raised surface", "Body one straight line, glutes on", "Chest to hand level"],
    l5: "A moving plank — the straight line IS the exercise." },
  pushup:     { name: "Push-Ups (handles)", icon: "🙌", kind: "reps", pattern: "push", phase: 2,
    cues: ["Use the floor handles: neutral wrists, deeper range", "Squeeze glutes, ribs down, one straight line", "Chest below hand level at the bottom"],
    l5: "If the hips sag the back arches — stop the set there." },
  pushDecline:{ name: "Decline Push-Ups", icon: "📉", kind: "reps", pattern: "push", phase: 2,
    cues: ["Feet up on the tower step or a chair", "Same rigid line, don't let hips drop"], l5: "Harder brace. Quality over reps." },
  pushDiamond:{ name: "Diamond Push-Ups", icon: "💎", kind: "reps", pattern: "push", phase: 3,
    cues: ["Hands close, thumbs & index fingers near-touching", "Elbows brush the ribs"], l5: "Same plank rules." },
  pushArcher: { name: "Archer Push-Ups", icon: "🏹", kind: "perside", pattern: "push", phase: 3,
    cues: ["Wide hands, lower toward one side, other arm straightens", "Alternate sides"], l5: "Keep hips square to the floor." },
  pushPseudo: { name: "Pseudo-Planche Push-Ups", icon: "🦅", kind: "reps", pattern: "push", phase: 4,
    cues: ["Hands by the waist, fingers turned out, lean far forward", "Small range at first"], l5: "Elite-level plank tension required — that's the point." },

  /* --- Vertical push / handstand branch --- */
  pikePush:   { name: "Pike Push-Ups", icon: "⛰️", kind: "reps", pattern: "vpush", phase: 2,
    cues: ["Hips high in an A-shape, head slides toward the floor", "Elbows ~45°, press back up along the same line"],
    l5: "Hinge at the hips to get the A-shape — don't round the lower back." },
  pikeElev:   { name: "Elevated Pike Push-Ups", icon: "🏔️", kind: "reps", pattern: "vpush", phase: 3,
    cues: ["Feet on a chair, hips stacked over shoulders", "Head to floor, press"], l5: "Build shoulder strength before wall work." },
  wallHS:     { name: "Wall Handstand Hold", icon: "🤸", kind: "secs", pattern: "vpush", phase: 3,
    cues: ["Chest-to-wall, walk feet up", "Ribs down, glutes squeezed, body one line", "Come down the same way you went up"],
    l5: "Banana-back (over-arched spine) is the risk — tuck the pelvis, ribs down. If you can't hold the line, regress." },
  hspuNeg:    { name: "HSPU Negatives", icon: "⬇️", kind: "reps", pattern: "vpush", phase: 4,
    cues: ["Against the wall, lower in 3–5s", "Head touches a cushion, kick down safely"], l5: "Only with a perfect ribs-down, glutes-tight straight line." },
  hspu:       { name: "Wall Handstand Push-Ups", icon: "🚀", kind: "reps", pattern: "vpush", phase: 4,
    cues: ["Full range against the wall", "Ribs down throughout"], l5: "Advanced. Line first, reps second." },

  /* --- Core: VKR (knee raise station) --- */
  vkrBent:    { name: "VKR Knee Raise (to hips)", icon: "🪑", kind: "reps", pattern: "vkr", phase: 2,
    cues: ["Back flat on the pad, forearms on the armrests", "Curl the pelvis slightly as knees rise — don't just lift the thighs", "2s up, 2s down, zero swing"],
    l5: "The back pad is your friend — it blocks over-arching. Stop the set the moment reps get swingy." },
  vkrChest:   { name: "VKR Knee Raise (to chest)", icon: "🪑", kind: "reps", pattern: "vkr", phase: 2,
    cues: ["Knees all the way to the chest, slow", "Pelvis curls up at the top — small and controlled", "Lower with a 2s count"],
    l5: "Stop before the lower back peels far off the pad." },
  vkrStraight:{ name: "VKR Straight-Leg Raise", icon: "📏", kind: "reps", pattern: "vkr", phase: 3,
    cues: ["Legs straight, raise to parallel", "Slow, no momentum", "Bend knees to come down if needed"],
    l5: "Long levers pull hard on the spine — earn this with clean knee raises first." },
  hangKnee:   { name: "Hanging Knee Raises", icon: "🐒", kind: "reps", pattern: "vkr", phase: 3,
    cues: ["From the pull-up bar: knees to chest, slow", "Stop the range before the pelvis starts to tuck under — pelvis stays neutral", "No swinging between reps — reset each rep"],
    l5: "Hanging traction actually makes these friendlier than lying leg raises. Strict control or back to the VKR." },
  hangLeg:    { name: "Hanging Leg Raises", icon: "🦵", kind: "reps", pattern: "vkr", phase: 4,
    cues: ["Straight legs to parallel and above", "Lower slowly — no dropping the legs", "Zero swing"],
    l5: "This is now loaded spine-flexion territory. Only when fully symptom-free 4–8+ weeks, low volume, never in the morning, drop instantly if any symptom returns." },

  /* --- Core: iso / floor --- */
  plank:      { name: "Plank (hard-style)", icon: "🛡️", kind: "secs", pattern: "core", phase: 2,
    cues: ["Elbows under shoulders, squeeze glutes + fists hard", "Short intense holds beat long saggy ones", "10–20s of maximum tension"],
    l5: "Anti-extension gold. If the hips sag, the set is over." },
  deadbug:    { name: "Dead Bug", icon: "🪲", kind: "perside", pattern: "core", phase: 2,
    cues: ["Lower back gently pressed to floor, ribs down", "Opposite arm + leg lower slowly, exhale", "Heel taps floor lightly, return"],
    l5: "Teaches the brace without any spine movement." },
  palloff:    { name: "Anti-Rotation Press", icon: "🧲", kind: "perside", pattern: "core", phase: 2,
    cues: ["Band around the tower upright at chest height (or isometric one-arm plank if no band)", "Press hands straight out, resist the twist", "3s out, 3s back"],
    l5: "Anti-rotation = ab training the disc loves." },
  suitcase:   { name: "Suitcase Carry", icon: "🧳", kind: "secside", pattern: "core", phase: 2,
    cues: ["Heavy backpack/bag in ONE hand", "Walk tall — don't lean either way", "Swap sides halfway"],
    l5: "Superb oblique work with zero bending. Loaded posture practice." },
  hollowBent: { name: "Hollow Hold (bent knees)", icon: "🍌", kind: "secs", pattern: "core", phase: 3,
    cues: ["Lower back pressed into floor, knees tucked, shoulders lifted", "Breathe shallow, hold the shape"],
    l5: "Deliberately gated to Phase 3 — it demands the tucked-pelvis shape. Skip if ANY symptoms." },
  hollow:     { name: "Hollow Hold", icon: "🍌", kind: "secs", pattern: "core", phase: 4,
    cues: ["Arms overhead, legs long and low", "Lower back never leaves the floor"], l5: "Advanced shape. Symptom-free lifters only." },

  /* --- L-sit branch --- */
  lsitFoot:   { name: "L-Sit (feet supported)", icon: "🇱", kind: "secs", pattern: "lsit", phase: 2,
    cues: ["On the push-up handles: heels resting on floor, most weight on hands", "Push the floor away, shoulders down"],
    l5: "Spine stays tall and neutral — the hands take the load." },
  lsitTuck:   { name: "Tuck L-Sit", icon: "🇱", kind: "secs", pattern: "lsit", phase: 3,
    cues: ["Knees to chest, feet off the floor", "Shoulders depressed, elbows locked", "5–15s holds, accumulate 60s"],
    l5: "Sit TALL — think 'long spine', not 'curl up'." },
  lsitOne:    { name: "One-Leg L-Sit", icon: "🇱", kind: "secside", pattern: "lsit", phase: 3,
    cues: ["One leg extends, swap halfway"], l5: "Tall spine, no slumping." },
  lsitFull:   { name: "L-Sit", icon: "👑", kind: "secs", pattern: "lsit", phase: 4,
    cues: ["Both legs straight and parallel to floor", "Target: a clean 10–20s"], l5: "The crown jewel of neutral-spine ab strength." },

  /* --- Squat pattern --- */
  squatAsst:  { name: "Assisted Squats", icon: "🧷", kind: "reps", pattern: "squat", phase: 1,
    cues: ["Hold the tower upright for balance", "Sit back and down within a comfortable range", "Neutral spine throughout"],
    l5: "Range only as deep as the back stays neutral." },
  squat:      { name: "Bodyweight Squats", icon: "🦵", kind: "reps", pattern: "squat", phase: 2,
    cues: ["Feet shoulder-width, sit back and down", "Stop at the depth where the pelvis starts to tuck ('butt wink')", "Drive up through the whole foot"],
    l5: "Depth cap: the point just before the pelvis tucks under. That tuck = spine flexion under load." },
  splitSquat: { name: "Split Squats", icon: "🇾", kind: "perside", pattern: "squat", phase: 2,
    cues: ["Long stance, torso tall", "Back knee toward the floor", "Front heel stays down"],
    l5: "Less spine load than regular squats — a great default." },
  bulgSquat:  { name: "Bulgarian Split Squats", icon: "🏔️", kind: "perside", pattern: "squat", phase: 3,
    cues: ["Rear foot on the tower step or a chair", "Torso tall, front shin near vertical", "This becomes your main leg builder"],
    l5: "Vertical torso keeps the spine happy. Add a hugged backpack when 3×12 is easy." },
  stepup:     { name: "High Step-Ups", icon: "🪜", kind: "perside", pattern: "squat", phase: 3,
    cues: ["Knee-height step or chair", "Drive through the top heel — no push-off from the floor leg"], l5: "Tall torso." },
  pistolAsst: { name: "Assisted Pistols", icon: "🔫", kind: "perside", pattern: "squat", phase: 4,
    cues: ["Hold the tower upright, one leg squats, other reaches forward", "Only as deep as the spine stays neutral"],
    l5: "The pistol bottom forces spine-flexion. If it provokes ANY symptoms, weighted Bulgarians are a full substitute — permanently." },

  /* --- Hinge / posterior chain --- */
  gluteBridge:{ name: "Glute Bridge", icon: "🌉", kind: "reps", pattern: "hinge", phase: 1,
    cues: ["Lie down, feet close to hips", "Squeeze glutes to lift — don't push the belly up", "1s squeeze at the top, no over-arching"],
    l5: "Glutes, not lower back. Stop the rep where the pelvis is level." },
  slBridge:   { name: "Single-Leg Glute Bridge", icon: "🌉", kind: "perside", pattern: "hinge", phase: 2,
    cues: ["One foot down, other leg held up", "Pelvis stays level — that's the exercise"], l5: "Level pelvis = happy back." },
  hipThrust:  { name: "Hip Thrust (shoulders up)", icon: "🏗️", kind: "reps", pattern: "hinge", phase: 3,
    cues: ["Upper back on a chair/step", "Chin tucked, ribs down, squeeze to a flat tabletop", "2s pause at the top"],
    l5: "Stop at flat — don't arch past neutral at the top." },
  slHipThrust:{ name: "Single-Leg Hip Thrust", icon: "🏗️", kind: "perside", pattern: "hinge", phase: 3,
    cues: ["One leg, 2–3s pause at the top", "Backpack across the hips for load later"], l5: "Level pelvis, flat top position." },
  slideCurl:  { name: "Sliding Leg Curls", icon: "🧦", kind: "reps", pattern: "hinge", phase: 3,
    cues: ["Socks/towel on a hard floor, bridge up", "Slide heels out and pull back in", "Hips stay high throughout"],
    l5: "Hamstrings without deadlifts. (Never anchor your feet under the tower — tip hazard.)" },
  slRDL:      { name: "Single-Leg RDL (bodyweight)", icon: "⚖️", kind: "perside", pattern: "hinge", phase: 2,
    cues: ["Hinge at the hip, back leg reaches behind", "Hands sweep down the standing leg as a depth gauge", "Flat back the entire time"],
    l5: "This GROOMS the hinge pattern that protects your back for life." },
  calfRaise:  { name: "Single-Leg Calf Raises", icon: "🦶", kind: "perside", pattern: "hinge", phase: 2,
    cues: ["Ball of foot on the tower step edge", "Full stretch at the bottom, 2s pause", "Full squeeze at the top"], l5: "Zero spine involvement. Free gains." },
};

/* ---------- Progression ladders ---------- */
const LADDERS = {
  vpull: { name: "Vertical Pull", icon: "🔥", rungs: [
    { ex: "deadhang",   scheme: { sets: 3, secs: [20, 60] },  crit: "60s in one hang" },
    { ex: "scapPull",   scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 controlled" },
    { ex: "negPullup",  scheme: { sets: 3, reps: [3, 5] },    crit: "3×5 with 5s descents" },
    { ex: "asstPullup", scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 with minimal assist" },
    { ex: "chinup",     scheme: { sets: 3, reps: [3, 8] },    crit: "3×8 strict" },
    { ex: "pullup",     scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 strict" },
    { ex: "ctbPullup",  scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 to the chest" },
    { ex: "archPullup", scheme: { sets: 3, reps: [3, 5] },    crit: "3×5 per side" },
    { ex: "wtdPullup",  scheme: { sets: 3, reps: [5, 8] },    crit: "Add 2.5kg at 3×5" },
  ]},
  hpull: { name: "Row", icon: "🚣", rungs: [
    { ex: "rowBent",    scheme: { sets: 3, reps: [8, 12] },   crit: "3×12, chest to handles" },
    { ex: "rowStraight",scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 rigid line" },
    { ex: "rowElev",    scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 feet up" },
    { ex: "rowArcher",  scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 per side" },
  ]},
  dip: { name: "Dip", icon: "💥", rungs: [
    { ex: "dipSupport", scheme: { sets: 3, secs: [10, 20] },  crit: "60s accumulated" },
    { ex: "dipNeg",     scheme: { sets: 3, reps: [3, 5] },    crit: "3×5 with 5s descents" },
    { ex: "dipPartial", scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 near-full depth" },
    { ex: "dip",        scheme: { sets: 3, reps: [5, 8] },    crit: "3×10 strict" },
    { ex: "dipSlow",    scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 at 3-1-3 tempo" },
    { ex: "wtdDip",     scheme: { sets: 3, reps: [5, 8] },    crit: "Add 2.5kg at 3×5" },
  ]},
  push: { name: "Push-Up", icon: "🙌", rungs: [
    { ex: "pushIncline",scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 full range" },
    { ex: "pushup",     scheme: { sets: 3, reps: [8, 12] },   crit: "3×12, chest below handles" },
    { ex: "pushDecline",scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 rigid" },
    { ex: "pushDiamond",scheme: { sets: 3, reps: [8, 12] },   crit: "3×12" },
    { ex: "pushArcher", scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 per side" },
    { ex: "pushPseudo", scheme: { sets: 3, reps: [5, 8] },    crit: "Keep leaning further" },
  ]},
  vpush: { name: "Vertical Push", icon: "⛰️", rungs: [
    { ex: "pikePush",   scheme: { sets: 3, reps: [5, 8] },    crit: "3×8, head to floor" },
    { ex: "pikeElev",   scheme: { sets: 3, reps: [5, 8] },    crit: "3×8 feet elevated" },
    { ex: "wallHS",     scheme: { sets: 3, secs: [15, 30] },  crit: "60s hold, perfect line" },
    { ex: "hspuNeg",    scheme: { sets: 3, reps: [3, 5] },    crit: "3×5 slow negatives" },
    { ex: "hspu",       scheme: { sets: 3, reps: [3, 5] },    crit: "The summit — keep adding reps" },
  ]},
  vkr: { name: "Knee Raise", icon: "🪑", rungs: [
    { ex: "vkrBent",    scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 slow, zero swing" },
    { ex: "vkrChest",   scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 knees to chest" },
    { ex: "vkrStraight",scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 to parallel" },
    { ex: "hangKnee",   scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 dead-still between reps" },
    { ex: "hangLeg",    scheme: { sets: 3, reps: [5, 8] },    crit: "Optional summit — strict only" },
  ]},
  lsit: { name: "L-Sit", icon: "👑", rungs: [
    { ex: "lsitFoot",   scheme: { sets: 3, secs: [10, 20] },  crit: "60s accumulated" },
    { ex: "lsitTuck",   scheme: { sets: 4, secs: [5, 15] },   crit: "60s accumulated" },
    { ex: "lsitOne",    scheme: { sets: 3, secs: [8, 15] },   crit: "15s per side" },
    { ex: "lsitFull",   scheme: { sets: 3, secs: [5, 15] },   crit: "A clean 10–20s" },
  ]},
  squat: { name: "Squat", icon: "🦵", rungs: [
    { ex: "squatAsst",  scheme: { sets: 3, reps: [8, 10] },   crit: "3×10 comfortable" },
    { ex: "squat",      scheme: { sets: 3, reps: [15, 20] },  crit: "3×20, neutral spine" },
    { ex: "splitSquat", scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 per side" },
    { ex: "bulgSquat",  scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 → add backpack" },
    { ex: "stepup",     scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 knee-height" },
    { ex: "pistolAsst", scheme: { sets: 3, reps: [3, 5] },    crit: "Optional — only if back stays quiet" },
  ]},
  hinge: { name: "Hinge", icon: "🌉", rungs: [
    { ex: "gluteBridge",scheme: { sets: 3, reps: [12, 15] },  crit: "3×15 with 1s squeeze" },
    { ex: "slBridge",   scheme: { sets: 3, reps: [10, 15] },  crit: "3×15, level pelvis" },
    { ex: "hipThrust",  scheme: { sets: 3, reps: [10, 15] },  crit: "3×15 paused" },
    { ex: "slHipThrust",scheme: { sets: 3, reps: [8, 12] },   crit: "3×12 → add backpack" },
  ]},
};

/* ---------- Day templates ----------
   Slots reference a ladder (resolved at the user's current rung)
   or a fixed exercise. 'lite' marks slots dropped on yellow days.
*/
const DAY_TEMPLATES = {
  upperA: { name: "Upper A", tag: "Pull-biased strength", icon: "🔥", est: 45, blocks: [
    { ladder: "vpull", sets: 4, note: "Main lift — leave 2 reps in the tank" },
    { ladder: "dip",   sets: 3 },
    { ladder: "hpull", sets: 3 },
    { ladder: "push",  sets: 2, volume: true, lite: true, note: "Easy accessory sets" },
    { ladder: "vkr",   sets: 3, lite: true },
    { ex: "deadhang",  sets: 2, target: 30, lite: true, note: "Decompression finisher" },
  ]},
  lowerA: { name: "Lower A", tag: "Legs + trunk", icon: "🦵", est: 35, blocks: [
    { ladder: "squat", sets: 3 },
    { ladder: "hinge", sets: 3 },
    { ex: "slideCurl", sets: 3, target: 8, phaseMin: 3, lite: true },
    { ex: "calfRaise", sets: 3, target: 15, lite: true },
    { ex: "plank",     sets: 3, target: 15 },
    { ex: "sideplank", sets: 2, target: 20, lite: true },
  ]},
  upperB: { name: "Upper B", tag: "Push-biased + volume pull", icon: "⛰️", est: 45, blocks: [
    { ladder: "vpush", sets: 4, note: "Main lift" },
    { ladder: "push",  sets: 3 },
    { ladder: "vpull", sets: 3, volume: true, note: "Volume day — deliberately easier than Upper A" },
    { ladder: "dip",   sets: 2, volume: true, lite: true, note: "Easy second exposure" },
    { ladder: "hpull", sets: 2, volume: true, lite: true, note: "Easy second exposure" },
    { ladder: "lsit",  sets: 3, lite: true },
  ]},
  lowerB: { name: "Lower B", tag: "Legs + trunk", icon: "🌉", est: 35, blocks: [
    { ladder: "squat", sets: 3, volume: true, note: "Deliberately lighter than Lower A — stay 3+ reps from failure" },
    { ladder: "hinge", sets: 3 },
    { ex: "slRDL",     sets: 3, target: 8 },
    { ex: "calfRaise", sets: 3, target: 15, lite: true },
    { ex: "deadbug",   sets: 3, target: 8 },
    { ex: "suitcase",  sets: 2, target: 30, phaseMin: 2, lite: true },
  ]},
};
const DAY_ORDER = ["upperA", "lowerA", "upperB", "lowerB"];

/* Daily spine routine (the streak anchor — do it even on rest days) */
const SPINE_ROUTINE = {
  name: "Spine Reset", icon: "🧘", est: 10, blocks: [
    { ex: "catcamel", sets: 1, target: 6, note: "Slow — this is oil for the spine" },
    { ex: "curlup",   sets: 3, target: 0, pyramid: [5, 3, 1], note: "Each rep = an 8–10s hold" },
    { ex: "sideplank",sets: 3, target: 10, note: "10s holds — do both sides each set" },
    { ex: "birddog",  sets: 3, target: 0, pyramid: [5, 3, 1], note: "Each rep = an 8–10s hold, both sides" },
    { ex: "deadhang", sets: 1, target: 25, note: "Optional decompression — skip if legs tingle" },
  ],
};

/* 5-minute rescue circuit (streak saver) */
const RESCUE_ROUTINE = {
  name: "5-Minute Rescue", icon: "🚑", est: 5, blocks: [
    { ex: "catcamel",  sets: 1, target: 5 },
    { ex: "birddog",   sets: 1, target: 4, note: "8s holds" },
    { ex: "pushIncline", sets: 1, target: 10, note: "Or your current push-up level" },
    { ex: "squat",     sets: 1, target: 12, note: "Comfortable depth" },
    { ex: "deadhang",  sets: 1, target: 20 },
  ],
};

/* ---------- Phases ---------- */
const PHASES = [
  { n: 1, name: "Calm the Fire", weeks: "1–2+", color: "bad",
    desc: "The back is irritable. Daily Spine Reset + walking + gentle groundwork only. No dips, no pull-up negatives, nothing spicy.",
    gate: "Move to Phase 2 after 7+ days in a row of GREEN mornings with NO leg symptoms. (Yellow means hold, not advance.)" },
  { n: 2, name: "Foundation", weeks: "3–6", color: "warn",
    desc: "Full 4-day split begins at conservative rungs. Back-supported knee raises only, box-depth squats, hinge patterning daily.",
    gate: "Move to Phase 3 after 3+ weeks of consistent training with green mornings, symptoms gone or shrinking back toward the spine." },
  { n: 3, name: "Build", weeks: "7–12", color: "accent",
    desc: "Hanging knee raises, Bulgarians, elevated rows, tuck L-sits, bent-knee hollow holds unlock. Optional: a few easy pull-ups sprinkled through the day, never near failure.",
    gate: "Move to Phase 4 after 4–8 weeks fully symptom-free including mornings." },
  { n: 4, name: "Advance", weeks: "13+", color: "good",
    desc: "Weighted pull-ups & dips, archer work, HSPU negatives, full L-sit. Optional: hanging leg raises — low volume, never in the morning.",
    gate: "This is the long game now. Any flare-up = drop back a phase without ego." },
];

/* ---------- Badges (kept lean on purpose) ---------- */
const BADGES = [
  { id: "first",    icon: "⚒️", name: "First Strike",   test: (s) => s.log.filter(l => l.type === "strength").length >= 1 },
  { id: "spine7",   icon: "🧘", name: "Spine Guardian", test: (s) => s.log.filter(l => l.type === "spine").length >= 7 },
  { id: "streak7",  icon: "🔥", name: "One Week Forged",test: (s) => s.streak.best >= 7 },
  { id: "streak30", icon: "🌋", name: "30-Day Furnace", test: (s) => s.streak.best >= 30 },
  { id: "streak100",icon: "💯", name: "The 100 Club",   test: (s) => s.streak.best >= 100 },
  { id: "w10",      icon: "🛠️", name: "10 Workouts",    test: (s) => s.log.filter(l => l.type === "strength").length >= 10 },
  { id: "w50",      icon: "🏗️", name: "50 Workouts",    test: (s) => s.log.filter(l => l.type === "strength").length >= 50 },
  { id: "pullup1",  icon: "💪", name: "First Pull-Up",  test: (s) => s.levels.vpull >= 5 },
  { id: "dip1",     icon: "💥", name: "First Dip",      test: (s) => s.levels.dip >= 3 },
  { id: "phase3",   icon: "📈", name: "Phase 3 Rising", test: (s) => s.phase >= 3 },
  { id: "lsit",     icon: "👑", name: "L-Sit Royalty",  test: (s) => s.levels.lsit >= 3 },
  { id: "walk20",   icon: "🚶", name: "20 Walks",       test: (s) => s.log.filter(l => l.type === "walk").length >= 20 },
];

/* XP: informational, never gates content */
const XP_RULES = { set: 5, strength: 50, spine: 25, rescue: 15, quick: 30, walk: 10, pr: 20 };
const LEVELS_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000];
const LEVEL_NAMES = ["Spark", "Kindling", "Ember", "Flicker", "Flame", "Blaze", "Bonfire", "Forge", "Furnace", "Crucible", "Inferno", "Volcano", "Titan", "Colossus", "Juggernaut", "Legend"];

/* Rotating nudges for the Today screen */
const NUDGES = [
  "Discs hate the first hour after waking. Train 2–3h after you get up — your back will thank you.",
  "Strict beats swingy. Every rep you control is money in the bank.",
  "A 5-minute session still counts. Showing up IS the workout.",
  "Leg symptoms = stop that exercise. Back-only soreness that fades = usually fine.",
  "Walking is the most underrated back medicine there is. 30 minutes, most days.",
  "Abs are made in the kitchen, revealed by the deficit, protected by the brace.",
  "You don't need motivation, you need the first 60 seconds.",
  "Step DOWN from the bar. Never drop — the landing is where backs get hurt.",
  "Break up sitting every 20–30 minutes. Your disc pressure resets when you stand.",
  "Progress = hitting the top of the rep window, then climbing the ladder. No rush.",
];

/* Red flags — shown in onboarding and Plan screen */
const RED_FLAGS = [
  "Numbness in the groin / saddle area",
  "New trouble peeing (can't go) or controlling bladder / bowels",
  "Weakness in BOTH legs, or weakness getting worse",
  "A foot that drags or slaps when you walk (worsening)",
  "Fever, unexplained weight loss, or severe night pain",
];

/* ============================================================
   v2 — tower stations, guardrail patterns, split points
   ============================================================ */

/* Where on the tower each move happens (drives the station chips + mini-map). */
const EX_STATION = {
  deadhang: "bar", scapPull: "bar", negPullup: "bar", asstPullup: "bar", chinup: "bar", pullup: "bar",
  ctbPullup: "bar", archPullup: "bar", wtdPullup: "bar", hangKnee: "bar", hangLeg: "bar",
  rowBent: "dips", rowStraight: "dips", rowElev: "dips", rowArcher: "dips",
  dipSupport: "dips", dipNeg: "dips", dipPartial: "dips", dip: "dips", dipSlow: "dips", wtdDip: "dips",
  pushIncline: "dips",
  vkrBent: "knee", vkrChest: "knee", vkrStraight: "knee",
  pushup: "push", pushDecline: "push", pushPseudo: "push",
  lsitFoot: "push", lsitTuck: "push", lsitOne: "push", lsitFull: "push",
};
/* Guardrail pattern each move loads as a hard set (null = not a hard set:
   spine work, holds, hangs, calves). Research: docs/redesign/research.md §2. */
const EX_GP = {
  scapPull: "vpull", negPullup: "vpull", asstPullup: "vpull", chinup: "vpull", pullup: "vpull",
  ctbPullup: "vpull", archPullup: "vpull", wtdPullup: "vpull",
  rowBent: "hpull", rowStraight: "hpull", rowElev: "hpull", rowArcher: "hpull",
  dipSupport: "push", dipNeg: "push", dipPartial: "push", dip: "push", dipSlow: "push", wtdDip: "push",
  pushIncline: "push", pushup: "push", pushDecline: "push", pushDiamond: "push", pushArcher: "push", pushPseudo: "push",
  pikePush: "push", pikeElev: "push", wallHS: "push", hspuNeg: "push", hspu: "push",
  vkrBent: "trunk", vkrChest: "trunk", vkrStraight: "trunk", hangKnee: "trunk", hangLeg: "trunk",
  lsitFoot: "trunk", lsitTuck: "trunk", lsitOne: "trunk", lsitFull: "trunk", hollowBent: "trunk", hollow: "trunk",
  squatAsst: "knee", squat: "knee", splitSquat: "knee", bulgSquat: "knee", stepup: "knee", pistolAsst: "knee",
  gluteBridge: "hip", slBridge: "hip", hipThrust: "hip", slHipThrust: "hip", slideCurl: "hip", slRDL: "hip",
};
const GP_NAMES = { vpull: "pull-up", hpull: "row", push: "push", knee: "leg", hip: "glute & hamstring", trunk: "core" };

/* Tower-specific cues from the YTA03 specs + owner feedback (research §3). */
const TOWER_CUES = {
  bar: "Use the angled ends of the bar — friendlier on wrists and elbows. Knees bent, ankles crossed behind you to clear the crossbar.",
  dips: "Grip the angled handles under the arm pads (the ones curving down and out). Keep your legs still — the tower wobbles if you swing.",
  knee: "Back flat on the pad, forearms on the foam pads, hands on the upright grips.",
  push: "Hands on the two angled grips on the front feet of the base — extra depth and neutral wrists.",
  floor: "On the mat in front of the tower.",
};

for (const [id, e] of Object.entries(EX)) {
  e.st = EX_STATION[id] || "floor";
  e.gp = EX_GP[id] || null;
}

/* Templates: body region (a 2nd full session must be the other region) and the
   split point for AM + PM days (blocks before it = part 1). Knee raises / L-sits
   always land in one part only, so trunk flexion never happens twice in a day. */
Object.assign(DAY_TEMPLATES.upperA, { region: "upper", split: 3, short: "Pull day" });
Object.assign(DAY_TEMPLATES.lowerA, { region: "lower", split: 3, short: "Legs + core" });
Object.assign(DAY_TEMPLATES.upperB, { region: "upper", split: 3, short: "Push day" });
Object.assign(DAY_TEMPLATES.lowerB, { region: "lower", split: 3, short: "Legs + core" });

/* Badge icons from the sprite (emoji retired in v2). */
const BADGE_ICONS = { first: "check", spine7: "spine", streak7: "flame", streak30: "flame", streak100: "trophy",
  w10: "star", w50: "trophy", pullup1: "st-bar", dip1: "st-dips", phase3: "progress", lsit: "st-push", walk20: "walk" };
