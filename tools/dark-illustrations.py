"""Derive dark-mode versions of the ink illustrations.

Black lines become the dark-mode ink colour, the yellow accents stay yellow,
and the white paper becomes transparent, so the drawing sits on the dark page
with no white box around it.

The portrait is not inverted (a face in negative stops looking like the person):
only the paper around the figure is cleared, with ImageMagick:

  magick portrait.webp -alpha set -fuzz 12% -fill none \
    -draw "color 2,2 floodfill" -draw "color 637,2 floodfill" \
    -draw "color 2,300 floodfill" -draw "color 637,300 floodfill" \
    -quality 82 portrait-dark.webp

Usage: python3 tools/dark-illustrations.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets" / "img" / "illustrations"
INK = np.array([232, 237, 240], dtype=np.float32)  # dark-mode --color-ink, oklch(94% 0.008 220)
NAMES = ["buenos-aires", "auckland", "coffee"]


def convert(name: str) -> None:
    src = Image.open(ROOT / f"{name}.webp").convert("RGB")
    rgb = np.asarray(src, dtype=np.float32) / 255.0

    lum = rgb.mean(axis=2)
    darkness = 1.0 - lum
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    yellow = np.clip((saturation - 0.08) / 0.5, 0.0, 1.0)

    alpha = np.clip(np.maximum(darkness * 1.15, yellow), 0.0, 1.0)
    alpha = np.where(alpha < 0.05, 0.0, alpha)  # drop the haze left by off-white paper
    colour = INK[None, None, :] * (1.0 - yellow[..., None]) + (rgb * 255.0) * yellow[..., None]

    out = np.dstack([colour, alpha * 255.0]).round().clip(0, 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(ROOT / f"{name}-dark.webp", "WEBP", quality=82, method=6)
    print(f"{name}-dark.webp")


if __name__ == "__main__":
    for name in NAMES:
        convert(name)
