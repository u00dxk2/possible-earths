"""
mediterranean-dry.py — edit a 2:1 equirectangular Earth heightmap
to express the Messinian Salinity Crisis (~5.96 Ma): Mediterranean
basin drained, exposing a vast desert basin.

Orogen import convention: black (0) = ocean, brighter = higher.
We paint the Med basin as low-elevation land (~50m equivalent)
and feather edges so the climate model doesn't produce hard-edged
Köppen banding.

Usage:
    python tools/scenarios/mediterranean-dry.py \\
        tools/base-heightmap.png \\
        public/scenarios/mediterranean-dry/heightmap-input.png
"""

from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np


# --- Tunables -------------------------------------------------------

# Grayscale value (0-255) for the drained basin. ~45 ≈ low desert.
TARGET_ELEVATION = 45

# Edge feather as a fraction of image width. 0.012 ≈ 24px at 2048w.
# Hard edges produce banding in Orogen's Köppen output.
FEATHER_FRACTION = 0.012

# Approximate Mediterranean basin outline (lon, lat). Loose is fine —
# the feather absorbs imprecision. Doesn't include the Black Sea.
MED_POLYGON = [
    (-5.5, 36.0),  (-2.0, 37.5), (3.0, 43.0),  (12.0, 45.5),
    (15.0, 45.0),  (19.0, 41.5), (23.0, 40.0), (28.0, 41.0),
    (32.0, 37.0),  (36.0, 36.5), (35.5, 33.0), (32.0, 31.0),
    (28.0, 31.0),  (20.0, 32.5), (11.0, 33.0), (5.0, 36.0),
    (-1.0, 35.5),  (-5.5, 36.0),
]


# --- Geometry -------------------------------------------------------

def lonlat_to_xy(lon: float, lat: float, w: int, h: int) -> tuple[int, int]:
    x = int((lon + 180.0) / 360.0 * w)
    y = int((90.0 -  lat) / 180.0 * h)
    return x, y


# --- Main -----------------------------------------------------------

def main(inp: Path, out: Path) -> None:
    img = Image.open(inp).convert("L")
    w, h = img.size
    if abs(w / h - 2.0) > 1e-6:
        raise ValueError(f"Expected 2:1 equirectangular, got {w}x{h}")

    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([lonlat_to_xy(lo, la, w, h) for lo, la in MED_POLYGON], fill=255)

    feather_px = max(8, int(w * FEATHER_FRACTION))
    mask = mask.filter(ImageFilter.GaussianBlur(radius=feather_px))

    base   = np.asarray(img,  dtype=np.float32)
    m      = np.asarray(mask, dtype=np.float32) / 255.0
    target = np.full_like(base, TARGET_ELEVATION, dtype=np.float32)
    blended = base * (1.0 - m) + target * m

    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8), mode="L") \
         .save(out, format="PNG", optimize=True)
    print(f"Wrote {out} ({w}x{h})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python mediterranean-dry.py <input.png> <output.png>",
              file=sys.stderr)
        sys.exit(2)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
