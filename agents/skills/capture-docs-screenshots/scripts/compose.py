#!/usr/bin/env python3
"""Turn a raw 2x viewport capture into a docs product shot.

usage: compose.py SPEC.json

SPEC keys
  raw      raw PNG of the viewport at device pixels
  out      output PNG
  dpr      device pixel ratio of raw (default 2)
  crop     [x0,y0,x1,y1] in CSS px (default: whole raw)
  tier     hero | region | element
             hero    transparent margin, rounded corners and soft shadow on the
                     visible edges; the crop runs off the `bleed` edges
             region  the crop as-is (the docs <Frame> supplies border and radius)
             element the crop as-is: one control, menu or dialog
  bleed    hero or inset: edges the screenshot runs off, e.g. ["right","bottom"]
  inset    true for a narrow panel (a sidebar, a menu) that cannot be widened
           without cutting unrelated UI: it floats, uncut, at no more than
           MAX_SCALE on a transparent margin, with the hero edge treatment;
           the margin also widens the canvas until it is at least square
  markers  [[cssX, cssY], ...] numbered 1..n in order; each is the marker's
           centre, placed beside (not on) the control it points at
Output keeps the capture's 2x density. Every shot fills the docs column width;
its height follows the subject (a toolbar is a short strip, a sidebar is tall).
Prints the on-page UI scale (column width / crop width) and warnings. Every
warning is an audit failure to fix or justify.
"""
import json, os, sys, io, zipfile, urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont

COLUMN = 640                    # docs Frame content width, CSS px
MARKER = (217, 0, 108)          # magenta: absent from the Speckle UI palette
MARKER_RING = (255, 255, 255)
MARKER_CSS = 22                 # marker diameter as rendered on the docs page
HERO_PAD = 48                   # CSS px of transparent margin on non-bleed edges
RADIUS = 12                     # CSS px
MIN_SCALE = {"hero": 0.5, "region": 0.6, "element": 0.9}
MAX_SCALE = 1.5                 # beyond this the UI looks magnified: crop wider
MIN_ASPECT = 1.0                # never taller than wide: shots are landscape or letterbox
TOUR_FLOOR = 0.4                # whole-screen orientation shots
MAX_MARKERS = 6

def warn(m):
    print("warning:", m, file=sys.stderr)

def font(size):
    env = os.environ.get("INTER_BOLD")
    cache = os.path.expanduser("~/.cache/docs-screenshots/Inter-Bold.ttf")
    for p in [env, "/usr/share/fonts/opentype/inter/Inter-Bold.otf", "/Library/Fonts/Inter-Bold.otf", cache]:
        if p and os.path.exists(p):
            return ImageFont.truetype(p, size)
    try:
        z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(
            "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip", timeout=60).read()))
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        open(cache, "wb").write(z.read("extras/ttf/Inter-Bold.ttf"))
        return ImageFont.truetype(cache, size)
    except Exception as e:
        sys.exit(f"Inter Bold not found and download failed ({e}); set INTER_BOLD=/path/Inter-Bold.ttf")

spec = json.load(open(sys.argv[1]))
tier = spec.get("tier", "region")
if tier not in MIN_SCALE:
    sys.exit(f"unknown tier {tier!r}")
raw = Image.open(spec["raw"]).convert("RGBA")
dpr = spec.get("dpr", 2)
cx0, cy0, cx1, cy1 = spec.get("crop", [0, 0, raw.width // dpr, raw.height // dpr])
shot = raw.crop((cx0 * dpr, cy0 * dpr, cx1 * dpr, cy1 * dpr))
cw = cx1 - cx0

# --- layout ---------------------------------------------------------------
pad = {e: 0 for e in ("left", "top", "right", "bottom")}
inset = bool(spec.get("inset"))
framed = tier == "hero" or inset
if framed:
    bleed = set(spec.get("bleed", []))
    if bleed - set(pad):
        sys.exit(f"bad bleed edges {bleed - set(pad)}")
    for e in pad:
        pad[e] = 0 if e in bleed else HERO_PAD
    if inset:
        # side margins grow until the panel shows at MAX_SCALE, centred
        tall = (cy1 - cy0) + pad["top"] + pad["bottom"]
        need = max(COLUMN / MAX_SCALE, tall * MIN_ASPECT) - cw
        side = max(HERO_PAD, int(need / 2 + 0.999))
        pad["left"] = pad["right"] = side
elif spec.get("bleed"):
    warn("bleed applies to hero or inset only; ignored")
W = shot.width + (pad["left"] + pad["right"]) * dpr
H = shot.height + (pad["top"] + pad["bottom"]) * dpr
ox, oy = pad["left"] * dpr, pad["top"] * dpr
total_css = W / dpr
shown = COLUMN                  # Frames are full width
eff = shown / total_css

# --- legibility -----------------------------------------------------------
floor = MIN_SCALE[tier]
if spec.get("tour"):
    floor = TOUR_FLOOR
if eff < floor:
    warn(f"{tier} renders at {eff:.2f}x on the page (floor {floor}); crop closer")
if eff > MAX_SCALE:
    warn(f"UI shows magnified at {eff:.2f}x; widen the crop with neighbouring UI "
         f"(crop >= {round(COLUMN / MAX_SCALE)} CSS px wide)")
if W / H < MIN_ASPECT:
    warn(f"shot is {H / W:.2f}x taller than wide; shots are landscape: widen with neighbouring "
         f"UI, crop shorter, or set inset for a narrow panel")

# --- compose --------------------------------------------------------------
can = Image.new("RGBA", (W, H), (0, 0, 0, 0))
mask = Image.new("L", shot.size, 255)
if framed:
    r = RADIUS * dpr
    big = Image.new("L", (shot.width + 2 * r, shot.height + 2 * r), 0)
    # round only the corners that sit on visible (non-bleed) edges
    x0 = 0 if pad["left"] else -r
    y0 = 0 if pad["top"] else -r
    x1 = shot.width if pad["right"] else shot.width + r
    y1 = shot.height if pad["bottom"] else shot.height + r
    m = Image.new("L", (shot.width + 4 * r, shot.height + 4 * r), 0)
    ImageDraw.Draw(m).rounded_rectangle((x0 + 2 * r, y0 + 2 * r, x1 + 2 * r - 1, y1 + 2 * r - 1), r, fill=255)
    mask = m.crop((2 * r, 2 * r, 2 * r + shot.width, 2 * r + shot.height))
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((ox + x0, oy + y0 + 4 * dpr, ox + x1, oy + y1 + 4 * dpr), r, fill=60)
    sh = sh.filter(ImageFilter.GaussianBlur(14 * dpr))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow.putalpha(sh)
    can = Image.alpha_composite(can, shadow)
    edge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle((ox + x0, oy + y0, ox + x1 - 1, oy + y1 - 1), r, outline=(0, 0, 0, 28), width=dpr)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(shot, (ox, oy), mask)
    can = Image.alpha_composite(can, layer)
    can = Image.alpha_composite(can, edge)
else:
    can.paste(shot, (0, 0))

# --- markers --------------------------------------------------------------
markers = spec.get("markers", [])
if len(markers) > MAX_MARKERS:
    warn(f"{len(markers)} markers; more than {MAX_MARKERS} means the shot should split")
d = ImageDraw.Draw(can)
diam = MARKER_CSS * total_css / shown * dpr      # constant size on the page
f = font(round(diam * 0.6))
placed = []
for i, (mx, my) in enumerate(markers, 1):
    if not (cx0 <= mx <= cx1 and cy0 <= my <= cy1):
        warn(f"marker {i} at ({mx},{my}) is outside the crop")
    px, py = ox + (mx - cx0) * dpr, oy + (my - cy0) * dpr
    R = diam / 2
    ring = max(2, round(diam * 0.09))
    edge = R + ring + dpr                         # keep the whole marker in frame
    cx_, cy_ = min(max(px, edge), W - edge), min(max(py, edge), H - edge)
    if (cx_, cy_) != (px, py):
        warn(f"marker {i} would clip the image edge; moved {abs(cx_-px)/dpr:.0f},{abs(cy_-py)/dpr:.0f} CSS px "
             "inward. Check it still sits beside its target, or move it in the spec")
        px, py = cx_, cy_
    for qx, qy, j in placed:
        if ((px - qx) ** 2 + (py - qy) ** 2) ** 0.5 < diam * 1.2:
            warn(f"markers {j} and {i} overlap")
    placed.append((px, py, i))
    d.ellipse((px - R - ring, py - R - ring, px + R + ring, py + R + ring), fill=MARKER_RING + (255,))
    d.ellipse((px - R, py - R, px + R, py + R), fill=MARKER + (255,))
    d.text((px, py + diam * 0.02), str(i), font=f, fill=(255, 255, 255, 255), anchor="mm")

can.save(spec["out"], optimize=True)
print(f"{spec['out']} {W}x{H}px tier={tier} on-page scale {eff:.2f}x")
if markers:
    print("caption must name markers:", " · ".join(f"{i} …" for i in range(1, len(markers) + 1)))
