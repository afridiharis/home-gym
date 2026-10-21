#!/usr/bin/env python3
"""FORGE raster assets: app icons, maskable icon, favicons and the Open Graph card.

Writes the SVG sources (design/raster/src/) and PhotoCraft recipes (design/raster/recipes/),
then builds everything with the photocraft-assets recipe runner. Run from the repo root:

    python3 design/raster/make_raster.py            # everything
    python3 design/raster/make_raster.py icons og   # just some parts (icons, maskable, favicon, og, preview)

Inputs (read only): design/brand-app-icon-1024.png, assets/brand/mark.svg, assets/brand/logo.svg,
assets/tower.svg. Outputs: assets/icons/*, assets/og.png, and masters/previews in design/raster/.
"""
import json
import os
import re
import struct
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HERE = "design/raster"
PCRAFT = os.path.expanduser("~/.claude/skills/photocraft-assets/scripts/pcraft.py")

# Brand
ORANGE, ORANGE_DARK = "#F2541B", "#FF8547"
INK, BG, BG_DARK = "#142033", "#F4F6FA", "#0E1320"
ICON_TOP, ICON_BOTTOM = "#FF8A3D", "#EE4A12"   # sampled from design/brand-app-icon-1024.png (vertical, linear)
STATION = {"bar": "#1D5BD6", "dips": "#B8286A", "knee": "#45C6A8", "push": "#9F80F6"}

# The app-icon master draws mark.svg's 128 box at 750 px with its centre at (512, 496):
# rebuilt that way it matches the PNG (checked by diff, see check_rebuild()).
MASTER_BOX, MASTER_CENTER = 750.0, (512.0, 496.0)
MASKABLE_SCALE = 0.84   # figure radius 0.341 -> 0.287 of the icon (safe-zone circle is 0.40)


def p(*parts):
    return os.path.join(ROOT, *parts)


def write(rel, text):
    os.makedirs(os.path.dirname(p(rel)), exist_ok=True)
    with open(p(rel), "w") as f:
        f.write(text)


def recipe(name, data):
    rel = f"{HERE}/recipes/{name}.json"
    write(rel, json.dumps(data, indent=1) + "\n")
    return rel


def build(rel):
    print(f"== {rel}")
    for args in (["--dry-run"], []):
        r = subprocess.run([sys.executable, PCRAFT, p(rel), "--root", ROOT, *args])
        if r.returncode:
            raise SystemExit(f"{rel} failed")


# ---------------------------------------------------------------- SVG sources

def white_mark():
    """mark.svg with every colour turned white (same geometry), for the orange tiles."""
    svg = open(p("assets/brand/mark.svg")).read()
    svg = re.sub(r'#(142033|f2541b)', "#FFFFFF", svg, flags=re.I)
    write(f"{HERE}/src/mark-white.svg", svg)


# Per-size tuning (32-grid units; at 16 px one unit is half a pixel). 48 keeps the mark's own
# proportions; 32 thickens the strokes; 16 snaps the bar to whole pixels, lifts the head off the bar
# so it reads as a head, keeps the hands inside the bar and shortens the torso to leave a margin.
FAVICON = {
    48: dict(k=0.25, bar=2.9, arm=3.3, torso=6.5, head=3.1, bar_y=9.5),
    32: dict(k=0.255, bar=3.0, arm=3.7, torso=6.6, head=3.3, bar_y=9.5),
    16: dict(k=0.26, bar=4.0, arm=3.6, torso=7.2, head=3.3, bar_y=12.0, head_lift=3.65, torso_end=93.0, radius=6.0),
}


def favicon_svg(size, k=0.255, bar=3.0, arm=3.7, torso=6.6, head=3.3, bar_y=9.5, radius=7.0,
                head_lift=0.0, torso_end=105.186):
    """The mark alone on a rounded orange tile, drawn in a 32 grid, strokes thickened for small sizes.
    Coordinates follow mark.svg's 128 box mapped by X = 16 + (x-64)k, Y = 16 + (y-64)k."""
    X = lambda x: 16 + (x - 64) * k
    Y = lambda y: 16 + (y - 64) * k
    dy = bar_y - Y(37.458)                      # snap the bar to the pixel grid, move everything with it
    Yb = lambda y: Y(y) + dy
    f = lambda v: f"{v:.3f}".rstrip("0").rstrip(".")
    arms = (f"M{f(X(42.034))} {f(Yb(37.458))} L{f(X(31.966))} {f(Yb(63.085))} L{f(X(51.187))} {f(Yb(76.814))} "
            f"M{f(X(85.966))} {f(Yb(37.458))} L{f(X(96.034))} {f(Yb(63.085))} L{f(X(76.814))} {f(Yb(76.814))}")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 32 32">
  <defs><linearGradient id="tileFill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F86A2C"/><stop offset="1" stop-color="#EC4A14"/></linearGradient></defs>
  <rect id="tile" x="0" y="0" width="32" height="32" rx="{radius}" ry="{radius}" fill="url(#tileFill)"/>
  <g id="figure" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <path id="bar" d="M{f(X(18.238))} {f(bar_y)} L{f(X(109.763))} {f(bar_y)}" stroke-width="{bar}"/>
    <path id="arms" d="{arms}" stroke-width="{arm}"/>
    <path id="torso" d="M16 {f(Yb(77.729))} L16 {f(Yb(torso_end))}" stroke-width="{torso}"/>
  </g>
  <circle id="head" cx="16" cy="{f(Yb(21.898) - head_lift)}" r="{head}" fill="#FFFFFF"/>
</svg>
"""


# ---------------------------------------------------------------- recipes

def icons():
    """apple-touch / 192 / 512 straight from the 1024 master PNG; plus a layered rebuild of it."""
    build(recipe("app-icons", {
        "open": "design/brand-app-icon-1024.png",
        "renditions": [
            {"width": 512, "height": 512, "save": ["assets/icons/icon-512.png"]},
            {"width": 192, "height": 192, "save": ["assets/icons/icon-192.png"]},
            {"width": 180, "height": 180, "save": ["assets/icons/apple-touch-icon.png"]},
        ],
    }))
    build(recipe("app-icon-rebuild", icon_doc(1.0, "app-icon-1024", [
        f"{HERE}/app-icon-1024.pcraft", f"{HERE}/build/app-icon-rebuild-1024.png"])))


def icon_doc(scale, name, save, renditions=None):
    cx, cy = MASTER_CENTER
    return {
        "new": {"width": 1024, "height": 1024, "background": ICON_BOTTOM, "name": name},
        "steps": [
            {"id": "gradient.fill.create", "params": {
                "from": [512, 0], "to": [512, 1023], "style": "linear", "dither": False,
                "stops": [[0, ICON_TOP], [1, ICON_BOTTOM]], "transparency": [[0, 100], [1, 100]]},
             "as": "background"},
            {"place": f"{HERE}/src/mark-white.svg", "width": round(MASTER_BOX * scale, 3),
             "center": [512, round(512 + (cy - 512) * scale, 3)], "as": "figure"},
        ],
        "save": save,
        "renditions": renditions or [],
    }


def maskable():
    build(recipe("maskable", icon_doc(MASKABLE_SCALE, "icon-maskable", [f"{HERE}/icon-maskable-1024.pcraft"], [
        {"width": 512, "height": 512, "save": ["assets/icons/icon-maskable-512.png"]}])))


def favicon():
    for size in (16, 32, 48):
        write(f"{HERE}/src/favicon-{size}.svg", favicon_svg(size, **FAVICON[size]))
        saves = [f"{HERE}/build/favicon-{size}.ico",
                 "assets/icons/favicon-32.png" if size == 32 else f"{HERE}/build/favicon-{size}.png"]
        build(recipe(f"favicon-{size}", {
            "open": f"{HERE}/src/favicon-{size}.svg",
            "save": [f"{HERE}/favicon-{size}.pcraft"],
            "renditions": [{"width": size, "height": size, "save": saves,
                            "zoom": f"{HERE}/previews/favicon-{size}@8x.png"}],
        }))
    pack_ico([p(f"{HERE}/build/favicon-{s}.ico") for s in (16, 32, 48)], p("assets/icons/favicon.ico"))


def pack_ico(sources, out):
    """Merge PhotoCraft's single-image .ico files into one multi-size favicon.ico (entries copied as-is)."""
    entries = []
    for src in sources:
        data = open(src, "rb").read()
        reserved, kind, count = struct.unpack_from("<HHH", data, 0)
        assert (reserved, kind) == (0, 1), f"{src} is not an icon"
        for i in range(count):
            w, h, colors, res, planes, bpp, size, offset = struct.unpack_from("<BBBBHHII", data, 6 + 16 * i)
            entries.append(((w, h, colors, res, planes, bpp), data[offset:offset + size]))
    entries.sort(key=lambda e: e[0][0] or 256)
    offset = 6 + 16 * len(entries)
    head, body = struct.pack("<HHH", 0, 1, len(entries)), b""
    for (w, h, colors, res, planes, bpp), blob in entries:
        head += struct.pack("<BBBBHHII", w, h, colors, res, planes, bpp, len(blob), offset)
        body += blob
        offset += len(blob)
    with open(out, "wb") as f:
        f.write(head + body)
    print(f"  packed {os.path.relpath(out, ROOT)}: {[e[0][0] or 256 for e in entries]} px, {len(head + body)} bytes")


# ---------------------------------------------------------------- Open Graph card

FONT = "Inter"   # OFL; installed faces here: Regular, Medium, SemiBold
OG_W, OG_H, OG_M = 1200, 630, 72
HEADLINE = ["Back-safe strength", "for your power tower"]
ACCENT = "Back-safe"
CHIPS = [("Pull-ups", "bar"), ("Dips", "dips"), ("Knee raises", "knee"), ("Push-ups", "push")]


def measure(text, style, size, tracking=0):
    """Laid-out bounds [x0, y0, x1, y1] of point text at x=0, baseline y=0, measured by PhotoCraft."""
    out = subprocess.run(["photocraft-cli", "run", "--new", '{"width":64,"height":64}', "--cmd", "type.create",
                          "--params", json.dumps({"x": 0, "y": 0, "text": text, "font": FONT, "fontStyle": style,
                                                  "size": size, "tracking": tracking})],
                         capture_output=True, text=True, check=True).stdout
    res = json.loads(out.splitlines()[0])["result"]
    return res["bounds"]


def transform_path(d, s, tx, ty):
    """Scale an absolute M/L/C/Z path by s and move it by (tx, ty)."""
    def pt(m):
        x, y = map(float, m.group(0).split())
        return "%.3f %.3f" % (x * s + tx, y * s + ty)
    return re.sub(r"-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?", pt, d)


def tower_svg(frame=INK, floor="#F5C2AA", figure_scale=0.86):
    """assets/tower.svg with a darker frame for the light card, plus the brand figure hanging from the bar
    (mark.svg's arms, torso and head; its own bar is replaced by the tower's)."""
    svg = open(p("assets/tower.svg")).read()
    svg = re.sub(r'stroke="#c3cad6"', f'stroke="{frame}"', svg, flags=re.I)
    svg = re.sub(r'fill="#6b7690"', f'fill="{floor}"', svg, flags=re.I)
    mark = open(p("assets/brand/mark.svg")).read()
    s = figure_scale
    tx, ty = 100 - 64 * s, 42 - 37.458 * s          # hands on the tower bar (y 42), centred at x 100
    parts = []
    for m in re.finditer(r'<path d="([^"]+)"([^>]*)/>', mark):
        d, attrs = m.groups()
        if "#142033" in attrs:                        # the mark's own bar
            continue
        attrs = re.sub(r'stroke-width="([\d.]+)"', lambda w: 'stroke-width="%.3f"' % (float(w.group(1)) * s), attrs)
        attrs = re.sub(r'#f2541b', ORANGE, attrs, flags=re.I)
        parts.append(f'      <path d="{transform_path(d, s, tx, ty)}"{attrs}/>')
    fig = '    <g id="figure">\n' + "\n".join(parts) + "\n    </g>\n"
    svg = svg.replace("  </g>\n</svg>", fig + "  </g>\n</svg>")
    write(f"{HERE}/src/tower-og.svg", svg)


def og():
    tower_svg()
    # Grid: lockup on the top margin, chips on the bottom margin, headline centred between them.
    size, lead, track = 68, 78, -25
    lock_w, lock_h = 290, 290 * 96 / 356.94
    chip_size, chip_h, pad, dot, gap = 24, 46, 18, 12, 12
    chips_top = OG_H - OG_M - chip_h
    cap, desc = 0.727 * size, 0.24 * size             # Inter cap height and descender
    mid = (OG_M + lock_h + chips_top) / 2
    base1 = round(mid - (cap + lead + desc) / 2 + cap)  # baseline of the first headline line
    steps = [
        {"id": "gradient.fill.create", "params": {
            "from": [0, 0], "to": [OG_W, OG_H], "style": "linear", "dither": False,
            "stops": [[0, "#FFFFFF"], [1, BG]], "transparency": [[0, 100], [1, 100]]}, "as": "background"},
        # Warm "sun" behind the tower, bleeding off the top, right and bottom edges: bright and
        # encouraging, frames the illustration, and its left edge stays clear of the headline.
        {"id": "shape.create", "params": {
            "kind": "ellipse", "rect": [760, -25, 680, 680], "stroke": None,
            "fill": {"gradient": {"stops": [[0, "#FFE9DF"], [1, "#FFD2BC"]], "angle": 90}}}, "as": "sun"},
        {"place": f"{HERE}/src/tower-og.svg", "height": 500, "center": [985, 318], "as": "tower"},
        {"place": "assets/brand/logo.svg", "width": lock_w, "center": [OG_M + lock_w / 2, OG_M + lock_h / 2], "as": "lockup"},
        {"id": "type.create", "params": {
            "x": OG_M, "y": base1, "text": "\n".join(HEADLINE), "font": FONT, "fontStyle": "SemiBold",
            "size": size, "leading": lead, "tracking": track, "color": INK}, "as": "headline"},
        {"id": "type.setStyle", "params": {"layer": "$headline", "range": [0, len(ACCENT)], "color": ORANGE}},
    ]
    # Station chips: a coloured dot + label, laid out from PhotoCraft's own text measurements.
    x, top = OG_M, chips_top
    for i, (label, st) in enumerate(CHIPS):
        b = measure(label, "Medium", chip_size)
        w = pad + dot + 10 + (b[2] - b[0]) + pad
        steps += [
            {"id": "shape.create", "params": {
                "kind": "roundedRect", "rect": [x, top, w, chip_h], "radii": chip_h / 2, "fill": "#FFFFFF",
                "stroke": {"width": 1.5, "color": "#DCE1EA", "align": "inside"}}, "as": f"chip{i}"},
            {"id": "shape.create", "params": {
                "kind": "ellipse", "rect": [x + pad, top + (chip_h - dot) / 2, dot, dot], "fill": STATION[st],
                "stroke": None}, "as": f"dot{i}"},
            {"id": "type.create", "params": {
                "x": x + pad + dot + 10 - b[0], "y": top + chip_h / 2 + 8.5, "text": label, "font": FONT,
                "fontStyle": "Medium", "size": chip_size, "color": INK}, "as": f"label{i}"},
        ]
        x += w + gap
    build(recipe("og", {
        "new": {"width": OG_W, "height": OG_H, "background": BG, "name": "og"},
        "steps": steps,
        "save": [f"{HERE}/og.pcraft", "assets/og.png"],
        "renditions": [{"width": 500, "save": [f"{HERE}/previews/og-thumb-500.png"]}],
        "preview": f"{HERE}/previews/og-preview.png",
    }))


# ---------------------------------------------------------------- contact sheet

def preview():
    """design/raster/preview.png: every icon (with the masks the OS applies) and the OG card."""
    W, M, SHEET = 1296, 48, "#E8EBF1"
    steps = [{"id": "type.create", "params": {"x": M, "y": 62, "text": "FORGE · raster assets", "font": FONT,
                                              "fontStyle": "SemiBold", "size": 28, "color": INK}}]

    def put(path, x, y, w, size=None, label=None, mask=None, radius=None):
        """Place an image with its top-left at (x, y), drawn w wide; optionally cover it with a mask cut-out."""
        s = size or w
        steps.append({"place": path, "width": w, "center": [x + w / 2, y + w / 2]})
        if mask:
            name = f"mask{len(steps)}"
            steps.append({"id": "shape.create", "params": {"kind": "rect", "rect": [x - 1, y - 1, w + 2, w + 2],
                                                            "fill": SHEET, "stroke": None}, "as": name})
            r = radius * w
            hole = {"kind": mask, "rect": [x + w / 2 - r, y + w / 2 - r, 2 * r, 2 * r]} if mask == "ellipse" else \
                   {"kind": "roundedRect", "rect": [x, y, w, w], "radii": radius * w}
            steps.append({"id": "shape.create", "params": {**hole, "fill": SHEET, "addTo": f"${name}", "op": "subtract"}})
        if label:
            for i, line in enumerate(label.split("\n")):
                steps.append({"id": "type.create", "params": {
                    "x": x, "y": y + (size or w) + 26 + 20 * i, "text": line, "font": FONT,
                    "fontStyle": "Medium" if i == 0 else "Regular", "size": 15, "color": INK if i == 0 else "#5B667D"}})

    y1 = 96
    put("assets/icons/icon-512.png", M, y1, 256, label="icon-512.png\n512×512, shown at 50%")
    put("assets/icons/icon-maskable-512.png", M + 271, y1, 256, label="icon-maskable-512.png\ncircle mask, at 50%",
        mask="ellipse", radius=0.5)
    put("assets/icons/icon-maskable-512.png", M + 542, y1, 256, label="maskable, cut to the\n80% safe-zone circle",
        mask="ellipse", radius=0.4)
    put("assets/icons/apple-touch-icon.png", M + 813, y1, 180, size=256, label="apple-touch-icon.png\n180×180, iOS mask",
        mask="roundedRect", radius=0.2237)
    put("assets/icons/icon-192.png", M + 1008, y1, 192, size=256, label="icon-192.png\n192×192")

    y2 = y1 + 256 + 84
    put(f"{HERE}/previews/favicon-48@8x.png", M, y2, 384, label="favicon 48 px, 8×")
    put(f"{HERE}/previews/favicon-32@8x.png", M + 404, y2, 256, size=384, label="favicon-32.png, 8×")
    put(f"{HERE}/previews/favicon-16@8x.png", M + 680, y2, 128, size=384, label="favicon 16 px, 8×")
    # favicon.ico's three sizes at 1x, on a light and a dark tab bar
    tx, tw = M + 828, W - M - (M + 828)
    for i, (fill, ink) in enumerate((("#FFFFFF", INK), ("#2A2E37", "#F4F6FA"))):
        ty = y2 + i * 136
        steps.append({"id": "shape.create", "params": {"kind": "roundedRect", "rect": [tx, ty, tw, 120],
                                                        "radii": 14, "fill": fill, "stroke": None}})
        x = tx + 24
        for s in (16, 32, 48):
            src = "assets/icons/favicon-32.png" if s == 32 else f"{HERE}/build/favicon-{s}.png"
            steps.append({"place": src, "center": [x + s / 2, ty + 60]})
            x += s + 20
        steps.append({"id": "type.create", "params": {"x": x + 4, "y": ty + 66, "text": "FORGE", "font": FONT,
                                                      "fontStyle": "Medium", "size": 17, "color": ink}})
    steps.append({"id": "type.create", "params": {"x": tx, "y": y2 + 384 + 26, "text": "favicon.ico (16, 32, 48) at 1×",
                                                  "font": FONT, "fontStyle": "Medium", "size": 15, "color": INK}})

    y3 = y2 + 384 + 70
    steps.append({"place": "assets/og.png", "center": [W / 2, y3 + 315]})
    steps.append({"id": "type.create", "params": {"x": M, "y": y3 + 630 + 26, "text": "og.png  1200×630, at 100%",
                                                  "font": FONT, "fontStyle": "Medium", "size": 15, "color": INK}})
    H = y3 + 630 + 56
    build(recipe("preview", {"new": {"width": W, "height": H, "background": SHEET, "name": "preview"},
                             "steps": steps, "save": [f"{HERE}/preview.png"]}))


PARTS = {"icons": icons, "maskable": maskable, "favicon": favicon, "og": og, "preview": preview}

if __name__ == "__main__":
    os.chdir(ROOT)
    white_mark()
    todo = sys.argv[1:] or list(PARTS)
    for name in todo:
        PARTS[name]()
