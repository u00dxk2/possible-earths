"""
crop-cover.py — crop a cover image from a 2:1 equirectangular map.

Given an equirectangular PNG (e.g. an Orogen satellite or terrain export),
crop a rectangular region centered on a (lat, lon). If the requested crop
runs off the image edge, it clips at the edge — no antimeridian wrap.

Usage:
    python tools/crop-cover.py <input.png> <output.png> <lat> <lon> <w> <h>

Example (Mediterranean Dry cover, 1600x900 centered at 30N 15E):
    python tools/crop-cover.py \\
        public/scenarios/mediterranean-dry/after-satellite.png \\
        public/scenarios/mediterranean-dry/cover.png \\
        30 15 1600 900
"""

from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image


def main(inp: Path, out: Path, lat: float, lon: float, w: int, h: int) -> None:
    img = Image.open(inp)
    iw, ih = img.size
    if abs(iw / ih - 2.0) > 1e-6:
        print(
            f"warning: input is {iw}x{ih} (not 2:1 equirectangular); "
            f"lat/lon mapping assumes plate-carrée projection",
            file=sys.stderr,
        )

    cx = int((lon + 180.0) / 360.0 * iw)
    cy = int((90.0 - lat) / 180.0 * ih)

    left = max(0, cx - w // 2)
    top = max(0, cy - h // 2)
    right = min(iw, left + w)
    bottom = min(ih, top + h)
    # If we hit the right/bottom edge, slide left/top in to keep the
    # requested dimensions where possible.
    left = max(0, right - w)
    top = max(0, bottom - h)

    crop = img.crop((left, top, right, bottom))
    out.parent.mkdir(parents=True, exist_ok=True)
    crop.save(out, format="PNG", optimize=True)
    print(
        f"Wrote {out} ({crop.size[0]}x{crop.size[1]}) "
        f"from ({left},{top})-({right},{bottom}) of {iw}x{ih}"
    )


if __name__ == "__main__":
    if len(sys.argv) != 7:
        print(
            "Usage: python crop-cover.py <input.png> <output.png> <lat> <lon> <w> <h>",
            file=sys.stderr,
        )
        sys.exit(2)
    main(
        Path(sys.argv[1]),
        Path(sys.argv[2]),
        float(sys.argv[3]),
        float(sys.argv[4]),
        int(sys.argv[5]),
        int(sys.argv[6]),
    )
