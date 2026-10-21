"""Generate design/icons.json (VectorCraft recipe) from the icon definitions below.
Each icon is drawn in a 0-64 box: 's' = stroked path (5 pt, round caps/joins), 'f' = filled path.
Run:  python3 design/make_icons.py && python3 ~/.claude/skills/vectorcraft/scripts/vcraft.py design/icons.json --root .
"""
import json

INK = "#142033"
SW = 5

ICONS = {
    # navigation
    "today": [("s", "M22 32 A10 10 0 1 0 42 32 A10 10 0 1 0 22 32 Z"),
              ("s", "M32 8 V14 M32 50 V56 M8 32 H14 M50 32 H56 M15 15 L19.2 19.2 M44.8 44.8 L49 49 M15 49 L19.2 44.8 M44.8 19.2 L49 15")],
    "progress": [("s", "M16 52 V38 M32 52 V26 M48 52 V12")],
    "moves": [("s", "M10 12 H54 M22 12 V54 M42 12 V54 M12 54 H52 M22 34 H12 M42 34 H52")],
    "me": [("s", "M23 22 A9 9 0 1 0 41 22 A9 9 0 1 0 23 22 Z"), ("s", "M14 54 C14 43 22 37 32 37 C42 37 50 43 50 54")],
    # tower stations (pictograms)
    "st-bar": [("s", "M8 10 H56 M20 10 L25.5 27 M44 10 L38.5 27 M32 30 V45 M32 45 L27 57 M32 45 L37 57"),
               ("f", "M26 22 A6 6 0 1 0 38 22 A6 6 0 1 0 26 22 Z")],
    "st-dips": [("s", "M7 38 H21 M43 38 H57 M24 23 H40 M24 23 L21 38 M40 23 L43 38 M32 23 V42 M32 42 L28 57 M32 42 L36 57"),
                ("f", "M26 12 A6 6 0 1 0 38 12 A6 6 0 1 0 26 12 Z")],
    "st-knee": [("s", "M12 6 V48 M12 24 H38 M21 20 V38 M21 23 L33 24 M21 38 L42 33 M42 33 L45 51"),
                ("f", "M15.5 11 A6 6 0 1 0 27.5 11 A6 6 0 1 0 15.5 11 Z")],
    "st-push": [("s", "M6 55 H58 M44 34 L10 47 M42 35 V48 M36 48 H48"),
                ("f", "M45 29 A6 6 0 1 0 57 29 A6 6 0 1 0 45 29 Z")],
    "st-floor": [("s", "M6 52 H58 M21 44 H38 M38 44 L46 31 L54 48 M24 44 L26 52"),
                 ("f", "M8 41 A6 6 0 1 0 20 41 A6 6 0 1 0 8 41 Z")],
    # session types
    "spine": [("s", "M32 6 C27 17 37 27 32 37 C27 46 35 52 32 58 M23 16 H41 M23 30 H41 M23 44 H41")],
    "rescue": [("s", "M36 6 L15 36 H30 L27 58 L49 27 H34 Z")],
    "walk": [("s", "M34 18 L30 36 M32 23 L22 31 M33 23 L42 31 M30 36 L22 56 M30 36 L40 46 L44 56"),
             ("f", "M31 10 A5.5 5.5 0 1 0 42 10 A5.5 5.5 0 1 0 31 10 Z")],
    "am": [("s", "M8 48 H56 M19 48 A13 13 0 0 1 45 48 M32 15 V22 M14 27 L19 31 M50 27 L45 31")],
    "pm": [("s", "M40 10 A22 22 0 1 0 54 42 A17 17 0 1 1 40 10 Z")],
    "split": [("s", "M32 10 A22 22 0 1 0 32 54 A22 22 0 1 0 32 10 Z"), ("f", "M32 10 A22 22 0 0 0 32 54 Z")],
    # actions
    "play": [("s", "M23 14 L51 32 L23 50 Z"), ("f", "M23 14 L51 32 L23 50 Z")],
    "check": [("s", "M13 34 L26 47 L51 19")],
    "plus": [("s", "M32 12 V52 M12 32 H52")],
    "minus": [("s", "M12 32 H52")],
    "close": [("s", "M17 17 L47 47 M47 17 L17 47")],
    "chev-right": [("s", "M25 12 L45 32 L25 52")],
    "chev-left": [("s", "M39 12 L19 32 L39 52")],
    "chev-down": [("s", "M12 24 L32 44 L52 24")],
    "timer": [("s", "M12 36 A20 20 0 1 0 52 36 A20 20 0 1 0 12 36 Z M32 36 V25 M26 7 H38 M32 7 V16")],
    "skip": [("s", "M14 14 L37 32 L14 50 Z M48 14 V50")],
    "easier": [("s", "M32 10 V50 M17 36 L32 51 L47 36")],
    "info": [("s", "M10 32 A22 22 0 1 0 54 32 A22 22 0 1 0 10 32 Z M32 30 V44 M32 21 L32 21")],
    "alert": [("s", "M32 9 L57 53 H7 Z M32 25 V37 M32 45 L32 45")],
    "lock": [("s", "M15 30 H49 V55 H15 Z M22 30 V21 A10 10 0 0 1 42 21 V30")],
    "bell": [("s", "M16 43 V28 A16 16 0 0 1 48 28 V43 L53 49 H11 Z M26 55 A6 6 0 0 0 38 55")],
    "sound": [("s", "M9 25 H19 L33 13 V51 L19 39 H9 Z M42 25 A10 10 0 0 1 42 39 M48 17 A21 21 0 0 1 48 47")],
    "sound-off": [("s", "M9 25 H19 L33 13 V51 L19 39 H9 Z M42 25 L56 39 M56 25 L42 39")],
    "calendar": [("s", "M10 15 H54 V56 H10 Z M10 27 H54 M22 7 V19 M42 7 V19 M22 39 L22 39 M32 39 L32 39 M42 39 L42 39")],
    "flame": [("s", "M32 6 C36 16 48 22 48 38 A16 16 0 0 1 16 38 C16 30 20 26 24 21 C24 28 27 32 30 33 C30 24 29 14 32 6 Z")],
    "snowflake": [("s", "M32 7 V57 M10.3 19.5 L53.7 44.5 M10.3 44.5 L53.7 19.5 M25 11 L32 17 L39 11 M25 53 L32 47 L39 53")],
    "trophy": [("s", "M20 10 H44 V25 A12 12 0 0 1 20 25 Z M20 14 H12 V19 A8 8 0 0 0 20 27 M44 14 H52 V19 A8 8 0 0 1 44 27 M32 37 V48 M22 54 H42")],
    "star": [("s", "M32 9 L38.5 24.1 L54.8 25.6 L42.5 36.4 L46.1 52.4 L32 44 L17.9 52.4 L21.5 36.4 L9.2 25.6 L25.5 24.1 Z")],
    "download": [("s", "M32 8 V40 M18 27 L32 41 L46 27 M12 54 H52")],
    "upload": [("s", "M32 42 V10 M18 23 L32 9 L46 23 M12 54 H52")],
    "sliders": [("s", "M10 20 H30 M42 20 H54 M10 44 H18 M30 44 H54"),
                ("s", "M30 20 A6 6 0 1 0 42 20 A6 6 0 1 0 30 20 Z M18 44 A6 6 0 1 0 30 44 A6 6 0 1 0 18 44 Z")],
    "heart": [("s", "M32 52 C14 40 7 31 11 22 C15 13 27 13 32 22 C37 13 49 13 53 22 C57 31 50 40 32 52 Z")],
    "edit": [("s", "M14 50 L17 38 L42 13 L51 22 L26 47 Z M36 19 L45 28")],
    "undo": [("s", "M22 17 L12 27 L22 37 M12 27 H38 A14 14 0 0 1 38 55 H28")],
    "wrench": [("s", "M46 8 A12 12 0 0 0 31 24 L11 44 A5.7 5.7 0 0 0 20 53 L40 33 A12 12 0 0 0 56 18 L48 26 L40 24 L38 16 Z")],
    "ring": [("s", "M32 10 A22 22 0 1 1 10 32")],
    "clock": [("s", "M10 32 A22 22 0 1 0 54 32 A22 22 0 1 0 10 32 Z M32 19 V32 L41 38")],
    "book": [("s", "M9 14 H25 A7 7 0 0 1 32 21 V54 A7 7 0 0 0 25 49 H9 Z M55 14 H39 A7 7 0 0 0 32 21 V54 A7 7 0 0 1 39 49 H55 Z")],
    "phone": [("s", "M20 6 H44 V58 H20 Z M29 50 H35")],
    "search": [("s", "M12 28 A16 16 0 1 0 44 28 A16 16 0 1 0 12 28 Z M40 40 L53 53")],
    "moon-z": [("s", "M38 12 A20 20 0 1 0 52 40 A15 15 0 1 1 38 12 Z M44 10 H54 L44 22 H54")],
}

COLS = 8
names = list(ICONS)
recipe = {
    "comment": "Generated by design/make_icons.py — edit there, not here.",
    "new": {"width": 64, "height": 64, "units": "Pixels", "name": "FORGE icons", "artboards": len(names),
            "artboardLayout": {"layout": "gridByRow", "columns": COLS, "spacing": 24}},
    "paint": {"fill": "none", "stroke": "none"},
    "steps": [],
    "save": ["design/icons.vectorcraft"],
    "screens": {"folder": "design/icons-src", "formats": [{"format": "svg"}], "title": None},
    "preview": {"path": "design/icons-sheet.png", "frames": True, "scale": 2},
}
steps = recipe["steps"]
for i, n in enumerate(names):
    steps.append({"id": "artboard.setProps", "params": {"index": i, "name": n}})
for i, n in enumerate(names):
    ids = []
    for j, (kind, d) in enumerate(ICONS[n]):
        key = f"{n.replace('-', '_')}_{j}"
        if kind == "s":
            args = {"d": d, "fill": "none", "stroke": INK, "strokeWidth": SW, "cap": "round", "join": "round"}
        else:
            args = {"d": d, "fill": INK, "stroke": "none"}
        steps.append({"tool": "draw_path", "args": args, "as": key})
        ids.append("$" + key)
    g = n.replace("-", "_")
    steps.append({"id": "select.set", "params": {"ids": ids}})
    steps.append({"id": "object.group", "params": {}, "as": g})
    steps.append({"id": "object.setProps", "params": {"id": "$" + g, "name": n}})
    steps.append({"id": "object.move", "params": {"dx": f"$artboards.{i}.x", "dy": f"$artboards.{i}.y"}})
steps.append({"id": "select.none", "params": {}})
json.dump(recipe, open("design/icons.json", "w"), indent=1)
print(f"{len(names)} icons → design/icons.json")
