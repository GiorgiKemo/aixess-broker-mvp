"""Build the day / afternoon / night brand photo sets (Benji and Giorgi, 13 October 2026).

Each family has three versions of one scene, so the photos change with the time-of-day theme.
They are generated mood photography for the brand pages, never a project or a listing; family
"opportunities" is the original Reverance render (day, unchanged) and two relit copies of it.

usage: python3 scripts/import-theme-photos.py SOURCE_DIRS [UPSCALED_DIRS] [--only FAMILY]

SOURCE_DIRS holds the supplied files (<number>-<scene>-<theme>.png/.webp, see FAMILIES); give
several folders joined with ":" (the Broker Tools hero "coastal-classic", design 1A of
14 October 2026, has its own folder: /mnt/project-files/klem-oct13/theme-photos:
/mnt/project-files/klem-oct13/coastal-classic). Every source is found before anything is
written. With --only, just that family is rebuilt and the other families' sizes are kept.
UPSCALED_DIRS (also ":"-joined) may hold <source stem>-x4.png: a 4x EDSR super-resolution enlargement (OpenCV
dnn_superres, EDSR_x4.pb) of a hero photo: phones and Retina laptops draw the full-width heroes
and the Advantage / Broker Access split-hero photos 1.5-3x larger than the supplied files. A light unsharp mask restores the edge contrast the enlargement
softens; it adds no detail that was not in the original. Photos without an enlargement are
used at their native size.

Writes public/assets/themed/<family>-<theme>-<width>.webp, src/data/theme-photo-sizes.json and
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
    # The 1A masters are numbered by theme rather than by family.
    "coastal-classic": {"day": "01-coastal-classic-day", "afternoon": "02-coastal-classic-afternoon", "night": "03-coastal-classic-night"},
    "coastal-residence": "07-coastal-residence",
    "workspace-building": "08-workspace-modern-building",
    "opportunities": "09-selected-opportunities-original",
}
NATIVE_WIDTHS = (480, 800, 1200, 1600, 2400)
UPSCALED_WIDTHS = (480, 800, 1200, 1600, 2400, 3200, 4000)
# WebP only: Safari on Kemo's MacBook showed a broken hero with the AVIF files (13 October 2026),
# while WebP has worked in every browser the site supports.


def find(directories, names):
    for directory in directories:
        for name in names:
            path = directory / name
            if path.exists():
                return path
    return None


def source_for(directories, stem):
    path = find(directories, (f"{stem}.png", f"{stem}.webp"))
    if not path:
        raise FileNotFoundError(stem)
    return path


def main(source_dirs, upscaled_dirs=(), only=None):
    OUT.mkdir(parents=True, exist_ok=True)
    # Fail before deleting or writing anything if a source is missing.
    for family, prefix in FAMILIES.items():
        if not only or family == only:
            for theme in THEMES:
                source_for(source_dirs, prefix[theme] if isinstance(prefix, dict) else f"{prefix}-{theme}")
    sizes = json.loads(SIZES.read_text()) if only else {}
    sizes = {family: sizes[family] for family in FAMILIES if family in sizes}
    for family, prefix in FAMILIES.items():
        if only and family != only:
            continue
        sizes[family] = {}
        for theme in THEMES:
            stem = prefix[theme] if isinstance(prefix, dict) else f"{prefix}-{theme}"
            upscaled = find(upscaled_dirs, (f"{stem}-x4.png",))
            if upscaled:
                image = Image.open(upscaled).convert("RGB").filter(ImageFilter.UnsharpMask(radius=6, percent=50, threshold=2))
                widths = [w for w in UPSCALED_WIDTHS if w <= image.width]
            else:
                image = Image.open(source_for(source_dirs, stem)).convert("RGB")
                widths = sorted({w for w in NATIVE_WIDTHS if w < image.width} | {image.width})
            for old in OUT.glob(f"{family}-{theme}-*.*"):
                old.unlink()
            for width in widths:
                height = round(image.height * width / image.width)
                resized = image.resize((width, height), Image.LANCZOS)
                resized.save(OUT / f"{family}-{theme}-{width}.webp", "WEBP", quality=86, method=6)
            sizes[family][theme] = {"width": image.width, "height": image.height, "widths": widths}
            print(family, theme, image.size, widths)
    sizes = {family: sizes[family] for family in FAMILIES}
    SIZES.write_text(json.dumps(sizes, indent=2) + "\n")
    # index.html preloads the homepage hero in the current theme before React starts.
    index = ROOT / "index.html"
    html = index.read_text()
    start, end = html.index("/*hero-widths*/") + len("/*hero-widths*/"), html.index("/*end*/")
    widths = {theme: sizes["dubai-skyline"][theme]["widths"] for theme in THEMES}  # WebP preload
    index.write_text(html[:start] + json.dumps(widths, separators=(",", ":")) + html[end:])


if __name__ == "__main__":
    args = sys.argv[1:]
    only = None
    if "--only" in args:
        index = args.index("--only")
        only = args[index + 1]
        del args[index:index + 2]
    dirs = lambda value: [Path(part) for part in value.split(":") if part]
    main(dirs(args[0]), dirs(args[1]) if len(args) > 1 else [], only)
