#!/usr/bin/env python3
"""FORGE - Sportsroyals Power Tower YTA03 technical drawing, built with CADCraft.

Writes two CADCraft recipes next to this file and runs them with the cadcraft skill's runner
(~/.claude/skills/cadcraft/scripts/ccraft.py, headless):

  tower-drawing.json      A4 landscape sheet, 1:25: front elevation + plan with the clear
                          training zone, station callouts, notes and a title block.
                          -> design/print/tower-drawing.dxf / .dwg (CAD masters)
                          -> print/tower-drawing.pdf               (A4 landscape)
                          -> design/print/tower-drawing.png        (preview)
  tower-drawing-app.json  The same geometry for the app's "Your tower" screen: plan stacked under
                          the elevation, no callouts or title block, bigger annotation.
                          -> design/print/tower-drawing-app-raw.svg (CADCraft model-space export)
                          -> assets/tower-drawing.svg (cleaned here: 640-wide viewBox, transparent,
                             grouped by station, brand stroke widths)

Units: mm, model space y up, x = 0 on the tower's centre line, y = 0 on the floor (elevation) or
the front edge of the base (plan). Sizes marked "approx." are estimates from product photos.

Run: python3 design/print/tower_drawing.py
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CCRAFT = os.path.expanduser("~/.claude/skills/cadcraft/scripts/ccraft.py")

# Brand colours as CADCraft true colours ("r,g,b")
INK = "20,32,51"          # #142033
MUTED = "95,105,124"      # #5F697C
LINES = "221,227,236"     # #DDE3EC
EMBER = "242,84,27"       # #F2541B
BAR = "29,91,214"         # #1D5BD6
DIPS = "184,40,106"       # #B8286A
KNEE = "69,198,168"       # #45C6A8
KNEE_DK = "11,110,90"     # #0B6E5A (teal for lines and text on white)
PUSH = "159,128,246"      # #9F80F6
FLOOR = "107,118,144"     # #6B7690
MAT_TINT = "232,235,241"  # light floor tint for the mat in plan
ZONE_TINT = "254,238,232" # ~10% ember

BULGE90 = 0.414214        # tan(90deg / 4): a quarter-circle polyline segment

# ---------------------------------------------------------------- geometry (mm, approx. where noted)
TOP, LOW = 2200, 1450               # bar heights (top of the bar's upturned ends) - real spec
BAR_D, BAR_RISE = 32, 80            # tube diameter, rise of the angled ends - approx.
BAR_LEN = 1041                      # real spec
BAR_TIP = BAR_LEN / 2 - BAR_D / 2   # centre of the end caps
BAR_STRAIGHT = 380                  # half-length of the straight centre - approx.
UP_C = 285                          # uprights 570 c/c - real spec
BASE_W, BASE_D = 1050, 870          # footprint - real spec (depth ~870)


def bar_y(top):
    """Centre-line heights (straight part, tips) for a bar whose highest point is `top`."""
    tip = top - BAR_D / 2
    return tip - BAR_RISE, tip


class Recipe:
    def __init__(self):
        self.steps = []
        self.n = 0

    def name(self, prefix):
        self.n += 1
        return f"{prefix}{self.n}"

    def add(self, cmd, params, layer=None, as_=None):
        st = {"id": cmd, "params": params}
        if layer:
            st["layer"] = layer
        if as_:
            st["as"] = as_
        self.steps.append(st)
        return st

    def comment(self, text):
        self.steps.append({"comment": text})


def P(x, y):
    return [round(x, 3), round(y, 3)]


class Drawer:
    """Draws into a Recipe with an (ox, oy) offset, so one view can be placed anywhere.

    app=True draws outlines only: no hatches and zero-width station polylines. The SVG cleaner then
    fills the closed outlines and strokes the station centre lines with round caps, which keeps the
    app asset small (CADCraft's SVG export triangulates every fill)."""

    def __init__(self, rec, ox=0.0, oy=0.0, app=False):
        self.r, self.ox, self.oy, self.app = rec, ox, oy, app

    def p(self, x, y):
        return P(x + self.ox, y + self.oy)

    def fill(self, handle_name, fill_layer):
        if self.app:
            return
        # CADCraft puts a new hatch at the back of the draw order, so bring the fill and then its
        # outline to the front: each part then paints over the parts drawn before it.
        h = self.r.name("h")
        self.r.add("hatch", {"handles": [f"${handle_name}"], "pattern": "SOLID"}, fill_layer, h)
        self.r.add("draworder.front", {"handles": [f"${h}"]})
        self.r.add("draworder.front", {"handles": [f"${handle_name}"]})

    def rect(self, x0, y0, x1, y1, layer, fill=None, fillet=None, rotate=None):
        a = self.r.name("r")
        prm = {"p1": self.p(x0, y0), "p2": self.p(x1, y1)}
        if fillet:
            prm["fillet"] = fillet
        self.r.add("rectang", prm, layer, a)
        if rotate:
            (bx, by), ang = rotate
            self.r.add("rotate", {"handles": [f"${a}"], "base": self.p(bx, by), "angle": ang})
        if fill:
            self.fill(a, fill)
        return a

    def pline(self, verts, layer, closed=False, width=None, fill=None, caps=False):
        vs = []
        for v in verts:
            if len(v) == 3 and v[2]:
                vs.append({"p": self.p(v[0], v[1]), "bulge": v[2]})
            else:
                vs.append(self.p(v[0], v[1]))
        prm = {"vertices": vs}
        if closed:
            prm["closed"] = True
        if width and not self.app:
            prm["width"] = width
        a = self.r.name("p")
        self.r.add("pline", prm, layer, a)
        if fill:
            self.fill(a, fill)
        if caps and width and not self.app:  # round caps and joints, as the brand's round-capped strokes
            for v in verts:
                self.dot((v[0], v[1]), width, layer)
        return a

    def dot(self, c, d, layer, inside=0):
        self.r.add("donut", {"center": self.p(*c), "inside": inside, "outside": d}, layer)

    def line(self, a, b, layer):
        self.r.add("line", {"points": [self.p(*a), self.p(*b)]}, layer)

    def text(self, at, s, h, layer, justify=None):
        prm = {"at": self.p(*at), "text": s, "height": h}
        if justify:
            prm["justify"] = justify
        self.r.add("text", prm, layer)

    def dim(self, p1, p2, at, text, layer="DIMS"):
        self.r.add("dimlinear", {"p1": self.p(*p1), "p2": self.p(*p2), "at": self.p(*at), "text": text}, layer)


# ---------------------------------------------------------------- the two views

def elevation(d, app=False):
    """Front elevation, floor centre at the origin. Bar solid at the top setting, dashed at the lowest."""
    th = 85 if app else 62.5          # label text height (model mm)
    d.r.comment("FRONT ELEVATION - floor, ceiling, frame, stations, dimensions")
    d.line((-1150, 0), (1150, 0), "ST-FLOOR")
    d.line((-1150, 2500), (1150, 2500), "CEIL")

    # Frame (tubes as outlines over a light fill). Approx. tube sizes: 50 outer, 40 inner.
    d.rect(-260, 530, 260, 570, "FRAME", "FRAME-FILL")                     # rear crossbar, approx. 550
    for s in (-1, 1):                                                       # curved side braces
        d.pline([(s * 520, 50, s * BULGE90), (s * 310, 260), (s * 310, 220, -s * BULGE90), (s * 480, 50)],
                "FRAME", closed=True, fill="FRAME-FILL")
    d.rect(-525, 0, 525, 50, "FRAME", "FRAME-FILL", fillet=8)              # base 1050
    for s in (-1, 1):
        d.rect(s * 260, 50, s * 310, 1300, "FRAME", "FRAME-FILL")           # lower uprights
        d.rect(s * 265, 1325, s * 305, bar_y(TOP)[0], "FRAME", "FRAME-FILL")  # sliding upper tube
        d.rect(s * 255, 1300, s * 315, 1325, "FRAME", "FRAME-FILL")         # height-adjust collar
        d.rect(s * 265, 1195, s * 305, 1235, "FRAME", "FRAME-FILL")         # arm support, end-on

    # Knee-raise station: backrest (approx. 800-1300) and arm pads (approx. 1250-1300, 10 deg inward)
    d.rect(-140, 820, 140, 1280, "ST-KNEE", "ST-KNEE-FILL", fillet=40)
    for s in (-1, 1):
        cx = s * 270
        d.rect(cx - 55, 1240, cx + 55, 1300, "ST-KNEE", "ST-KNEE-FILL", fillet=22, rotate=((cx, 1270), s * 10))

    # Dip handles: J-shaped, grip approx. 1150-1200, flaring outward
    for s in (-1, 1):
        d.pline([(s * 300, 1215), (s * 360, 1175), (s * 470, 1175)], "ST-DIPS", width=BAR_D, caps=True)

    # Pull-up bar: top setting solid, lowest setting dashed
    yb, yt = bar_y(TOP)
    d.pline([(-BAR_TIP, yt), (-BAR_STRAIGHT, yb), (BAR_STRAIGHT, yb), (BAR_TIP, yt)], "ST-BAR", width=BAR_D, caps=True)
    lb, lt = bar_y(LOW)
    d.pline([(-BAR_TIP, lt), (-BAR_STRAIGHT, lb), (BAR_STRAIGHT, lb), (BAR_TIP, lt)], "BAR-LOW")

    # Push-up handles: pegs on the curved braces, approx. 150-250 high
    for s in (-1, 1):
        d.pline([(s * 462, 158), (s * 508, 238)], "ST-PUSH", width=BAR_D, caps=True)

    # Floor mat in front of the tower
    d.rect(-900, 0, 900, 20, "ST-FLOOR", "ST-FLOOR-FILL")

    # Ceiling label
    if app:
        d.text((-1150, 2560), "Ceiling min. 2500", th, "LABEL")
    else:
        d.text((-1150, 2645), "Ceiling: min. 2500", th, "LABEL")
        d.text((-1150, 2560), "bar height + approx. 300 head clearance", 50, "LABEL-SUB")

    d.r.comment("Elevation dimensions (DIMSCALE = plot scale; text overrides say what each one is)")
    d.dim((-BAR_TIP, LOW), (-525, 0), (-720, 725), "1450 lowest" if app else "1450 (lowest, dashed)")
    d.dim((-BAR_TIP, TOP), (-525, 0), (-920, 1100), "2200 top" if app else "2200 (top setting)")
    d.dim((-1000, 2500), (-525, 0), (-1120, 1250), "2500 min. ceiling")
    d.dim((-UP_C, 50), (UP_C, 50), (0, -250), "570 c/c")
    d.dim((-525, 0), (525, 0), (0, -450), "1050")
    d.dim((-BAR_LEN / 2, yt), (BAR_LEN / 2, yt), (0, 2360), "1041")

    if app:
        return
    d.r.comment("Station callouts: numbered rings match the plan; leaders in station colours")
    callouts = [
        (1, "CO-BAR", (442, 2144), 2200, "Pull-up bar", "9 heights, 1450-2200"),
        (3, "CO-KNEE", (300, 1293), 1450, "Knee-raise pads", "1250-1300 approx."),
        (2, "CO-DIPS", (470, 1175), 1235, "Dip handles", "grip 1150-1200 approx."),
        (3, "CO-KNEE", (140, 1000), 1015, "Backrest", "800-1300 approx."),
        (0, "CO-MUTED", (200, 550), 700, "Rear crossbar", "knee height, approx."),
        (4, "CO-PUSH", (500, 226), 440, "Push-up handles", "150-250 approx."),
        (5, "CO-FLOOR", (600, 10), 190, "Floor mat", "approx. 1800 x 600"),
    ]
    for num, lay, tgt, yt_, title, sub in callouts:
        cy = yt_ + 31
        d.dot(tgt, 30, lay)
        if num:
            d.line(tgt, (648, cy), lay)
            d.dot((700, cy), 104, lay, inside=86)
            d.text((700, cy), str(num), 55, "CO-TEXT", justify="MC")
            d.text((780, yt_), title, 62.5, "CO-TEXT")
        else:
            d.line(tgt, (740, cy), lay)
            d.text((780, yt_), title, 62.5, "CO-SUB")
        d.text((780, yt_ - 85), sub, 50, "CO-SUB")


def plan(d, app=False):
    """Plan: x across, y from the front edge of the base (0) to the rear (870). Front is down."""
    th = 85 if app else 62.5
    d.r.comment("PLAN - clear training zone, mat, frame, stations")
    # Zone tint first (boundary on the tint layer, invisible), outline last so it stays on top
    zt = d.rect(-1025, -600, 1025, BASE_D, "ZONE-TINT")
    if not app:
        d.r.add("hatch", {"handles": [f"${zt}"], "pattern": "SOLID"}, "ZONE-TINT")
    d.rect(-900, -600, 900, 0, "ST-FLOOR", "ST-MAT-TINT")                    # mat approx. 1800 x 600
    for s in (-1, 1):
        d.rect(s * 475, 0, s * 525, BASE_D, "FRAME", "FRAME-FILL", fillet=8)  # feet
    d.rect(-475, 820, 475, BASE_D, "FRAME", "FRAME-FILL")                      # rear base tube
    for s in (-1, 1):
        d.rect(s * 265, 470, s * 305, 820, "FRAME", "FRAME-FILL")              # arm supports
    for s in (-1, 1):
        d.pline([(s * 290, 480), (s * 360, 430), (s * 470, 380)], "ST-DIPS", width=BAR_D, caps=True)
    for s in (-1, 1):
        d.rect(s * 215, 500, s * 325, 790, "ST-KNEE", "ST-KNEE-FILL", fillet=22)  # arm pads
    d.rect(-140, 740, 140, 790, "ST-KNEE", "ST-KNEE-FILL", fillet=15)          # backrest
    for s in (-1, 1):
        d.rect(s * 275, 650, s * 295, 820, "FRAME", "FRAME-FILL")              # bar brackets
        d.rect(s * 260, 820, s * 310, BASE_D, "FRAME", "FRAME-FILL")           # uprights
        d.rect(s * 265, 825, s * 305, 865, "FRAME")                            # sliding tube
    d.pline([(-BAR_TIP, 650), (BAR_TIP, 650)], "ST-BAR", width=BAR_D, caps=True)
    for s in (-1, 1):
        d.pline([(s * 465, 845), (s * 508, 775)], "ST-PUSH", width=BAR_D, caps=True)
    d.rect(-1025, -600, 1025, BASE_D, "ZONE")

    d.text((-1025, 915), "Clear training zone (min.)" if app else "Clear training zone", th, "ZONE-LABEL")
    d.text((-440, -300 - th / 2), "Floor mat (front)", th, "LABEL")

    d.r.comment("Plan dimensions: zone minimums, footprint, uprights")
    m = "" if app else " min."
    d.dim((-1025, -600), (-525, 0), (-775, -800), "500" + m)
    d.dim((-525, 0), (525, 0), (0, -800), "1050")
    d.dim((525, 0), (1025, -600), (775, -800), "500" + m)
    d.dim((-1025, -600), (1025, -600), (0, -1000), "2050" + m)
    d.dim((1025, -600), (525, 0), (1225, -300), "600" + m)
    if app:  # bigger figures: give the depth its own side so "870 approx." has room
        d.dim((-525, 0), (-525, BASE_D), (-1225, 435), "870 approx.")
    else:
        d.dim((525, 0), (525, BASE_D), (1225, 435), "870 approx.")
    d.dim((1025, -600), (1025, BASE_D), (1425, 135), "1470" + m)

    if app:
        return
    d.r.comment("Station numbers (same as the elevation callouts)")
    tags = [(1, "CO-BAR", (BAR_TIP + 16, 650), (700, 650)),
            (2, "CO-DIPS", (486, 380), (700, 380)),
            (3, "CO-KNEE", (-325, 600), (-700, 560)),
            (4, "CO-PUSH", (-516, 770), (-700, 760))]
    for num, lay, tgt, c in tags:
        d.dot(tgt, 30, lay)
        d.line(tgt, (c[0] - 52 if c[0] > 0 else c[0] + 52, c[1]), lay)
        d.dot(c, 104, lay, inside=86)
        d.text(c, str(num), 55, "CO-TEXT", justify="MC")
    d.dot((-520, -300), 104, "CO-FLOOR", inside=86)
    d.text((-520, -300), "5", 55, "CO-TEXT", justify="MC")


# ---------------------------------------------------------------- FORGE logo (from assets/brand/logo.svg)

def logo_block():
    """The FORGE lockup as CAD geometry: round-capped wide polylines + donuts, y flipped (96 - y)."""
    r = Recipe()
    d = Drawer(r)
    F = lambda x, y: (x, 96 - y)

    def stroke(pts, w, layer, bulges=None):
        verts = []
        for i, (x, y) in enumerate(pts):
            b = (bulges or {}).get(i, 0)
            verts.append((x, y, b) if b else (x, y))
        d.pline(verts, layer, width=w, caps=True)

    # Mark
    stroke([F(8.001, 29.864), F(80.882, 29.864)], 8.746, "LOGO-INK")
    stroke([F(26.95, 29.864), F(18.933, 50.271), F(34.238, 61.203)], 10.203, "LOGO-EMBER")
    stroke([F(61.933, 29.864), F(69.95, 50.271), F(54.645, 61.203)], 10.203, "LOGO-EMBER")
    stroke([F(44.441, 61.932), F(44.441, 83.797)], 20.407, "LOGO-EMBER")
    d.dot(F(44.441, 17.475), 18.95, "LOGO-EMBER")
    # Wordmark "forge", stroke 13
    w = 13
    stroke([F(121.441, 66), F(121.441, 22), F(133.441, 10), F(140.441, 10)], w, "LOGO-INK", {1: -BULGE90})
    stroke([F(110.441, 26), F(134.441, 26)], w, "LOGO-INK")
    d.dot(F(174.441, 46), 40 + w, "LOGO-INK", inside=40 - w)
    stroke([F(215.441, 66), F(215.441, 26)], w, "LOGO-INK")
    stroke([F(215.441, 44), F(233.441, 26), F(237.441, 26)], w, "LOGO-INK", {0: -BULGE90})
    d.dot(F(268.441, 46), 40 + w, "LOGO-INK", inside=40 - w)
    stroke([F(288.441, 26), F(288.441, 70), F(270.441, 88), F(258.441, 88)], w, "LOGO-INK", {1: -BULGE90})
    stroke([F(308.941, 46), F(348.941, 46)], w, "LOGO-INK")
    # the "e" bowl: 320 degrees counter-clockwise (y up) from the bar's end, as two 160-degree arcs
    stroke([F(348.941, 46), (310.147, 56.840), F(344.241, 58.9)], w, "LOGO-INK", {0: 0.839100, 1: 0.839100})
    return r.steps


# ---------------------------------------------------------------- recipes

LAYERS_COMMON = {
    "FRAME": {"color": INK, "lineweight": 0.35, "description": "Tower frame tubes"},
    "FRAME-FILL": {"color": LINES, "lineweight": 0.09},
    "ST-BAR": {"color": BAR, "lineweight": 0.25, "description": "Pull-up bar"},
    "BAR-LOW": {"color": BAR, "lineweight": 0.35, "linetype": "DASHED2", "description": "Bar at the lowest setting"},
    "ST-DIPS": {"color": DIPS, "lineweight": 0.25, "description": "Dip handles"},
    "ST-KNEE": {"color": KNEE_DK, "lineweight": 0.25, "description": "Knee-raise pads + backrest"},
    "ST-KNEE-FILL": {"color": KNEE, "lineweight": 0.09},
    "ST-PUSH": {"color": PUSH, "lineweight": 0.25, "description": "Push-up handles"},
    "ST-FLOOR": {"color": FLOOR, "lineweight": 0.35, "description": "Floor and mat"},
    "ST-FLOOR-FILL": {"color": FLOOR, "lineweight": 0.09},
    "ST-MAT-TINT": {"color": MAT_TINT, "lineweight": 0.09},
    "ZONE": {"color": EMBER, "lineweight": 0.35, "linetype": "DASHED2", "description": "Clear training zone"},
    "ZONE-TINT": {"color": ZONE_TINT, "lineweight": 0.09},
    "ZONE-LABEL": {"color": EMBER, "lineweight": 0.25},
    "CEIL": {"color": MUTED, "lineweight": 0.25, "linetype": "DASHDOT", "description": "Minimum ceiling"},
    "DIMS": {"color": MUTED, "lineweight": 0.13},
    "LABEL": {"color": INK, "lineweight": 0.2},
    "LABEL-SUB": {"color": MUTED, "lineweight": 0.18},
}

LAYERS_SHEET = {
    "CO-BAR": {"color": BAR, "lineweight": 0.25},
    "CO-DIPS": {"color": DIPS, "lineweight": 0.25},
    "CO-KNEE": {"color": KNEE_DK, "lineweight": 0.25},
    "CO-PUSH": {"color": PUSH, "lineweight": 0.25},
    "CO-FLOOR": {"color": FLOOR, "lineweight": 0.25},
    "CO-MUTED": {"color": MUTED, "lineweight": 0.18},
    "CO-TEXT": {"color": INK, "lineweight": 0.25},
    "CO-SUB": {"color": MUTED, "lineweight": 0.18},
    "LOGO-INK": {"color": INK, "lineweight": 0.09},
    "LOGO-EMBER": {"color": EMBER, "lineweight": 0.09},
    "G-SHEET": {"color": INK, "lineweight": 0.35},
    "G-TTLB": {"color": INK, "lineweight": 0.18},
    "G-TTLB-SUB": {"color": MUTED, "lineweight": 0.18},
    "G-VPORT": {"color": 8, "plot": False, "description": "Viewport frames (not plotted)"},
}

DIMSTYLE = {"DIMDEC": 0, "DIMTSZ": 1.5, "DIMTAD": 1, "DIMTIH": 0, "DIMTOH": 0,
            "DIMEXO": 2, "DIMEXE": 1.5, "DIMDLE": 1.5, "DIMGAP": 0.8, "current": True}

PLAN_X = 4300  # plan origin in model space on the sheet drawing (beside the elevation)


def sheet_recipe():
    r = Recipe()
    elevation(Drawer(r, 0, 0))
    plan(Drawer(r, PLAN_X, 0))

    s = Recipe()  # paper space, mm from the sheet's lower-left corner
    d = Drawer(s)
    s.comment("Border and title block (bottom right)")
    d.rect(10, 10, 287, 200, "G-SHEET")
    d.rect(147, 10, 287, 34, "G-TTLB")
    d.line((147, 20), (287, 20), "G-TTLB")
    d.line((185, 20), (185, 34), "G-TTLB")
    d.line((221, 10), (221, 20), "G-TTLB")
    d.line((255, 10), (255, 20), "G-TTLB")
    s.add("insert", {"name": "FORGELOGO", "at": [150.2, 23.4], "scale": 0.09}, "G-TTLB")
    d.text((188, 28), "Sportsroyals Power Tower YTA03", 3.0, "G-TTLB")
    d.text((188, 23), "Front elevation + plan, clear training zone", 2.2, "G-TTLB-SUB")
    d.text((149.5, 13.6), "Dimensions in mm, approx. where marked", 2.0, "G-TTLB")
    d.text((223.5, 13.6), "Scale 1:25 @ A4", 2.0, "G-TTLB")
    d.text((257.5, 13.6), "2026-10-21", 2.0, "G-TTLB")

    s.comment("View titles and line legend (bottom left)")
    d.text((16, 29), "Front elevation", 4.0, "CO-TEXT")
    d.text((77, 29), "1:25", 2.5, "CO-SUB")
    d.pline([(16, 20), (26, 20)], "ST-BAR", width=0.9)
    d.text((29, 19.1), "Bar at top setting (2200)", 2.0, "CO-SUB")
    d.line((80, 20), (90, 20), "BAR-LOW")
    d.text((93, 19.1), "Bar at lowest (1450)", 2.0, "CO-SUB")
    d.line((16, 14), (26, 14), "ZONE")
    d.text((29, 13.1), "Clear training zone (min.)", 2.0, "CO-SUB")
    d.line((80, 14), (90, 14), "CEIL")
    d.text((93, 13.1), "Minimum ceiling", 2.0, "CO-SUB")
    d.text((150, 101), "Plan with clear training zone", 4.0, "CO-TEXT")
    d.text((262, 101), "1:25", 2.5, "CO-SUB")

    s.comment("Notes")
    d.text((150, 93), "Notes", 2.8, "CO-TEXT")
    notes = ("1. Keep the orange zone clear: min. 600 in front (rows, dips, push-ups), min. 500 each side."
             "\\P2. Ceiling: bar height + approx. 300 head clearance, so approx. 2500 at the top setting."
             "\\P3. Max. load 150 kg. Tower weight 20 kg. No anchor holes: flat, level floor; check bolts weekly."
             "\\P4. Arm pads tilt 10° inward. Backrest height is fixed; its depth has 5 positions."
             "\\P5. Bar: 9 heights from 1450 to 2200, approx. 94 apart. Rear crossbar at about knee height:"
             " bend your knees behind you on pull-ups."
             "\\P6. approx. = estimated from product photos, not maker data. Check your own tower.")
    s.add("mtext", {"at": [150, 89], "text": notes, "height": 2.2, "width": 134, "attach": 1,
                    "lineSpacing": 1.0}, "CO-SUB")

    return {
        "comment": "FORGE tower drawing, A4 landscape 1:25. Generated by tower_drawing.py - edit that, not this.",
        "new": {"metric": True},
        "units": {"insunits": 4, "luprec": 0},
        "layers": {**LAYERS_COMMON, **LAYERS_SHEET},
        "dimStyles": {"TOWER25": {"DIMSCALE": 25, **DIMSTYLE}},
        "blocks": {"FORGELOGO": {"comment": "FORGE lockup, 357 x 96 units (logo.svg), base at 0,0",
                                 "layer": "0", "base": [0, 0], "steps": logo_block()}},
        "steps": r.steps,
        "sheets": {
            "A4 Tower": {
                "paper": "A4", "landscape": True, "device": "CADCraft PDF",
                "viewports": [
                    {"p1": [12, 37], "p2": [145, 198], "scale": "1:25", "center": [330, 1105],
                     "layer": "G-VPORT", "locked": True},
                    {"p1": [148, 106], "p2": [285, 198], "scale": "1:25", "center": [PLAN_X + 230, -20],
                     "layer": "G-VPORT", "locked": True},
                ],
                "steps": [{"id": "setvar", "params": {"name": "LTSCALE", "value": 0.5}}] + s.steps,
            }
        },
        "save": [
            "design/print/tower-drawing.dxf",
            {"path": "design/print/tower-drawing.dwg", "version": 2013},
            {"path": "print/tower-drawing.pdf", "layout": "A4 Tower"},
        ],
        "preview": [{"path": "design/print/tower-drawing.png", "layout": "A4 Tower", "width": 2400}],
    }


# App version: plan below the elevation; text and dimension figures 85 mm (DIMSCALE 34) so they read
# at phone size. Sentinel colours tell the SVG cleaner what each stroke is; it maps them back.
APP_PLAN_Y = -1800
SENT_TEXT = "20,32,52"      # label text   -> #142033, thinner stroke than frame lines
SENT_CEIL = "95,105,125"    # ceiling line -> #5F697C
SENT_BARLOW = "29,91,215"   # bar at the lowest setting (dashed) -> #1D5BD6, thin
SENT_DIMTXT = 8             # ACI 8 (#808080) as DIMCLRT: dimension figures -> #5F697C


def app_recipe():
    r = Recipe()
    elevation(Drawer(r, 0, 0, app=True), app=True)
    plan(Drawer(r, 0, APP_PLAN_Y, app=True), app=True)
    layers = json.loads(json.dumps(LAYERS_COMMON))
    layers["LABEL"]["color"] = SENT_TEXT
    layers["CEIL"]["color"] = SENT_CEIL
    layers["BAR-LOW"]["color"] = SENT_BARLOW
    return {
        "comment": "FORGE tower drawing for the app (model-space SVG). Generated by tower_drawing.py.",
        "new": {"metric": True},
        "units": {"insunits": 4, "luprec": 0},
        "layers": layers,
        "dimStyles": {"TOWERAPP": {"DIMSCALE": 34, "DIMCLRT": SENT_DIMTXT, **DIMSTYLE}},
        "steps": [{"id": "setvar", "params": {"name": "LTSCALE", "value": 5}}] + r.steps,
        "save": [{"path": "design/print/tower-drawing-app-raw.svg", "background": False}],
        "preview": [{"path": "design/print/tower-drawing-app-check.png", "layout": "Model", "width": 900}],
    }


# ---------------------------------------------------------------- SVG cleaner for the app asset

TUBE = BAR_D  # station tubes are stroked at their real 32 mm diameter
# raw export colour -> (group, final stroke colour, stroke width in px at 640 wide, or "tube"), fill of
# closed outlines (None = no fill; a callable picks one from the outline's size in mm)
STYLE = {
    "#feeee8": ("zone-fill", None, 0, "#FEEEE8"),
    "#142033": ("frame", "#142033", 1.6, "#DDE3EC"),
    "#6b7690": ("st-floor", "#6B7690", 1.4, lambda w, h: "#6B7690" if h < 50 else "#E8EBF1"),
    "#0b6e5a": ("st-knee", "#0B6E5A", 1.2, "#45C6A8"),
    "#b8286a": ("st-dips", "#B8286A", "tube", None),
    "#1d5bd6": ("st-bar", "#1D5BD6", "tube", None),
    "#1d5bd7": ("bar-lowest", "#1D5BD6", 1.6, None),
    "#9f80f6": ("st-push", "#9F80F6", "tube", None),
    "#f2541b": ("zone", "#F2541B", 1.6, None),
    "#5f697d": ("ceiling", "#5F697C", 1.2, None),
    "#5f697c": ("dimensions", "#5F697C", 0.8, None),
    "#808080": ("dimension-text", "#5F697C", 1.2, None),
    "#142034": ("labels", "#142033", 1.4, None),
}
PAINT = ["zone-fill", "frame", "st-floor", "st-knee", "st-dips", "st-bar", "bar-lowest", "st-push",
         "zone", "ceiling", "dimensions", "dimension-text", "labels"]
TITLES = {"zone-fill": "Clear training zone (tint)", "frame": "Frame", "st-floor": "Floor and mat",
          "st-knee": "Knee-raise pads and backrest", "st-dips": "Dip handles", "st-bar": "Pull-up bar",
          "bar-lowest": "Pull-up bar at the lowest setting", "st-push": "Push-up handles",
          "zone": "Clear training zone", "ceiling": "Minimum ceiling", "dimensions": "Dimension lines",
          "dimension-text": "Dimension figures", "labels": "Labels"}


def simplify(pts, tol):
    """Ramer-Douglas-Peucker: drops the tessellation points CADCraft adds along arcs."""
    if len(pts) < 3:
        return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0
    n = (dx * dx + dy * dy) ** 0.5
    best, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        dist = abs(dy * px - dx * py + x1 * y0 - y1 * x0) / n if n else ((px - x0) ** 2 + (py - y0) ** 2) ** 0.5
        if dist > best:
            best, idx = dist, i
    if best <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def clean_svg(src, dst, width=640.0, pad=10.0):
    s = open(src).read()
    if "<path" in s:
        raise SystemExit("clean_svg: the app export should have no fills (hatches or wide polylines)")
    lines = []
    for m in re.finditer(r'<polyline\b([^>]*)/?>', s):
        col = re.search(r'stroke="([^"]+)"', m.group(1)).group(1).lower()
        pts = [tuple(map(float, p.split(","))) for p in re.search(r'points="([^"]+)"', m.group(1)).group(1).split()]
        if col not in STYLE:
            raise SystemExit(f"clean_svg: unexpected colour {col} in the export")
        lines.append((col, pts))
    xs = [x for _, pts in lines for x, _ in pts]
    ys = [y for _, pts in lines for _, y in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    k = (width - 2 * pad) / (x1 - x0)          # px per mm (raw viewBox units are mm)
    height = (y1 - y0) * k + 2 * pad
    groups = {g: [] for g in PAINT}
    for col, pts in lines:
        g, stroke, sw, fill = STYLE[col]
        closed = len(pts) > 3 and pts[0] == pts[-1]
        pp = simplify([((x - x0) * k + pad, (y - y0) * k + pad) for x, y in pts], 0.12)
        txt = " ".join(f"{x:.1f},{y:.1f}" for x, y in pp)
        attrs = ""
        if closed and fill:
            if callable(fill):
                fill = fill((max(x for x, _ in pts) - min(x for x, _ in pts)), (max(y for _, y in pts) - min(y for _, y in pts)))
            attrs = f' fill="{fill}"'
            if stroke is None:
                attrs += ' stroke="none"'
            groups[g].append(f'<polygon{attrs} points="{" ".join(txt.split()[:-1])}"/>')
        else:
            groups[g].append(f'<polyline points="{txt}"/>')
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:g} {height:.0f}" '
           f'width="{width:g}" height="{height:.0f}" role="img" aria-labelledby="tower-title">',
           '<title id="tower-title">Your tower: Sportsroyals Power Tower YTA03, front elevation and plan with '
           'the clear training zone (dimensions in mm, approx. where marked)</title>']
    for g in PAINT:
        if not groups[g]:
            continue
        col = next(c for c, v in STYLE.items() if v[0] == g)
        _, stroke, sw, _ = STYLE[col]
        if sw == "tube":
            sw = round(TUBE * k, 2)
        paint = f' fill="none" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' \
            if stroke else ' fill="none" stroke="none"'
        out.append(f'<g id="{g}" data-name="{TITLES[g]}"{paint}>')
        out.extend(groups[g])
        out.append("</g>")
    out.append("</svg>")
    open(dst, "w").write("\n".join(out) + "\n")
    return width, height


def run(recipe_path, dry):
    cmd = [sys.executable, CCRAFT, recipe_path, "--root", ROOT] + (["--dry-run"] if dry else [])
    subprocess.run(cmd, check=True)


def main():
    a = os.path.join(HERE, "tower-drawing.json")
    b = os.path.join(HERE, "tower-drawing-app.json")
    json.dump(sheet_recipe(), open(a, "w"), indent=1)
    json.dump(app_recipe(), open(b, "w"), indent=1)
    only = sys.argv[1:] or ["sheet", "app"]
    for key, path in (("sheet", a), ("app", b)):
        if key in only:
            run(path, True)
            run(path, False)
    if "app" in only:
        w, h = clean_svg(os.path.join(HERE, "tower-drawing-app-raw.svg"), os.path.join(ROOT, "assets", "tower-drawing.svg"))
        print(f"assets/tower-drawing.svg: viewBox 0 0 {w:g} {h:.0f}")


if __name__ == "__main__":
    main()
