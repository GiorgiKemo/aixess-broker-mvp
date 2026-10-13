"""Convert the generated AiXESS brand photos into the site's responsive WebP set.

Klem (13 October 2026) asked for property imagery beyond Project Reverance; these images
are AI-generated mood photography for the brand pages, never a real project or listing.

usage: python3 scripts/import-generic-photos.py NAME=path/to/source.png [NAME=...]
writes public/assets/generic/NAME-<width>.webp at the widths below that fit the source.
"""

import sys
from pathlib import Path

from PIL import Image

WIDTHS = (480, 800, 1200)
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "generic"


def main(pairs):
    OUT.mkdir(parents=True, exist_ok=True)
    for pair in pairs:
        name, source = pair.split("=", 1)
        image = Image.open(source).convert("RGB")
        widths = [w for w in WIDTHS if w < image.width] + [image.width]
        for width in sorted(set(widths)):
            height = round(image.height * width / image.width)
            image.resize((width, height), Image.LANCZOS).save(OUT / f"{name}-{width}.webp", "WEBP", quality=82, method=6)
        print(name, image.size, sorted(set(widths)))


if __name__ == "__main__":
    main(sys.argv[1:])
