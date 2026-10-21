#!/usr/bin/env python3
"""Contact sheet of the celebration on FORGE's light (#F4F6FA) and dark (#0E1320) screens.

    python3 design/motion/contact_sheet.py assets/motion/celebrate.webp --out design/motion/contact-sheet.png
    python3 design/motion/contact_sheet.py FRAMES_DIR --fps 30 --out sheet.png [--times 0.1,0.3] [--zoom]

Reads what ships (the animated WebP, decoded with Pillow) or a folder of PNG frames, picks the frame
shown at each time, composites it over both backgrounds (straight alpha, as a browser does) and tiles
them: one row per background. --zoom adds a 3x crop of the disc's edge per background, to check the
alpha edge for dark or light fringes. --still adds the Reduce Motion PNG as a last column.
"""
import argparse, glob, os
from PIL import Image, ImageDraw, ImageFont

BGS = [("light #F4F6FA", (0xF4, 0xF6, 0xFA)), ("dark #0E1320", (0x0E, 0x13, 0x20))]
DEFAULT_TIMES = [0.0, 0.10, 0.20, 0.27, 0.33, 0.40, 0.50, 0.65, 0.80, 1.00, 1.79]


def load_frames(src, fps):
    """[(start_seconds, RGBA image)] in display order."""
    out = []
    if os.path.isdir(src):
        for i, f in enumerate(sorted(glob.glob(os.path.join(src, "*.png")))):
            out.append((i / fps, Image.open(f).convert("RGBA")))
        return out
    im = Image.open(src)
    t = 0.0
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        rgba = im.convert("RGBA")          # load first: info["duration"] is only updated on load
        out.append((t, rgba.copy()))
        t += (im.info.get("duration") or 0) / 1000.0
    return out


def frame_at(frames, t):
    cur = frames[0][1]
    for start, img in frames:
        if start <= t + 0.004:   # frame starts are whole ms (33/34): 0.1667 s means the frame at 167 ms
            cur = img
        else:
            break
    return cur


def font(size):
    for p in ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, default=30)
    ap.add_argument("--times", default=",".join(str(t) for t in DEFAULT_TIMES))
    ap.add_argument("--scale", type=float, default=0.5, help="tile scale (0.5 = the 160 px CSS size)")
    ap.add_argument("--zoom", action="store_true", help="add a 3x crop of the disc edge")
    ap.add_argument("--still", help="Reduce Motion still to add as a last column")
    a = ap.parse_args()

    frames = load_frames(a.src, a.fps)
    times = [float(x) for x in a.times.split(",")]
    W, H = frames[0][1].size
    tw, th = int(W * a.scale), int(H * a.scale)
    cols = [("t=%.2fs" % t, frame_at(frames, t)) for t in times]
    if a.still:
        cols.append(("still", Image.open(a.still).convert("RGBA")))
    extra = []
    if a.zoom:   # the disc's rim at 45 deg (r = 90 px) on the final frame, 3x, nearest neighbour
        last = cols[-1][1]
        cx = int(W / 2 + 90 * 0.7071)
        box = (cx - 30, cx - 30, cx + 30, cx + 30)
        extra = [("edge 3x", last.crop(box).resize((180, 180), Image.NEAREST))]

    pad, lab, left = 10, 22, 120
    ncol = len(cols) + len(extra)
    cw = max(tw, 180 if extra else 0)
    sheet = Image.new("RGB", (left + ncol * (cw + pad) + pad, lab + len(BGS) * (th + pad) + pad + 26), (40, 42, 48))
    d = ImageDraw.Draw(sheet)
    f, fs = font(15), font(13)
    d.text((pad, 6), "%s  -  %d frames, %dx%d, shown at %dx%d (tiles at %d%%)" % (os.path.basename(a.src), len(frames), W, H, W // 2, H // 2, a.scale * 100), fill=(230, 230, 235), font=f)
    for ci, (name, _) in enumerate(cols + extra):
        d.text((left + pad + ci * (cw + pad), lab + 4), name, fill=(200, 200, 210), font=fs)
    for ri, (bname, bg) in enumerate(BGS):
        y = lab + 24 + ri * (th + pad)
        d.text((pad, y + th // 2 - 8), bname, fill=(230, 230, 235), font=f)
        for ci, (_, img) in enumerate(cols + extra):
            base = Image.new("RGBA", img.size, bg + (255,))
            comp = Image.alpha_composite(base, img).convert("RGB")
            if ci < len(cols):
                comp = comp.resize((tw, th), Image.LANCZOS)
            sheet.paste(comp, (left + pad + ci * (cw + pad), y))
    sheet.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
