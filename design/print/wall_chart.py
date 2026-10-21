#!/usr/bin/env python3
"""FORGE wall chart "Your tower plan": A3 portrait, 3 mm bleed, PDF/X-4, built with DesignCraft.

Writes design/print/wall-chart.json (a DesignCraft recipe) and runs it with the designcraft skill's
runner (~/.claude/skills/designcraft/scripts/dcraft.py, headless). Outputs:
  design/print/forge-wall-chart.designcraft   editable source
  print/forge-wall-chart.pdf                  print PDF: PDF/X-4, bleed + crop marks
  design/print/forge-wall-chart.png           preview

The brand art (assets/brand/logo.svg, assets/tower.svg, design/icons-src/*.svg) is converted here
into native DesignCraft paths in CMYK swatches, so it stays vector and the PDF stays X-4 clean
(placed SVGs keep RGB colours, which PDF/X-4 refuses).

Type: Source Sans 3 (OFL, bundled with DesignCraft). Colours: the FORGE brand hexes converted to
CMYK with DesignCraft's own colour engine (color.convert).

Run: python3 design/print/wall_chart.py
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DCRAFT = os.path.expanduser("~/.claude/skills/designcraft/scripts/dcraft.py")
QR_URL = "https://afridiharis.github.io/home-gym/"

# ---------------------------------------------------------------- page (points, y down)
W, H, BLEED, M = 841.89, 1190.55, 8.5, 34
X0, X1 = M, W - M
GAP = 14

SWATCHES = {  # brand hex -> CMYK via DesignCraft color.convert (rounded)
    "Ink": {"c": 92, "m": 76, "y": 44, "k": 65},       # #142033
    "Muted": {"c": 62, "m": 47, "y": 31, "k": 26},     # #5F697C
    "Lines": {"c": 16, "m": 8, "y": 5, "k": 0},        # #DDE3EC
    "Card": {"c": 6, "m": 3, "y": 3, "k": 0},          # #F4F6F9
    "Ember": {"c": 0, "m": 79, "y": 97, "k": 0},       # #F2541B
    "Bar": {"c": 96, "m": 78, "y": 0, "k": 0},         # #1D5BD6
    "Dips": {"c": 23, "m": 94, "y": 25, "k": 8},       # #B8286A
    "Knee": {"c": 69, "m": 0, "y": 49, "k": 0},        # #45C6A8
    "KneeDk": {"c": 83, "m": 27, "y": 64, "k": 29},    # #0B6E5A
    "Push": {"c": 62, "m": 68, "y": 0, "k": 0},        # #9F80F6
    "Floor": {"c": 61, "m": 47, "y": 27, "k": 13},     # #6B7690
    "FrameGrey": {"c": 28, "m": 17, "y": 12, "k": 0},  # #C3CAD6 (tower illustration frame)
    "Green": {"c": 76, "m": 1, "y": 90, "k": 0},       # traffic light #2BA84A
    "Amber": {"c": 3, "m": 32, "y": 95, "k": 0},       # traffic light #F5B400
    "Red": {"c": 4, "m": 91, "y": 81, "k": 0},         # traffic light #E03131
}
SVG_SWATCH = {"#142033": "Ink", "#f2541b": "Ember", "#1d5bd6": "Bar", "#b8286a": "Dips", "#45c6a8": "Knee",
              "#9f80f6": "Push", "#6b7690": "Floor", "#c3cad6": "FrameGrey"}

FONT = "Source Sans 3"


def chars(style, size, lead, fill="Ink", **kw):
    c = {"fontFamily": FONT, "fontStyle": style, "size": size, "leading": {"kind": "points", "value": lead},
         "fill": fill}
    c.update(kw)
    return c


CHAR_STYLES = {
    "Num": {"chars": {"fontFamily": FONT, "fontStyle": "Bold", "fill": "Ember"}},
    "Name": {"chars": {"fontFamily": FONT, "fontStyle": "Semibold"}},
    "Soft": {"chars": {"fontFamily": FONT, "fontStyle": "Regular", "fill": "Muted"}},
    "SoftSemi": {"chars": {"fontFamily": FONT, "fontStyle": "Semibold", "fill": "Muted"}},
    "BulletC": {"chars": {"fontFamily": FONT, "fontStyle": "Bold", "fill": "Muted"}},
    "CheckC": {"chars": {"fontFamily": FONT, "fontStyle": "Bold", "fill": "Green"}},
    "RedC": {"chars": {"fontFamily": FONT, "fontStyle": "Bold", "fill": "Red"}},
    "EmberC": {"chars": {"fontFamily": FONT, "fontStyle": "Bold", "fill": "Ember"}},
}
BULLET = {"listType": "bullets", "leftIndent": 13, "firstLineIndent": -13, "listTab": 13}
PARA_STYLES = {
    "Title": {"chars": chars("Bold", 54, 56, tracking=-10), "para": {"hyphenate": False}},
    "Subtitle": {"chars": chars("Semibold", 15, 19, "Muted"), "para": {"hyphenate": False}},
    "H2": {"chars": chars("Bold", 24, 27), "para": {"hyphenate": False}},
    "H2Sub": {"chars": chars("Semibold", 15, 19, "Muted"), "para": {"hyphenate": False}},
    "H3": {"chars": chars("Bold", 18, 21), "para": {"hyphenate": False, "spaceAfter": 7}},
    "Ex": {"chars": chars("Regular", 14, 19.5),
           "para": {"hyphenate": False, "tabs": [{"position": 20}, {"position": 132}],
                    "grepStyles": [{"style": "Num", "pattern": "^\\d"}]}},
    "Body": {"chars": chars("Regular", 13, 16.5), "para": {"hyphenate": False}},
    "BodyStrong": {"chars": chars("Semibold", 13, 16.5), "para": {"hyphenate": False}},
    "Label": {"chars": chars("Bold", 15, 18), "para": {"hyphenate": False}},
    "LabelR": {"basedOn": "Label", "para": {"align": "right"}},
    "CallBody": {"chars": chars("Regular", 13, 16), "para": {"hyphenate": False, "balanceRagged": True}},
    "CallBodyR": {"basedOn": "CallBody", "para": {"align": "right"}},
    "BodyR": {"basedOn": "Body", "para": {"align": "right"}},
    "Bullet": {"chars": chars("Regular", 13, 16.5),
               "para": {**BULLET, "hyphenate": False, "balanceRagged": True, "spaceAfter": 2, "bulletChar": "•", "bulletCharStyle": "BulletC"}},
    "Check": {"basedOn": "Bullet", "para": {"bulletChar": "✓", "bulletCharStyle": "CheckC", "leftIndent": 17,
                                           "firstLineIndent": -17, "listTab": 17}},
    "RedBullet": {"basedOn": "Bullet", "para": {"bulletCharStyle": "RedC"}},
    "Mini": {"chars": chars("Regular", 13, 16.5),
             "para": {**BULLET, "leftIndent": 11, "firstLineIndent": -11, "listTab": 11, "hyphenate": False,
                      "spaceAfter": 1, "bulletChar": "•", "bulletCharStyle": "BulletC"}},
    "MiniTitle": {"chars": chars("Bold", 16, 19), "para": {"hyphenate": False, "spaceAfter": 1,
                                                           "grepStyles": [{"style": "Num", "pattern": "^\\d"}]}},
    "MiniSub": {"chars": chars("Semibold", 13, 16, "Muted"), "para": {"hyphenate": False, "spaceAfter": 4}},
    "Foot": {"chars": chars("Semibold", 13, 17), "para": {"hyphenate": False}},
    "FootUrl": {"chars": chars("Bold", 15, 19, "Ember"), "para": {"hyphenate": False}},
    "FootR": {"basedOn": "Foot", "para": {"align": "right"}},
    "FootUrlR": {"basedOn": "FootUrl", "para": {"align": "right"}},
}


class R:
    def __init__(self):
        self.steps, self.n = [], 0

    def name(self, p):
        self.n += 1
        return f"{p}{self.n}"

    def add(self, cmd, params, as_=None):
        st = {"id": cmd, "params": params}
        if as_:
            st["as"] = as_
        self.steps.append(st)
        return st

    def comment(self, t):
        self.steps.append({"comment": t})

    # shapes ------------------------------------------------------------------------------
    def box(self, rect, swatch, tint=None, radius=16, shape="rectangle"):
        a = self.name("box")
        prm = {"rect": [round(v, 2) for v in rect], "content": "unassigned"}
        if shape != "rectangle":
            prm["shape"] = shape
        self.add("frame.create", prm, a)
        f = {"ids": [f"${a}"], "swatch": swatch}
        if tint is not None:
            f["tint"] = tint
        self.add("object.fill", f)
        self.add("object.stroke", {"ids": [f"${a}"], "swatch": "[None]"})
        if radius and shape == "rectangle":
            self.add("object.cornerOptions", {"ids": [f"${a}"], "shape": "rounded", "size": radius})
        return a

    def dot(self, cx, cy, d, swatch, tint=None):
        return self.box([cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2], swatch, tint, radius=0, shape="ellipse")

    def line(self, a, b, swatch, weight=1.5):
        n = self.name("ln")
        self.add("path.create", {"anchors": [{"p": [round(a[0], 2), round(a[1], 2)]},
                                             {"p": [round(b[0], 2), round(b[1], 2)]}]}, n)
        self.add("object.stroke", {"ids": [f"${n}"], "swatch": swatch, "weight": weight, "cap": "round"})
        self.add("object.fill", {"ids": [f"${n}"], "swatch": "[None]"})
        return n

    # text --------------------------------------------------------------------------------
    def text(self, rect, paras, style=None, chars_=None, inset=0):
        a = self.name("tx")
        self.add("frame.create", {"rect": [round(v, 2) for v in rect], "content": "text"}, a)
        self.add("object.stroke", {"ids": [f"${a}"], "swatch": "[None]"})
        if inset:
            self.add("object.textFrameOptions", {"ids": [f"${a}"], "inset": inset})
        st = {"story": f"${a}.story", "paras": paras}
        if style:
            st["style"] = style
        if chars_:
            st["chars"] = chars_
        self.steps.append(st)
        return a

    # art: brand SVGs as native DesignCraft paths ------------------------------------------
    def art(self, svg, x, y, scale, recolour=None, group=True):
        """Draws an SVG (absolute M/L/C/Z paths only) at (x, y) top-left, scaled, in CMYK swatches."""
        s = open(os.path.join(ROOT, svg)).read()
        ids = []
        for m in re.finditer(r"<path\b([^>]*)/?>", s):
            at = m.group(1)
            get = lambda k: (re.search(r'\b' + k + r'="([^"]*)"', at) or [None, None])[1]
            d, fill, stroke = get("d"), (get("fill") or "#000000").lower(), (get("stroke") or "none").lower()
            sw = float(get("stroke-width") or 0) * scale
            fill_sw = None if fill == "none" else (recolour or SVG_SWATCH[fill])
            stroke_sw = None if stroke == "none" else (recolour or SVG_SWATCH[stroke])
            for sub in parse_path(d):
                pts = [(x + px * scale, y + py * scale) for px, py in [a["p"] for a in sub["anchors"]]]
                if not sub["closed"] and len(set(pts)) == 1:   # a zero-length stroke = a round dot
                    ids.append(self.dot(pts[0][0], pts[0][1], sw, stroke_sw))
                    continue
                anchors = []
                for a in sub["anchors"]:
                    an = {"p": [round(x + a["p"][0] * scale, 2), round(y + a["p"][1] * scale, 2)]}
                    for k in ("in", "out"):
                        if a.get(k):
                            an[k] = [round(x + a[k][0] * scale, 2), round(y + a[k][1] * scale, 2)]
                    anchors.append(an)
                n = self.name("art")
                prm = {"anchors": anchors}
                if sub["closed"]:
                    prm["closed"] = True
                self.add("path.create", prm, n)
                if stroke_sw:
                    self.add("object.stroke", {"ids": [f"${n}"], "swatch": stroke_sw, "weight": round(sw, 3),
                                               "cap": "round", "join": "round"})
                else:
                    self.add("object.stroke", {"ids": [f"${n}"], "swatch": "[None]"})
                self.add("object.fill", {"ids": [f"${n}"], "swatch": fill_sw or "[None]"})
                ids.append(n)
        if group and len(ids) > 1:
            g = self.name("grp")
            self.add("object.group", {"ids": [f"${i}" for i in ids]}, g)
            return g
        return ids[0]


def parse_path(d):
    """SVG path data (absolute M, L, C, Z) -> subpaths of anchors {p, in, out}."""
    toks = re.findall(r"[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?", d)
    subs, cur, i, cmd = [], None, 0, None
    while i < len(toks):
        t = toks[i]
        if t in "MLCZ":
            cmd = t
            i += 1
            if cmd == "Z":
                cur["closed"] = True
                a0, an = cur["anchors"][0], cur["anchors"][-1]
                if len(cur["anchors"]) > 1 and abs(a0["p"][0] - an["p"][0]) < 1e-6 and abs(a0["p"][1] - an["p"][1]) < 1e-6:
                    if an.get("in"):
                        a0["in"] = an["in"]
                    cur["anchors"].pop()
                continue
            continue
        if cmd == "M":
            cur = {"anchors": [{"p": (float(toks[i]), float(toks[i + 1]))}], "closed": False}
            subs.append(cur)
            i += 2
            cmd = "L"
        elif cmd == "L":
            cur["anchors"].append({"p": (float(toks[i]), float(toks[i + 1]))})
            i += 2
        elif cmd == "C":
            c1 = (float(toks[i]), float(toks[i + 1]))
            c2 = (float(toks[i + 2]), float(toks[i + 3]))
            p = (float(toks[i + 4]), float(toks[i + 5]))
            cur["anchors"][-1]["out"] = c1
            cur["anchors"].append({"p": p, "in": c2})
            i += 6
    return subs


# ---------------------------------------------------------------- the chart

NB = "\u00a0"  # no-break space: keeps numbers with their units


def nb(t):
    """Glue numbers to units and the x in "3 x 10" so they never break across lines."""
    t = re.sub(r"(\d) (s|h|kg|min)\b", lambda m: m.group(1) + NB + m.group(2), t)
    return t.replace(" \u00d7 ", NB + "\u00d7" + NB)


def build():
    r = R()
    r.comment("Top accent: an ember band across the head, into the bleed")
    r.box([-BLEED, -BLEED, W + BLEED, 9], "Ember", radius=0)

    r.comment("Header: title left, logo right")
    r.text([X0, 28, 560, 88], [["Title", "Your tower plan"]])
    r.text([X0, 88, 600, 110], [["Subtitle", "Sportsroyals Power Tower YTA03  \u00b7  4 training days a week + a daily Spine Reset"]])
    logo_w = 196
    r.art("assets/brand/logo.svg", X1 - logo_w, 36, logo_w / 356.94)

    # Row 1 -------------------------------------------------------------------------------
    y0, y1 = 122, 378
    ax1 = 456
    r.comment("Every day: Spine Reset")
    r.box([X0, y0, ax1, y1], "Card")
    r.box([X0 + 18, y0 + 18, X0 + 62, y0 + 62], "Ember", tint=0.16, radius=12)
    r.art("design/icons-src/spine.svg", X0 + 22, y0 + 22, 36 / 64, recolour="Ember")
    r.text([X0 + 76, y0 + 16, ax1 - 18, y0 + 66], [["H2", "Every day"], ["H2Sub", "Spine Reset \u00b7 10" + NB + "min"]])
    ex = [("Cat\u2013camel", "\u00d76 slow"),
          ("McGill curl-up", "5-3-1 (8\u201310 s holds)"),
          ("Side plank", "3 \u00d7 10 s each side"),
          ("Bird dog", "5-3-1 (8\u201310 s holds)"),
          ("Dead hang", "25 s (optional)")]
    r.text([X0 + 22, y0 + 76, ax1 - 18, y0 + 180],
           [["Ex", nb(f"{i + 1}\t{n}\t{d}")] for i, (n, d) in enumerate(ex)],
           chars_=[{"style": "Name", "find": n, "para": i} for i, (n, _) in enumerate(ex)])
    wy = y0 + 186
    r.art("design/icons-src/walk.svg", X0 + 18, wy - 3, 24 / 64, recolour="KneeDk")
    r.text([X0 + 50, wy, ax1 - 18, wy + 20], [["BodyStrong", nb("Walk: build to 2\u20133 \u00d7 10\u201315 min a day")]])
    r.art("design/icons-src/alert.svg", X0 + 18, wy + 25, 24 / 64, recolour="Red")
    r.text([X0 + 50, wy + 27, ax1 - 18, wy + 64],
           [["Body", "Never in the first hour after waking \u2014 discs are most vulnerable" + NB + "then."]],
           chars_=[{"style": "RedC", "find": "Never in the first hour after waking"}])

    r.comment("Back check (traffic light)")
    bx0 = ax1 + GAP
    r.box([bx0, y0, X1, y1], "Card")
    r.text([bx0 + 18, y0 + 16, X1 - 18, y0 + 66], [["H2", "Back check"], ["H2Sub", "Traffic light, every morning"]])
    rows = [("Green", "Green", "Train as planned.", 50),
            ("Amber", "Yellow", "Lighter day: the app trims ~40%, no knee raises.", 66),
            ("Red", "Red, or anything down a leg", "Spine Reset + walk only.", 50)]
    ry = y0 + 74
    for sw, label, body, h in rows:
        r.box([bx0 + 14, ry, X1 - 14, ry + h], sw, tint=0.13, radius=12)
        r.dot(bx0 + 40, ry + h / 2, 28, sw)
        r.text([bx0 + 66, ry + 7, X1 - 22, ry + h - 2], [["Label", label], ["CallBody", body]])
        ry += h + 6

    # Row 2: stations ---------------------------------------------------------------------
    y0, y1 = 392, 662
    r.comment("Your stations: the tower illustration with colour-coded callouts")
    r.box([X0, y0, X1, y1], "Card")
    r.text([X0 + 18, y0 + 16, 330, y0 + 66], [["H2", "Your stations"], ["H2Sub", "Colour-coded, like the app"]])
    th = 240
    ts = th / 352
    tw = 200 * ts
    tx, ty = (X0 + X1) / 2 - tw / 2, y0 + 16
    r.art("assets/tower.svg", tx, ty, ts)
    P = lambda ax, ay: (tx + ax * ts, ty + ay * ts)
    chip = 44
    left_x1 = tx - 48             # left callouts end here (text right-aligned)
    right_x0 = tx + tw + 48       # right callouts start here
    callouts = [
        # side, swatch, icon colour, icon, chip top, station point, title, body
        ("R", "Bar", "Bar", "st-bar", ty - 2, P(172, 30), "Pull-up bar",
         "9 heights. Use the angled ends. Strict reps; step down, never drop."),
        ("R", "Knee", "KneeDk", "st-knee", ty + 86, P(172, 139.5), "Knee-raise station",
         "Back flat on the pad,\u20282 s up / 2 s down, zero swing."),
        ("R", "Floor", "Floor", "st-floor", ty + 186, P(174, 340), "Floor + mat", "Spine work and legs."),
        ("L", "Dips", "Dips", "st-dips", ty + 96, P(33, 166), "Dip handles", "Upper arms to parallel, legs still."),
        ("L", "Push", "Push", "st-push", ty + 186, P(20, 302), "Push-up handles", "One straight line, glutes on."),
    ]
    for side, sw, ic, icon, cy, pt, title, body in callouts:
        if side == "R":
            cx0 = right_x0
            tr = [cx0 + chip + 14, cy - 2, X1 - 18, cy + 74]
            paras = [["Label", title], ["CallBody", nb(body)]]
            edge = (cx0, cy + chip / 2)
        else:
            cx0 = left_x1 - chip
            tr = [X0 + 18, cy - 2, cx0 - 14, cy + 74]
            paras = [["LabelR", title], ["CallBodyR", nb(body)]]
            edge = (left_x1, cy + chip / 2)
        r.line(pt, edge, sw, 1.6)
        r.dot(pt[0], pt[1], 8, sw)
        r.box([cx0, cy, cx0 + chip, cy + chip], sw, tint=0.2, radius=12)
        r.art(f"design/icons-src/{icon}.svg", cx0 + 6, cy + 6, (chip - 12) / 64, recolour=ic)
        r.text(tr, paras)

    # Row 3: training days ----------------------------------------------------------------
    y0, y1 = 676, 900
    r.comment("Training days: four rotating sessions")
    r.box([X0, y0, X1, y1], "Card")
    r.text([X0 + 18, y0 + 14, X1 - 18, y0 + 44], [["H2", "Training days  4 a week, rotating"]],
           chars_=[{"style": "SoftSemi", "find": "4 a week, rotating"}])
    days = [("1  Upper A", "Pull day", ["Pull-ups", "Dips", "Rows", "Push-ups", "Knee raises", "Dead hang"]),
            ("2  Lower A", "Legs + trunk", ["Squat ladder", "Bridges / hip thrusts", "Leg curls", "Calves", "Plank",
                                           "Side plank"]),
            ("3  Upper B", "Push day", ["Pike / handstand ladder", "Push-ups", "Easy pull-ups", "Easy dips + rows",
                                       "L-sit"]),
            ("4  Lower B", "Legs + trunk", ["Lighter squats", "Bridges", "Single-leg RDL", "Calves", "Dead bug",
                                           "Suitcase carry"])]
    inner = 12
    cw = (X1 - X0 - 2 * 14 - 3 * inner) / 4
    for i, (t, sub, items) in enumerate(days):
        cx = X0 + 14 + i * (cw + inner)
        r.box([cx, y0 + 50, cx + cw, y1 - 12], "[Paper]", radius=12)
        r.text([cx + 14, y0 + 59, cx + cw - 8, y1 - 14],
               [["MiniTitle", t], ["MiniSub", sub]] + [["Mini", it] for it in items])

    # Row 4: two sessions, checklist, doctor ------------------------------------------------
    y0, y1 = 914, 1096
    c1, c2 = 270, 508
    r.comment("Two sessions in a day?")
    r.box([X0, y0, c1, y1], "Card")
    r.text([X0 + 18, y0 + 16, c1 - 16, y1 - 8],
           [["H3", "Two sessions in a day?"],
            ["Bullet", "Splitting a day into morning + evening = fine (same total work)."],
            ["Bullet", nb("A second full session = a different body region, at least 6 h later.")],
            ["Bullet", "Never both sessions with knee" + NB + "raises."]],
           chars_=[{"style": "Name", "find": "== fine"}, {"style": "Name", "find": nb("at least 6 h later")},
                   {"style": "Name", "find": "Never"}])
    r.comment("Tower checklist")
    r.box([c1 + GAP, y0, c2, y1], "Card")
    r.text([c1 + GAP + 18, y0 + 16, c2 - 12, y1 - 8],
           [["H3", "Tower checklist"],
            ["Check", "Flat floor + mat"],
            ["Check", "Check bolts weekly"],
            ["Check", nb("Max 150 kg")],
            ["Check", "No kipping or swinging (the tower wobbles)"],
            ["Check", "Knees bent behind you to clear the crossbar"]])
    r.comment("See a doctor the same day if (red)")
    dx0 = c2 + GAP
    r.box([dx0, y0, X1, y1], "Red", tint=0.1)
    r.art("design/icons-src/alert.svg", dx0 + 16, y0 + 13, 26 / 64, recolour="Red")
    r.text([dx0 + 48, y0 + 16, X1 - 12, y0 + 44], [["H3", "See a doctor the same day if"]])
    r.text([dx0 + 18, y0 + 44, X1 - 12, y1 - 8],
           [["RedBullet", "Numbness in the groin/saddle area"],
            ["RedBullet", "New trouble peeing (can\u2019t go) or controlling bladder/bowels"],
            ["RedBullet", "Weakness in both legs, or getting worse"],
            ["RedBullet", "A foot that drags or slaps"],
            ["RedBullet", "Fever, unexplained weight loss or severe night pain"]])

    # Footer ------------------------------------------------------------------------------
    r.comment("Footer: disclaimer, app address and a QR code to the app")
    fy = 1106
    qr = 50
    r.text([X0, fy + 16, 470, fy + 50], [["Foot", "Not medical advice \u2014 if symptoms persist, see a physio."]])
    r.text([480, fy + 6, X1 - qr - 12, fy + 50], [["FootR", "Open the app"], ["FootUrlR", "afridiharis.github.io/home-gym"]])
    r.add("object.qrCode", {"content": QR_URL, "rect": [X1 - qr, fy, X1, fy + qr], "color": "Ink"})
    r.add("edit.deselectAll", {})
    return r.steps


def recipe():
    return {
        "comment": "FORGE wall chart, A3 portrait, 3 mm bleed. Generated by wall_chart.py - edit that, not this.",
        "new": {"preset": "A3", "pages": 1, "facingPages": False, "bleed": BLEED, "title": "FORGE - Your tower plan",
                "margins": {"top": M, "bottom": M, "inside": M, "outside": M}},
        "swatches": SWATCHES,
        "characterStyles": CHAR_STYLES,
        "paragraphStyles": PARA_STYLES,
        "steps": build(),
        "save": [
            "design/print/forge-wall-chart.designcraft",
            {"path": "print/forge-wall-chart.pdf", "bleed": True, "marks": {"crop": True}, "standard": "x4",
             "title": "FORGE - Your tower plan", "author": "FORGE"},
            {"path": "design/print/forge-wall-chart.png", "scale": 1.5},
        ],
    }


def main():
    path = os.path.join(HERE, "wall-chart.json")
    json.dump(recipe(), open(path, "w"), indent=1, ensure_ascii=False)
    base = [sys.executable, DCRAFT, path, "--root", ROOT]
    subprocess.run(base + ["--dry-run"], check=True)
    if "--dry-run" not in sys.argv:
        subprocess.run(base, check=True)


if __name__ == "__main__":
    main()
