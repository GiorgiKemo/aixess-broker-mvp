"""Builds the WebP widths of a picture cut from a Figma export for the Dubai pages.

usage: python3 scripts/make-dubai-fig-webp.py SLUG SOURCE.png [left top right bottom]
The box is in the source's own pixels. Widths: 480, 960, 1440, 1920 and the full width, never upscaled.
The slug and its size are added to src/data/dubai-media.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
root = Path(__file__).resolve().parent.parent
slug, source = sys.argv[1], sys.argv[2]
image = Image.open(source).convert("RGB")
if len(sys.argv) == 7:
    image = image.crop(tuple(int(round(float(v))) for v in sys.argv[3:7]))
out = root / "public/assets/dubai"
for old in out.glob(f"{slug}-*.webp"):
    if old.stem[len(slug) + 1:].isdigit():
        old.unlink()
widths = sorted({w for w in (480, 960, 1440, 1920) if w < image.width} | {image.width})
for width in widths:
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.LANCZOS).save(out / f"{slug}-{width}.webp", "WEBP", quality=86, method=6)
media_path = root / "src/data/dubai-media.json"
media = json.loads(media_path.read_text())
media[slug] = {"height": image.height, "width": image.width, "widths": widths}
media_path.write_text(json.dumps(media, indent=1, ensure_ascii=False) + "\n")
print(slug, image.size, widths)
