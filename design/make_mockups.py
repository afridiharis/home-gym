"""Generate design/mockups.json — the FigCraft recipe for FORGE's design system + key screens.
Run from the repo root:
  python3 design/make_mockups.py
  python3 -B ~/.claude/skills/figcraft/scripts/fcraft.py design/mockups.json --root . --dry-run
  python3 -B ~/.claude/skills/figcraft/scripts/fcraft.py design/mockups.json --root .
"""
import json, os, re

FONT = "Nunito Sans"   # stands in for SF Pro Rounded (ui-rounded), which FigCraft can't load
os.makedirs("design/mock-icons", exist_ok=True)

LIGHT = {
    "bg": "#F4F6FA", "surface": "#FFFFFF", "surface-2": "#EDF1F7", "line": "#DDE3EC",
    "ink": "#142033", "ink-2": "#4A5568", "ink-3": "#5F697C",
    "brand": "#F2541B", "on-brand": "#FFFFFF", "brand-tint": "#FFEDE5", "brand-ink": "#C2410C",
    "bar": "#1D5BD6", "bar-tint": "#E7EEFC", "bar-ink": "#1747A8",
    "dips": "#B8286A", "dips-tint": "#FBE6EF", "dips-ink": "#921F55",
    "knee": "#45C6A8", "knee-tint": "#DFF6F0", "knee-ink": "#0B6E5A",
    "push": "#9F80F6", "push-tint": "#EFEAFE", "push-ink": "#5636C2",
    "floor": "#6B7690", "floor-tint": "#EEF1F5", "floor-ink": "#3F4859",
    "good": "#1FA463", "good-tint": "#E3F6EC", "good-ink": "#0F7442",
    "warn": "#F2A71B", "warn-tint": "#FEF3DC", "warn-ink": "#8F5B00",
    "bad": "#E5484D", "bad-tint": "#FDE7E7", "bad-ink": "#B42328",
    "scrim": "#14203366",
}
DARK = {
    "bg": "#0E1320", "surface": "#1A2233", "surface-2": "#232D42", "line": "#2E3A52",
    "ink": "#EEF2F8", "ink-2": "#B5BFD0", "ink-3": "#8D99AE",
    "brand": "#FF8547", "on-brand": "#1F0E04", "brand-tint": "#3A2418", "brand-ink": "#FFB088",
    "bar": "#3D7BFF", "bar-tint": "#1C2B4D", "bar-ink": "#9DBBFF",
    "dips": "#C93C8C", "dips-tint": "#3A1B2D", "dips-ink": "#F49AC8",
    "knee": "#63DCC0", "knee-tint": "#15332E", "knee-ink": "#8FEBD6",
    "push": "#B9A0FF", "push-tint": "#2A2547", "push-ink": "#D3C5FF",
    "floor": "#8B96AD", "floor-tint": "#262E3F", "floor-ink": "#C3CAD8",
    "good": "#3CCB7F", "good-tint": "#163326", "good-ink": "#8CE5B3",
    "warn": "#F5B83D", "warn-tint": "#3A2E14", "warn-ink": "#F8CF7A",
    "bad": "#FF6B6B", "bad-tint": "#3A1C1F", "bad-ink": "#FFA3A3",
    "scrim": "#00000099",
}

def icon(name, color_key, size, theme=LIGHT):
    """Recoloured copy of a VectorCraft icon for the mockup (the app uses currentColor)."""
    hexv = theme[color_key]
    src = open(f"design/icons-src/{name}.svg").read().replace("#142033", hexv)
    src = src.replace('width="64" height="64"', f'width="{size}" height="{size}"')
    out = f"design/mock-icons/{name}-{hexv.lstrip('#')}-{size}.svg"
    open(out, "w").write(src)
    return {"type": "svg", "name": f"icon {name}", "path": out}

def tower(highlight):
    src = open("assets/tower.svg").read()
    for k in ("bar", "dips", "knee", "push", "floor"):
        if k != highlight:
            src = re.sub(re.escape(LIGHT[k]), "#E3E8F0", src, flags=re.I)
    src = re.sub("#C3CAD6", "#D3D9E3", src, flags=re.I)
    src = re.sub(r'width="200(pt)?" height="352(pt)?"', 'width="46" height="81"', src)
    out = f"design/mock-icons/tower-{highlight}.svg"
    open(out, "w").write(src)
    return {"type": "svg", "name": "tower mini-map", "path": out}

def ring(done, total, size=56):
    import math
    r = 22; c = 32; sw = 7
    a = 2 * math.pi * done / total - math.pi / 2
    x, y = c + r * math.cos(a), c + r * math.sin(a)
    large = 1 if done / total > 0.5 else 0
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 64 64">'
           f'<circle cx="32" cy="32" r="{r}" fill="none" stroke="#EDF1F7" stroke-width="{sw}"/>'
           f'<path d="M32 10 A{r} {r} 0 {large} 1 {x:.2f} {y:.2f}" fill="none" stroke="#F2541B" stroke-width="{sw}" stroke-linecap="round"/></svg>')
    out = f"design/mock-icons/ring-{done}of{total}.svg"
    open(out, "w").write(svg)
    return {"type": "svg", "name": "weekly ring", "path": out}

def T(text, style, color, name=None, **props):
    n = {"type": "text", "name": name or text[:40], "text": text, "textStyle": style, "bind": {"fill": f"color/{color}"}}
    if props: n["props"] = props
    return n

def F(name, children, layout="vertical", fill=None, radius=None, padding=0, gap=0,
      sizingH="fill", sizingV="hug", main="min", cross="min", width=None, height=None, **extra):
    props = {"layout": layout, "padding": padding, "gap": gap, "sizingH": sizingH, "sizingV": sizingV,
             "mainAlign": main, "crossAlign": cross}
    if fill is None: props["fills"] = []
    props.update(extra)
    n = {"type": "frame", "name": name, "props": props, "children": children}
    if width: n["width"] = width
    if height: n["height"] = height
    b = {}
    if fill: b["fill"] = f"color/{fill}"
    if radius is not None: b["cornerRadius"] = f"radius/{radius}"
    if b: n["bind"] = b
    return n

def chip(label, station):
    return F(f"chip {label}", [icon(f"st-{station}", f"{station}-ink", 18), T(label, "Caption", f"{station}-ink")],
             layout="horizontal", fill=f"{station}-tint", radius="pill", padding=[6, 12, 6, 8], gap=6,
             sizingH="hug", cross="center")

def primary(label, icon_name):
    return F(f"button {label}", [icon(icon_name, "on-brand", 22), T(label, "Label", "on-brand")],
             layout="horizontal", fill="brand", radius="pill", padding=[18, 24, 18, 24], gap=10,
             main="center", cross="center")

def secondary(label, icon_name):
    return F(f"button {label}", [icon(icon_name, "ink", 20), T(label, "BodyBold", "ink")],
             layout="horizontal", fill="surface-2", radius="md", padding=[14, 12, 14, 12], gap=8,
             main="center", cross="center")

def tab(label, icon_name, active):
    c = "brand-ink" if active else "ink-3"
    return F(f"tab {label}", [icon(icon_name, "brand" if active else "ink-3", 26), T(label, "Tab", c)],
             gap=4, sizingH="hug", cross="center")

def tabbar(active):
    tabs = [("Today", "today"), ("Progress", "progress"), ("Moves", "moves"), ("Me", "me")]
    n = F("tab bar", [tab(l, i, l == active) for l, i in tabs], layout="horizontal", fill="surface",
          padding=[10, 28, 30, 28], main="spaceBetween", cross="center", strokeSides=[1, 0, 0, 0],
          strokeWeight=1, absolute=True, sizingH="fixed")
    n["width"] = 393; n["x"] = 0; n["y"] = 769
    n["bind"]["stroke"] = "color/line"
    return n

def list_row(icon_name, tile, title, sub, action, last=False):
    extra = {} if last else {"strokeSides": [0, 0, 1, 0], "strokeWeight": 1}
    return F(f"row {title}", [
        F("tile", [icon(icon_name, f"{tile}-ink", 24)], fill=f"{tile}-tint", radius="md", padding=10,
          sizingH="hug", main="center", cross="center"),
        F("text", [T(title, "BodyBold", "ink"), T(sub, "Small", "ink-3")], gap=2),
        F(f"button {action}", [T(action, "BodyBold", "brand-ink")], layout="horizontal", fill="brand-tint",
          radius="pill", padding=[8, 16, 8, 16], sizingH="hug"),
    ], layout="horizontal", padding=[14, 0, 14, 0], gap=14, cross="center", **extra)

def checkin():
    def opt(label, k):
        return F(f"option {label}", [{"type": "ellipse", "name": "dot", "width": 16, "height": 16, "bind": {"fill": f"color/{k}"}},
                                     T(label, "BodyBold", f"{k}-ink")],
                 fill=f"{k}-tint", radius="md", padding=[16, 8, 14, 8], gap=8, main="center", cross="center")
    return F("check-in card", [
        F("text", [T("How's your back today?", "Heading", "ink"),
                   T("Your answer shapes today's workout.", "Small", "ink-2")], gap=4),
        F("options", [opt("Good", "good"), opt("Niggly", "warn"), opt("Rough", "bad")], layout="horizontal", gap=10),
    ], fill="surface", radius="lg", padding=18, gap=14, effects=[{"type": "dropShadow", "color": "#1420330F", "offset": [0, 2], "radius": 10}])

def today(name):
    return {"type": "frame", "name": name, "as": name.replace("-", "_"), "width": 393, "height": 852,
            "props": {"layout": "vertical", "padding": 0, "gap": 0, "sizingV": "fixed"},
            "bind": {"fill": "color/bg"},
            "children": [
        F("content", [
            F("header", [
                F("greeting", [T("Tuesday 21 October", "Caption", "ink-3"), T("Evening, Haris", "Title", "ink")], gap=2),
                F("week", [ring(2, 4), F("week text", [T("2 of 4", "BodyBold", "ink"), T("this week", "Caption", "ink-3")], gap=0, sizingH="hug")],
                  layout="horizontal", gap=8, sizingH="hug", cross="center"),
            ], layout="horizontal", main="spaceBetween", cross="center"),
            checkin(),
            F("workout card", [
                F("chips", [chip("Pull-up bar", "bar"), chip("Dip handles", "dips")],
                  layout="horizontal", gap=6, wrap=True),
                F("title", [T("Upper A", "Display", "ink"),
                            T("Pull day · 5 moves · about 40 min", "Body", "ink-2")], gap=2),
                primary("Start workout", "play"),
                F("alternatives", [secondary("Split AM + PM", "split"), secondary("Quick 8 min", "rescue")],
                  layout="horizontal", gap=10),
            ], fill="surface", radius="xl", padding=20, gap=16,
              effects=[{"type": "dropShadow", "color": "#14203314", "offset": [0, 6], "radius": 20}]),
            T("Also today", "Heading", "ink", name="Also today"),
            F("also card", [
                list_row("spine", "floor", "Spine Reset", "10 min · daily back armour", "Start"),
                list_row("walk", "good", "Walk", "0 of 2 × 15 min", "Log", last=True),
            ], fill="surface", radius="lg", padding=[2, 16, 2, 16]),
        ], padding=[58, 20, 16, 20], gap=16),
        tabbar("Today"),
    ]}

def player():
    seg = lambda on: {"type": "rectangle", "name": "segment", "width": 36, "height": 6,
                      "props": {"sizingH": "fill"}, "bind": {"fill": "color/brand" if on else "color/line", "cornerRadius": "radius/pill"}}
    dot = lambda state: {"type": "ellipse", "name": "set dot", "width": 12, "height": 12,
                         "bind": {"fill": {"done": "color/good", "now": "color/brand", "todo": "color/line"}[state]}}
    def tert(label, icon_name):
        return F(f"tertiary {label}", [icon(icon_name, "ink-2", 24), T(label, "Caption", "ink-2")],
                 gap=4, sizingH="fill", cross="center", padding=[8, 0, 8, 0])
    return {"type": "frame", "name": "player-light", "as": "player", "width": 393, "height": 852,
            "props": {"layout": "vertical", "padding": [56, 20, 30, 20], "gap": 16, "sizingV": "fixed"},
            "bind": {"fill": "color/surface"},
            "children": [
        F("top bar", [
            F("close", [icon("close", "ink", 20)], fill="surface-2", radius="pill", padding=12, sizingH="hug"),
            F("progress", [seg(1), seg(1), seg(0), seg(0), seg(0)], layout="horizontal", gap=4, cross="center"),
            F("back hurts", [icon("spine", "bad-ink", 18), T("Back hurts", "Caption", "bad-ink")], layout="horizontal",
              fill="bad-tint", radius="pill", padding=[10, 12, 10, 10], gap=4, sizingH="hug", cross="center"),
        ], layout="horizontal", gap=12, cross="center"),
        F("station", [
            tower("bar"),
            F("station text", [T("Go to the pull-up bar", "BodyBold", "ink"),
                               T("Bar on setting 7 · use the angled ends", "Small", "ink-3")], gap=2),
        ], layout="horizontal", gap=14, cross="center"),
        F("demo", [icon("st-bar", "bar", 170)], fill="bar-tint", radius="xl", height=250, sizingV="fixed",
          main="center", cross="center"),
        F("name", [T("Assisted pull-ups", "Title", "ink"),
                   T("Foot on a chair behind you. Chest to the bar, 3 seconds down.", "Body", "ink-2", sizingH="fill")], gap=4),
        F("target", [
            T("6", "Num", "ink"),
            F("target text", [T("reps", "Heading", "ink"), T("Set 2 of 4", "Caption", "ink-3"),
                              F("dots", [dot("done"), dot("now"), dot("todo"), dot("todo")], layout="horizontal", gap=6, sizingH="hug")],
              gap=4, sizingH="hug"),
        ], layout="horizontal", gap=14, cross="center"),
        F("spacer", [], sizingV="fill"),
        primary("Done · 6 reps", "check"),
        F("tertiary", [tert("Easier", "easier"), tert("Different count", "edit"), tert("Skip", "skip")], layout="horizontal", gap=8),
    ]}

def plan_sheet():
    def option(title, sub, selected=False, locked=False, badge=None):
        radio = ({"type": "ellipse", "name": "radio", "width": 22, "height": 22, "bind": {"fill": "color/brand"}} if selected else
                 {"type": "ellipse", "name": "radio", "width": 22, "height": 22, "props": {"fills": [], "strokeWeight": 2}, "bind": {"stroke": "color/line"}})
        lead = icon("lock", "ink-3", 22) if locked else radio
        body = [T(title, "BodyBold", "ink" if not locked else "ink-2"), T(sub, "Small", "ink-3", sizingH="fill")]
        if badge:
            body.append(F("badge", [T(badge, "Caption", "good-ink")], layout="horizontal", fill="good-tint", radius="pill", padding=[4, 10, 4, 10], sizingH="hug"))
        extra = {"strokeWeight": 2, "strokesIncluded": False}
        n = F(f"option {title}", [lead, F("option text", body, gap=4)], layout="horizontal", fill="surface",
              radius="lg", padding=16, gap=14, **extra)
        n["bind"]["stroke"] = "color/brand" if selected else "color/line"
        return n
    sheet = F("sheet", [
        {"type": "rectangle", "name": "grabber", "width": 40, "height": 5, "bind": {"fill": "color/line", "cornerRadius": "radius/pill"}},
        T("How do you want to do today?", "Heading", "ink", name="sheet title"),
        option("Split it: morning + evening", "Part 1 now: pull-ups, dips, rows (20 min). Part 2 after 6 pm: push-ups, knee raises, hang (20 min).",
               selected=True, badge="Same total work · research-backed"),
        option("All in one go", "Upper A, about 40 minutes."),
        option("Add a second session", "Lower A unlocks at 7:30 pm, 6 hours after your first, so your muscles have time to recover.", locked=True),
        F("note", [icon("info", "ink-2", 20),
                   T("Splitting a day's work in two is safe — studies even show a small strength edge. Adding extra work is where the risk is, so FORGE keeps an eye on that.", "Small", "ink-2", sizingH="fill")],
          layout="horizontal", fill="surface-2", radius="md", padding=14, gap=10),
        primary("Use this plan", "check"),
    ], fill="bg", radius="xl", padding=[10, 20, 34, 20], gap=14, cross="center")
    return {"type": "frame", "name": "plan-sheet-light", "as": "plan", "width": 393, "height": 852,
            "props": {"layout": "vertical", "padding": 0, "sizingV": "fixed", "mainAlign": "max"},
            "bind": {"fill": "color/scrim"}, "children": [sheet]}

recipe = {
    "comment": "Generated by design/make_mockups.py — edit there, not here.",
    "name": "FORGE design", "page": "Screens", "fonts": "system",
    "variables": {
        "Theme": {"modes": ["Light", "Dark"], "vars": {f"color/{k}": {"Light": LIGHT[k], "Dark": DARK[k]} for k in LIGHT}},
        "Size": {"modes": ["Value"], "vars": {"radius/md": 16, "radius/lg": 22, "radius/xl": 28, "radius/pill": 999}},
    },
    "styles": {"text": {
        "Display": {"fontFamily": FONT, "fontStyle": "Black", "fontSize": 36, "lineHeight": "110%"},
        "Title": {"fontFamily": FONT, "fontStyle": "ExtraBold", "fontSize": 28, "lineHeight": "115%"},
        "Heading": {"fontFamily": FONT, "fontStyle": "ExtraBold", "fontSize": 20, "lineHeight": "125%"},
        "Body": {"fontFamily": FONT, "fontStyle": "Regular", "fontSize": 17, "lineHeight": "140%"},
        "BodyBold": {"fontFamily": FONT, "fontStyle": "Bold", "fontSize": 17, "lineHeight": "130%"},
        "Small": {"fontFamily": FONT, "fontStyle": "Regular", "fontSize": 15, "lineHeight": "135%"},
        "Caption": {"fontFamily": FONT, "fontStyle": "Bold", "fontSize": 13, "lineHeight": "130%"},
        "Label": {"fontFamily": FONT, "fontStyle": "ExtraBold", "fontSize": 19, "lineHeight": "120%"},
        "Num": {"fontFamily": FONT, "fontStyle": "Black", "fontSize": 88, "lineHeight": "100%"},
        "Tab": {"fontFamily": FONT, "fontStyle": "Bold", "fontSize": 11, "lineHeight": "120%"},
    }},
    "layers": [today("today-light"), player(), plan_sheet()],
    "steps": [
        {"comment": "Dark Today: duplicate and switch the Theme mode."},
        {"id": "edit.duplicate", "params": {"ids": ["$today_light"]}, "as": "today_dark"},
        {"tool": "set_properties", "args": {"ids": ["$today_dark"], "props": {"name": "today-dark", "x": 1720, "y": 0}}},
        {"id": "variable.setMode", "params": {"ids": ["$today_dark"], "collection": "Theme", "mode": "Dark"}},
        {"tool": "set_properties", "args": {"ids": ["$player"], "props": {"x": 440}}},
        {"tool": "set_properties", "args": {"ids": ["$plan"], "props": {"x": 880}}},
    ],
    "save": ["design/forge-design.figcraft"],
    "exports": [
        {"nodes": "frames", "format": "png", "scales": [2], "dir": "design/mockups"},
        {"tokens": "css", "path": "design/handoff/tokens.css"},
        {"tokens": "json", "path": "design/handoff/tokens.json"},
    ],
    "preview": {"path": "design/mockups-preview.png"},
}
json.dump(recipe, open("design/mockups.json", "w"), indent=1)
print("design/mockups.json written")
