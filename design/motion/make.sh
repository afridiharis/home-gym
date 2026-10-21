#!/bin/sh
# Rebuild the FORGE celebration from source. Run from anywhere:  sh design/motion/make.sh
#   1. mark-white.svg      : assets/brand/mark.svg recoloured white (for the orange disc), parts named
#   2. mark-white.svg.jsx  : svg2ec.py geometry for EC.svg
#   3. celebrate.ecproj    : ecbuild.py celebrate.jsx (EffectCraft master)
#   4. PNG frames (temp)   : effectcraft-cli render, straight RGBA
#   5. assets/motion/celebrate.webp        animated WebP, lossless + alpha, 30 fps, loop count 1 (plays once)
#      assets/motion/celebrate-still.png   final frame, for Reduce Motion
#   6. design/motion/contact-sheet.png     key frames on the app's light and dark screens
#   7. verify.py                            size, frames, alpha, loop, duration, edge fringe
# Needs: effectcraft-cli 0.13.0+, the effectcraft-motion skill, img2webp (libwebp), Python 3 + Pillow.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
HERE="$ROOT/design/motion"
OUT="$ROOT/assets/motion"
SKILL="$HOME/.claude/skills/effectcraft-motion/scripts"
FPS=30
cd "$ROOT"
mkdir -p "$OUT"

python3 - "$ROOT/assets/brand/mark.svg" "$HERE/mark-white.svg" <<'EOF'
import re, sys
src = open(sys.argv[1]).read()
out = re.sub(r'#(142033|f2541b)', '#FFFFFF', src, flags=re.I)   # ink bar + ember figure -> white
ids = iter(['bar', 'arms', 'torso', 'head'])
out = re.sub(r'<path ', lambda m: '<path id="%s" ' % next(ids), out)
open(sys.argv[2], 'w').write(out)
EOF
python3 "$SKILL/svg2ec.py" "$HERE/mark-white.svg" --out "$HERE/mark-white.svg.jsx" --name mark
python3 "$SKILL/ecbuild.py" "$HERE/celebrate.jsx" --lib "$HERE/mark-white.svg.jsx" --out "$HERE/celebrate.ecproj"

FR=$(mktemp -d)
trap 'rm -rf "$FR"' EXIT
effectcraft-cli render "$HERE/celebrate.ecproj" --comp Celebrate --out "$FR/f.png" --format png --channels rgba

# 30 fps in whole milliseconds: 33/34/33... so the frames add up to exactly n * 1000/30 ms
ARGS="$FR/args.txt"
python3 - "$FR" "$FPS" > "$ARGS" <<'EOF'
import glob, os, sys
fr, fps = sys.argv[1], float(sys.argv[2])
fs = sorted(glob.glob(os.path.join(fr, "f_*.png")))
print("-loop 1 -min_size -lossless -m 6 -q 100")   # lossless keeps semi-transparent edges exact
for i, f in enumerate(fs):
    d = round((i + 1) * 1000 / fps) - round(i * 1000 / fps)
    print("-d %d %s" % (d, f))
print("-o %s" % os.path.join(fr, "celebrate.webp"))
EOF
img2webp "$ARGS"
# img2webp leaves the background hint opaque white; frames that dispose to background should clear
# to transparent, so set it explicitly (Chrome and libwebp ignore it, other viewers may not)
webpmux -set bgcolor 0,0,0,0 "$FR/celebrate.webp" -o "$OUT/celebrate.webp"

LAST=$(ls "$FR"/f_*.png | tail -1)
python3 -c "
from PIL import Image; import sys
Image.open(sys.argv[1]).convert('RGBA').save(sys.argv[2], optimize=True)" "$LAST" "$OUT/celebrate-still.png"

# start, pop overshoot, ring + burst launch, burst peak, ring fading, sparkles, settled end
python3 "$HERE/contact_sheet.py" "$OUT/celebrate.webp" --out "$HERE/contact-sheet.png" \
  --times 0.07,0.17,0.23,0.30,0.40,0.60,0.80,1.79 --scale 0.75 --still "$OUT/celebrate-still.png" --zoom
python3 "$HERE/verify.py" "$OUT/celebrate.webp" "$OUT/celebrate-still.png" --frames-dir "$FR"
