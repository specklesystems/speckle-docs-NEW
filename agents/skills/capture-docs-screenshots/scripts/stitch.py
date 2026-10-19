#!/usr/bin/env python3
"""Stitch Claude-in-Chrome zoom tiles into one lossless viewport capture.

usage: stitch.py OUT.png FRAME_W FRAME_H VIEWPORT_W VIEWPORT_H DPR COLS ROWS TILE...

FRAME_W/H   the coordinate frame the computer tool reports (e.g. 1389x868)
VIEWPORT_W/H window.innerWidth/innerHeight in CSS px (1440x900)
DPR         window.devicePixelRatio (2 on a Retina Mac)
TILE...     COLS*ROWS zoom PNGs, row-major, captured over an even grid of the frame;
            "-" skips a tile the crop does not need (left white)
Output is VIEWPORT*DPR pixels (2880x1800 for 1440x900 @2x).
"""
import sys
from PIL import Image

out = sys.argv[1]
fw, fh, vw, vh, dpr, cols, rows = map(int, sys.argv[2:9])
tiles = sys.argv[9:]
if len(tiles) != cols * rows:
    sys.exit(f"expected {cols*rows} tiles, got {len(tiles)}")
W, H = vw * dpr, vh * dpr
xs = [round(fw * c / cols) for c in range(cols + 1)]
ys = [round(fh * r / rows) for r in range(rows + 1)]
can = Image.new("RGB", (W, H), "white")
for i, path in enumerate(tiles):
    r, c = divmod(i, cols)
    if path == "-":
        continue
    box = (round(xs[c] * W / fw), round(ys[r] * H / fh), round(xs[c + 1] * W / fw), round(ys[r + 1] * H / fh))
    t = Image.open(path).convert("RGB")
    # a tile under ~90% of its box was downscaled by the tool: the grid is too coarse
    if t.width < 0.9 * (box[2] - box[0]):
        print(f"warning: tile {i} is {t.width}px for a {box[2]-box[0]}px box; use more columns", file=sys.stderr)
    can.paste(t.resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS), box[:2])
can.save(out)
print(out, can.size)
