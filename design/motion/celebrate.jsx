// FORGE "workout complete" celebration, 320x320 (shown at 160x160 CSS px), transparent, plays once.
// Build:   design/motion/make.sh   (svg2ec -> ecbuild -> PNG frames -> animated WebP + still + contact sheet)
// Beats:   1. orange disc pops with overshoot, the white FORGE mark pops with it: the bar draws out
//             from the middle and the figure rises into "chin over the bar"
//          2. radial burst of rounded strokes and dots in the station colours + brand orange
//          3. a soft orange ring expands and fades
//          4. three sparkles twinkle, then everything settles on disc + mark (the final frame holds)
// The mark geometry comes from assets/brand/mark.svg (recoloured white -> mark-white.svg -> svg2ec).

var CONFIG = {
  size: 320, fps: 30, duration: 1.8,
  disc: { r: 90, top: "#FF8A3D", bottom: "#EE4B12" },   // same gradient as the app icon
  markSize: 138,                                         // mark's 128-unit canvas drawn at this many px
  orange: "#F2541B",
  burst: ["#1D5BD6", "#B8286A", "#45C6A8", "#9F80F6", "#F2541B"],  // bar, dips, knee, push, brand
  rays: { n: 10, r0: 100, r1: 146, short: 12, width: 8, t: 0.19 },   // odd rays end `short` px sooner
  dots: { r0: 98, r1: 130, size: 11, t: 0.23 },
  // the ring thins out rather than fading through low opacity (low-opacity orange over the dark
  // screen reads muddy brown); a lighter orange than the brand keeps it luminous on dark
  // kept opaque: any partial opacity of orange over #0E1320 turns copper-brown, so it goes by thinning
  ring: { from: 182, to: 280, w0: 7, w1: 0, t: 0.16, len: 0.40, color: "#FF8A4C", opacity: 100, blur: 0.5 },
  sparkles: [
    { pos: [258, 64],  r: 16, color: "#F2541B", t: 0.48 },
    { pos: [54, 116],  r: 13, color: "#9F80F6", t: 0.62 },
    { pos: [240, 262], r: 12, color: "#45C6A8", t: 0.76 }
  ]
};
EC.applyOverrides(CONFIG);

app.beginUndoGroup("FORGE celebrate");
var C = CONFIG, S = C.size, CX = S / 2, CY = S / 2;
var comp = EC.comp("Celebrate", S, S, C.duration, C.fps, "#0E1320");

// Keys with per-key ease: list of [time, value, influenceIn, influenceOut] (influence 0.1..100).
function keysX(prop, list) {
  for (var i = 0; i < list.length; i++) prop.setValueAtTime(list[i][0], list[i][1]);
  var t = prop.propertyValueType, dims = 1;
  if (t !== PropertyValueType.TwoD_SPATIAL && t !== PropertyValueType.ThreeD_SPATIAL && prop.value instanceof Array) dims = prop.value.length;
  for (var k = 1; k <= prop.numKeys; k++) {
    var e = list[k - 1], a = [], b = [];
    for (var d = 0; d < dims; d++) { a.push(new KeyframeEase(0, e[2] || 33)); b.push(new KeyframeEase(0, e[3] || 33)); }
    prop.setTemporalEaseAtKey(k, a, b);
  }
  if (t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL) {   // straight motion paths
    var zero = []; for (var z = 0; z < prop.value.length; z++) zero.push(0);
    for (var s = 1; s <= prop.numKeys; s++) {
      prop.setSpatialAutoBezierAtKey(s, false); prop.setSpatialContinuousAtKey(s, false);
      prop.setSpatialTangentsAtKey(s, zero, zero);
    }
  }
  return prop;
}
function pt(r, deg) { var a = deg * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; }
function sc(v) { return [v, v]; }

// ---- 3. Ring (bottom layer: it starts at the disc's edge and runs outward) ----
var ring = EC.shape(comp, "Ring");
var rg = EC.group(ring.contents, "ring");
var rEl = EC.ellipse(rg.contents, [C.ring.from, C.ring.from]);
var rSt = EC.stroke(rg.contents, C.ring.color, C.ring.w0);
var t0 = C.ring.t, t1 = C.ring.t + C.ring.len;
keysX(rEl.property("ADBE Vector Ellipse Size"), [[t0, sc(C.ring.from), 33, 8], [t1, sc(C.ring.to), 90, 33]]);
keysX(rSt.property("ADBE Vector Stroke Width"), [[t0, C.ring.w0, 33, 30], [t1, C.ring.w1, 30, 33]]);
// "vanish" keys arrive at speed (low incoming influence): a slow landing on 0 leaves faint specks
keysX(EC.tr(ring.layer, "opacity"), [[t0, 0, 33, 33], [t0 + 0.03, C.ring.opacity, 33, 20], [t0 + C.ring.len * 0.7, C.ring.opacity, 33, 20], [t1, 0, 15, 33]]);
if (C.ring.blur) EC.fx(ring.layer, "ADBE Gaussian Blur 2", { "Blurriness": C.ring.blur });

// ---- 2a. Rays: rounded strokes that shoot out (trim End leads, trim Start chases) ----
var rays = EC.shape(comp, "Rays");
for (var i = 0; i < C.rays.n; i++) {
  var ang = -90 + i * 360 / C.rays.n;
  var g = EC.group(rays.contents, "ray " + (i + 1));
  EC.path(g.contents, [pt(C.rays.r0, ang), pt(C.rays.r1 - (i % 2) * C.rays.short, ang)], false);
  var st = EC.stroke(g.contents, C.burst[i % C.burst.length], C.rays.width);
  st.property("Line Cap").setValue(2);   // round
  var tr = EC.trim(g.contents);
  var d = (i % 2) * 0.03;                 // every other ray a touch later: less mechanical
  var rt = C.rays.t + d;
  keysX(tr.property("ADBE Vector Trim End"),   [[rt, 0, 33, 10], [rt + 0.22, 100, 85, 33]]);
  keysX(tr.property("ADBE Vector Trim Start"), [[rt + 0.07, 0, 33, 20], [rt + 0.34, 100, 80, 33]]);
  // a zero-length round-capped stroke can still draw a dot: fade each ray out as it finishes
  keysX(g.transform.property("ADBE Vector Group Opacity"), [[rt + 0.26, 100, 33, 33], [rt + 0.34, 0, 33, 33]]);
}

// ---- 2b. Dots between the rays: fly out and shrink away ----
var dots = EC.shape(comp, "Dots");
for (var j = 0; j < C.rays.n; j++) {
  var angD = -90 + (j + 0.5) * 360 / C.rays.n;
  var gd = EC.group(dots.contents, "dot " + (j + 1));
  EC.ellipse(gd.contents, sc(C.dots.size));
  EC.fill(gd.contents, C.burst[(j + 2) % C.burst.length]);
  var dt = C.dots.t + (j % 2) * 0.03;
  var gp = gd.transform.property("ADBE Vector Position");
  keysX(gp, [[dt, pt(C.dots.r0, angD), 33, 10], [dt + 0.40, pt(C.dots.r1 - (j % 2) * 10, angD), 85, 33]]);
  // scale 0 until it launches (before its first key a property holds that key's value)
  keysX(gd.transform.property("ADBE Vector Scale"), [[dt, sc(0), 33, 20], [dt + 0.07, sc(100), 50, 33], [dt + 0.20, sc(100), 33, 30], [dt + 0.36, sc(0), 12, 33]]);
}

// ---- 1. Disc and mark ----
var disc = EC.shape(comp, "Disc");
var dg = EC.group(disc.contents, "disc");
EC.ellipse(dg.contents, sc(C.disc.r * 2));
EC.gradientFill(dg.contents, [[0, C.disc.top], [1, C.disc.bottom]], [0, -C.disc.r], [0, C.disc.r], "linear");

var POP = [[0.00, sc(0), 33, 12], [0.18, sc(112), 60, 45], [0.30, sc(95), 50, 50], [0.40, sc(101.5), 50, 50], [0.48, sc(100), 60, 33]];
function popAt(delay) { var l = []; for (var p = 0; p < POP.length; p++) l.push([POP[p][0] + delay, POP[p][1], POP[p][2], POP[p][3]]); return l; }
keysX(EC.tr(disc.layer, "scale"), popAt(0));

var mark = EC.svg(comp, "mark", { pos: [CX, CY], size: C.markSize });
keysX(EC.tr(mark.layer, "scale"), popAt(0.05));
// the bar draws out from its middle
var parts = {}; for (var q = 0; q < mark.parts.length; q++) parts[mark.parts[q].name] = mark.parts[q];
var barTrim = EC.trim(parts.bar.group.contents);
keysX(barTrim.property("ADBE Vector Trim Start"), [[0.08, 50, 33, 10], [0.30, 0, 85, 33]]);
keysX(barTrim.property("ADBE Vector Trim End"),   [[0.08, 50, 33, 10], [0.30, 100, 85, 33]]);
// the figure rises into "chin over the bar", overshoots a hair and settles
var fig = ["arms", "torso", "head"];
for (var f = 0; f < fig.length; f++) {
  var P = parts[fig[f]], base = P.position.value, fd = f * 0.025;
  // no opacity fade: separately faded groups show their overlaps (ghostly arms over the torso)
  keysX(P.position, [[0.10 + fd, [base[0], base[1] + 12], 33, 10], [0.32 + fd, [base[0], base[1] - 3], 80, 40], [0.44 + fd, base, 60, 33]]);
}

// ---- 4. Sparkles: four-point stars that twinkle and turn ----
function star(contents, r) {
  var k = r * 0.2, v = [[0, -r], [k, -k], [r, 0], [k, k], [0, r], [-k, k], [-r, 0], [-k, -k]];
  return EC.path(contents, v, true);
}
for (var s2 = 0; s2 < C.sparkles.length; s2++) {
  var SP = C.sparkles[s2];
  var sl = EC.shape(comp, "Sparkle " + (s2 + 1));
  var sg = EC.group(sl.contents, "star");
  star(sg.contents, SP.r);
  EC.fill(sg.contents, SP.color);
  EC.tr(sl.layer, "position").setValue(SP.pos);
  keysX(EC.tr(sl.layer, "scale"), [[SP.t, sc(0), 33, 15], [SP.t + 0.14, sc(110), 70, 30], [SP.t + 0.22, sc(100), 40, 30], [SP.t + 0.42, sc(0), 15, 33]]);
  keysX(EC.tr(sl.layer, "rotation"), [[SP.t, -40, 33, 10], [SP.t + 0.42, 50, 60, 33]]);
}

app.endUndoGroup();
writeLn("built " + comp.name + ": " + comp.numLayers + " layers, " + comp.duration + " s @ " + comp.frameRate + " fps");
