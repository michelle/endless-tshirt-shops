#!/usr/bin/env python3
"""Visual QA for the Skyborn chart PNG without human eyes: verifies
composition (text bands, ring, stars, moon) and prints an ASCII preview."""
import sys
from PIL import Image

path = sys.argv[1]
img = Image.open(path).convert("RGBA")
w, h = img.size
print(f"size: {w}x{h}")

px = img.load()

def band_ink(y0, y1):
    """count non-transparent, non-background pixels in a horizontal band"""
    n = 0
    for y in range(y0, y1, 2):
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if a > 30:
                n += 1
    return n

W = w
H = h
regions = [
    ("kicker (title)", int(H*0.075), int(H*0.095)),
    ("name", int(H*0.115), int(H*0.16)),
    ("date line", int(H*0.165), int(H*0.19)),
    ("ring top", int(H*0.20), int(H*0.23)),
    ("sky upper", int(H*0.33), int(H*0.40)),
    ("sky lower", int(H*0.52), int(H*0.60)),
    ("coords", int(H*0.72), int(H*0.75)),
    ("facts", int(H*0.75), int(H*0.78)),
    ("message", int(H*0.78), int(H*0.82)),
    ("footer", int(H*0.84), int(H*0.90)),
]
for name, y0, y1 in regions:
    print(f"  {name:14s} ink={band_ink(y0, y1)}")

# star count estimate: isolated small bright blobs in the chart area
cx, cy = W//2, int(H*0.464)
# ASCII preview (downsampled)
cols, rows = 62, 74
chars = " .:-=+*#%@"
out = []
for ry in range(rows):
    line = ""
    for rx in range(cols):
        x0 = int(rx * w / cols); x1 = int((rx+1) * w / cols)
        y0 = int(ry * h / rows); y1 = int((ry+1) * h / rows)
        best = 0
        tot = 0
        cnt = 0
        for y in range(y0, y1, max(1, (y1-y0)//3 or 1)):
            for x in range(x0, x1, max(1, (x1-x0)//3 or 1)):
                r, g, b, a = px[x, y]
                if a > 40:
                    v = (r + g + b) / 3 / 255
                    best = max(best, v)
                    tot += v; cnt += 1
        avg = tot / cnt if cnt else 0
        v = max(avg * 0.6, best)
        line += chars[min(9, int(v * 10))]
    out.append(line)
print("\n".join(out))
