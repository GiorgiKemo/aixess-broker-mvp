"""Build the day / afternoon / night brand photo sets (Benji and Giorgi, 13 October 2026).

Each family has three versions of one scene, so the photos change with the time-of-day theme.
They are generated mood photography for the brand pages, never a project or a listing; family
"opportunities" is the original Reverance render (day, unchanged) and two relit copies of it.

usage: python3 scripts/import-theme-photos.py SOURCE_DIR [UPSCALED_DIR]

SOURCE_DIR holds the supplied files (<number>-<scene>-<theme>.png/.webp, see FAMILIES).
UPSCALED_DIR may hold <source stem>-x4.png: a 4x EDSR super-resolution enlargement (OpenCV
dnn_superres, EDSR_x4.pb) of a hero photo: phones and Retina laptops draw the full-width heroes
and the Advantage / Broker Access split-hero photos 1.5-3x larger than the supplied files. A light unsharp mask restores the edge contrast the enlargement
softens; it adds no detail that was not in the original. Photos without an enlargement are
used at their native size.

Writes public/assets/themed/<family>-<theme>-<width>.avif and .webp, src/data/theme-photo-sizes.json and
the homepage hero widths in index.html's theme boot script.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "themed"
SIZES = ROOT / "src" / "data" / "theme-photo-sizes.json"
THEMES = ("day", "afternoon", "night")
FAMILIES = {
    "dubai-skyline": "01-dubai-skyline",
    "switzerland-lakeside": "02-switzerland-lakeside",
    "coastal-lifestyle": "03-coastal-lifestyle",
    "coastal-city": "04-coastal-city",
    "glass-architecture": "05-glass-architecture",
    "calm-waterfront": "06-broker-tools-calm-hero",
    "coastal-residence": "07-coastal-residence",
    "workspace-building": "08-workspace-modern-building",
    "opportunities": "09-selected-opportunities-original",
}
NATIVE_WIDTHS = (480, 800, 1200, 1600, 2400)
UPSCALED_WIDTHS = (480, 800, 1200, 1600, 2400, 3200, 4000)
# Every browser that can use the 3200/4000px files also reads AVIF, so WebP (the fallback for
# older browsers) stops at 2400px to keep the deployment small.
WEBP_MAX = 2400


def source_for(directory, stem):
    for suffix in (".png", ".webp"):
        path = directory / f"{stem}{suffix}"
        if path.exists():
            return path
    raise FileNotFoundError(stem)


def main(source_dir, upscaled_dir=None):
    OUT.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for family, prefix in FAMILIES.items():
        sizes[family] = {}
        for theme in THEMES:
            stem = f"{prefix}-{theme}"
            upscaled = upscaled_dir / f"{stem}-x4.png" if upscaled_dir else None
            if upscaled and upscaled.exists():
                image = Image.open(upscaled).convert("RGB").filter(ImageFilter.UnsharpMask(radius=6, percent=50, threshold=2))
                widths = [w for w in UPSCALED_WIDTHS if w <= image.width]
            else:
                image = Image.open(source_for(source_dir, stem)).convert("RGB")
                widths = sorted({w for w in NATIVE_WIDTHS if w < image.width} | {image.width})
            for old in OUT.glob(f"{family}-{theme}-*.*"):
                old.unlink()
            for width in widths:
                height = round(image.height * width / image.width)
                resized = image.resize((width, height), Image.LANCZOS)
                if width <= WEBP_MAX or width == widths[0]:
                    resized.save(OUT / f"{family}-{theme}-{width}.webp", "WEBP", quality=88, method=6)
                resized.save(OUT / f"{family}-{theme}-{width}.avif", "AVIF", quality=70, speed=6)
            webp = [w for w in widths if w <= WEBP_MAX] or widths[:1]
            sizes[family][theme] = {"width": image.width, "height": image.height, "widths": widths, "webpWidths": webp}
            print(family, theme, image.size, widths)
    SIZES.write_text(json.dumps(sizes, indent=2) + "\n")
    # index.html preloads the homepage hero in the current theme before React starts.
    index = ROOT / "index.html"
    html = index.read_text()
    start, end = html.index("/*hero-widths*/") + len("/*hero-widths*/"), html.index("/*end*/")
    widths = {theme: sizes["dubai-skyline"][theme]["widths"] for theme in THEMES}  # AVIF preload
    index.write_text(html[:start] + json.dumps(widths, separators=(",", ":")) + html[end:])


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) > 2 else None)
