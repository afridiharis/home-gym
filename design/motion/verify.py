#!/usr/bin/env python3
"""Check the shipped celebration files.

    python3 design/motion/verify.py assets/motion/celebrate.webp assets/motion/celebrate-still.png [--frames-dir DIR]

Reports and checks: WebP container facts (webpmux -info: animation, alpha, canvas, loop count),
Pillow's view (frames, mode, size, total duration), byte sizes against the 300 KB budget, that the
final WebP frame equals the still, that frame 0 and the final frame keep 8+ px of transparent
padding over the whole animation (nothing clipped), and the alpha edge: semi-transparent pixels
must carry their own (straight, un-premultiplied) colour, not a darkened or lightened one, or
they show as a fringe on one of the two backgrounds. Exits 1 on a failure.
"""
import argparse, glob, os, re, subprocess, sys
from PIL import Image, ImageChops

FAIL = []


def check(ok, msg):
    print(("  ok    " if ok else "  FAIL  ") + msg)
    if not ok:
        FAIL.append(msg)


def frames_of(path):
    im = Image.open(path)
    out, total = [], 0
    for i in range(im.n_frames):
        im.seek(i)
        rgba = im.convert("RGBA")          # load first: info["duration"] is only updated on load
        d = im.info.get("duration", 0)
        total += d
        out.append((d, rgba.copy()))
    return im, out, total


def edge_fringe(img):
    """Worst colour error of semi-transparent pixels against the nearest opaque pixel (0..255)."""
    px = img.load()
    W, H = img.size
    worst, n = 0, 0
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            r, g, b, a = px[x, y]
            if not (16 <= a <= 239):
                continue
            # nearest opaque neighbour within 2 px
            best = None
            for dy in (-1, 0, 1, -2, 2):
                for dx in (-1, 0, 1, -2, 2):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and px[xx, yy][3] == 255:
                        best = px[xx, yy]
                        break
                if best:
                    break
            if not best:
                continue
            n += 1
            # a premultiplied (dark) edge has luminance ~ alpha * fg; a straight one ~ fg
            l = 0.2126 * r + 0.7152 * g + 0.0722 * b
            lb = 0.2126 * best[0] + 0.7152 * best[1] + 0.0722 * best[2]
            worst = max(worst, abs(l - lb))
    return worst, n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("webp")
    ap.add_argument("still")
    ap.add_argument("--frames-dir")
    ap.add_argument("--budget-kb", type=float, default=300)
    a = ap.parse_args()

    print("webpmux -info %s" % a.webp)
    try:
        info = subprocess.run(["webpmux", "-info", a.webp], capture_output=True, text=True).stdout
        print("\n".join("    " + l for l in info.strip().splitlines()[:8]))
        check("Features present: animation" in info and "alpha" in info, "container has animation + alpha flags")
        check("Loop Count : 1" in info, "loop count 1 (plays once, then holds the last frame)")
        check("Background color : 0x00000000" in info, "background hint is transparent (dispose-to-background stays clear)")
        mux = sum(int(l.split()[6]) for l in info.splitlines() if re.match(r"\s*\d+:", l))
        print("  container durations add up to %d ms" % mux)
    except FileNotFoundError:
        print("  (webpmux not found: skipped)")

    im, frames, total = frames_of(a.webp)
    size = os.path.getsize(a.webp)
    print("Pillow: %s %s, %d frames, %d ms, loop=%s, %d bytes (%.1f KB)" % (im.format, im.size, len(frames), total, im.info.get("loop"), size, size / 1024))
    check(im.size == (320, 320), "WebP is 320x320")
    check(len(frames) > 1 and getattr(im, "is_animated", False), "WebP is animated")
    check(all(f.getextrema()[3][0] == 0 for _, f in frames), "every frame has transparent pixels (alpha kept)")
    check(size <= a.budget_kb * 1024, "WebP within %d KB" % a.budget_kb)
    shortest = min(d for d, _ in frames)
    check(shortest >= 33, "no frame shorter than 33 ms (<= 30 fps; shortest %d ms)" % shortest)

    still = Image.open(a.still)
    ssize = os.path.getsize(a.still)
    print("still: %s %s %s, %d bytes (%.1f KB)" % (still.format, still.size, still.mode, ssize, ssize / 1024))
    check(still.size == (320, 320) and still.mode == "RGBA", "still is a 320x320 RGBA PNG")
    check(still.getextrema()[3][0] == 0, "still has a transparent background")
    diff = ImageChops.difference(still.convert("RGBA"), frames[-1][1]).getbbox()
    check(diff is None, "still == final WebP frame")

    # padding: union of alpha over every frame (the source frames when given: they are all of them)
    src = sorted(glob.glob(os.path.join(a.frames_dir, "f_*.png"))) if a.frames_dir else []
    seq = [Image.open(f).convert("RGBA") for f in src] or [f for _, f in frames]
    if src:
        print("source frames: %d (%.2f s at 30 fps); the encoder merged identical ones into %d WebP frames" % (len(src), len(src) / 30.0, len(frames)))
    union = seq[0].getchannel("A")
    for f in seq[1:]:
        union = ImageChops.lighter(union, f.getchannel("A"))
    bb = union.point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = min(bb[0], bb[1], 320 - bb[2], 320 - bb[3])
    print("content box over the whole animation: %s, smallest margin %d px (%d CSS px)" % (bb, pad, pad // 2))
    check(pad >= 8, "nothing clipped: 8+ px padding on every side")
    check(seq[0].getextrema()[3][1] <= 8, "frame 0 starts empty (nothing shows before the pop)")

    worst, n = edge_fringe(still.convert("RGBA"))
    print("alpha edge: %d semi-transparent pixels, worst luminance step vs. opaque neighbour %.1f/255" % (n, worst))
    check(worst < 40, "no fringe: edge pixels keep their own colour (straight alpha)")

    print("RESULT: %s" % ("PASS" if not FAIL else "FAIL (%d)" % len(FAIL)))
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
