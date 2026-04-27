"""
Convert Natural Earth III's 16-bit DEM (8640x4320) to an Orogen-ready
2:1 equirectangular 8-bit grayscale PNG with oceans at 0 (black).

Natural Earth III's "16_bit_dem_small" uses a non-zero baseline for sea
level (raw value ~8068, the global mode). Sub-sea-level land pixels
(Dead Sea, Death Valley below sea level if any) sit below 8068. We
floor everything <= sea_level to 0 so Orogen sees a clean land/ocean
boundary, then linearly normalize land (8068 → max) to (0 → 255).

Source: https://www.shadedrelief.com/natural3/pages/extra.html
        (public domain, Tom Patterson)

Usage:
    python tools/convert-base-dem.py \\
        tools/dem_small/16_bit_dem_small.tif \\
        tools/base-heightmap.png
"""

from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image
import numpy as np


# Natural Earth III "small" DEM sea-level value (the histogram mode).
SEA_LEVEL = 8068

# Output dimensions for Orogen. 4096x2048 keeps Orogen's climate run
# fast without losing resolution that matters for our scenarios.
OUT_W, OUT_H = 4096, 2048


def main(inp: Path, out: Path) -> None:
    img = Image.open(inp)
    arr = np.asarray(img)
    h, w = arr.shape
    if abs(w / h - 2.0) > 1e-6:
        raise ValueError(f"Expected 2:1 equirectangular, got {w}x{h}")

    # Floor everything at or below sea level to 0; subtract the baseline
    # from land pixels so the dynamic range starts at 0.
    land = np.maximum(arr.astype(np.int32) - SEA_LEVEL, 0)
    hi = int(land.max())
    if hi <= 0:
        raise RuntimeError("All pixels at/below sea level — wrong SEA_LEVEL?")

    # Linear normalize land (0 .. hi) -> (0 .. 255).
    norm = (land.astype(np.float64) / hi * 255.0).clip(0, 255).astype(np.uint8)

    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(norm, mode="L") \
         .resize((OUT_W, OUT_H), Image.LANCZOS) \
         .save(out, format="PNG", optimize=True)

    # Diagnostic probe.
    final = np.asarray(Image.open(out))
    probes = [
        ("Mid-Pacific      (0N,  -150W)",  1024, int((-150 + 180) / 360 * OUT_W)),
        ("Mid-Atlantic     (30N, -40W)",   int((90 - 30) / 180 * OUT_H), int((-40 + 180) / 360 * OUT_W)),
        ("Mediterranean    (35N, 18E)",    int((90 - 35) / 180 * OUT_H), int((18 + 180) / 360 * OUT_W)),
        ("Sahara           (22N, 10E)",    int((90 - 22) / 180 * OUT_H), int((10 + 180) / 360 * OUT_W)),
        ("Everest          (28N, 87E)",    int((90 - 28) / 180 * OUT_H), int((87 + 180) / 360 * OUT_W)),
        ("Andes            (-15S, -72W)",  int((90 - -15) / 180 * OUT_H), int((-72 + 180) / 360 * OUT_W)),
        ("Antarctica       (-80S, 0E)",    int((90 - -80) / 180 * OUT_H), int((0 + 180) / 360 * OUT_W)),
    ]
    print(f"Wrote {out} ({OUT_W}x{OUT_H})")
    print("Probe values (0 = ocean/black, 255 = highest peak):")
    for name, y, x in probes:
        print(f"  {name}: {int(final[y, x])}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert-base-dem.py <input.tif> <output.png>", file=sys.stderr)
        sys.exit(2)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
