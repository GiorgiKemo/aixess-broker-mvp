"""Import the photos Lasha's Figma file draws (file mdoKe84QEOkpDthDFO8pyy, 19 November 2026 export).

Kemo, 19 November 2026: "make sure that design matches figma pixel to pixel". Every page photo that
differs from the site's comes from the Figma file's own image fills, unchanged, as WebP at the
widths below. Originals are fetched once with GET /v1/files/:key/images and named by their
imageRef; run:

    python3 scripts/import-figma-photos.py <folder of originals named by imageRef>

Writes public/assets/figma/<name>-<width>.webp and src/data/figma-photo-sizes.json.

Theme versions (Kemo, 19 November 2026: "for each pic ... generate 2 more one for afternoon one for
night ... beautiful lights to buildings during night ... realistic"; brief in docs/theme-photos/):

    python3 scripts/import-figma-photos.py --themes <folder of <name>-<theme>.png|jpg|webp>
    python3 scripts/import-figma-photos.py --from-themed reverance-hero=reverance-towers
    python3 scripts/import-figma-photos.py --onto downtown-fig-hero=downtown-hero

--themes takes relit versions of the Figma photos (theme = day, afternoon or night) and lines each
one up with its Figma photo before writing it: feature matching finds any shift, scale or crop the
image model introduced, so the theme cross-fade never jumps; uncovered edges are filled from the
nearest pixels. --from-themed does the same for an existing brand family's afternoon and night
(public/assets/themed). --onto gives a cut of a Figma photo that lives in public/assets/dubai
(src/data/dubai-media.json) the theme versions of that Figma photo, placed by matching the two in
the same light. All three write public/assets/figma/<name>-<theme>-<width>.webp, at the Figma
photo's own size and widths, and list them under "themes" in the manifest. Needs opencv-python.
"""
import json
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/figma"
THEMED = ROOT / "public/assets/themed"
MANIFEST = ROOT / "src/data/figma-photo-sizes.json"
WIDTHS = (480, 800, 1200, 1600, 2400, 3200)
THEMES = ("day", "afternoon", "night")

# name -> imageRef prefix (the Figma layer that draws it)
PHOTOS = {
    # HOME (147:2)
    "home-hero": "09082a84",  # rarra-gigapixel-standard v2-2x 2
    "home-about": "150d9f00",  # connection 1
    "home-tresora": "50acc854",  # 5556 1
    "home-downtown": "7838a31f",  # center 1
    # AIXESS ADVANTAGE (175:607)
    "advantage-hero": "8cb480cc",  # 999 1
    "advantage-more": "1fc36e1e",  # 3af5f2d6…
    # BROKER ACCESS (216:153)
    "broker-hero": "fb33e489",  # 3:4 1
    "broker-join": "e19f832f",  # 777 1
    "broker-commercial": "747b1ba6",  # rand-gigapixel-standard v2-2
    "broker-workspace": "714bbd44",  # kk 1
    # REVERANCE (405:327)
    "reverance-hero": "0c4aec5a",  # 128-gigapixel-standard v2-2x 3
    # DOWNTOWN ONE (553:232)
    "downtown-hero": "d53ff9af",  # bluish-gigapixel-standard v2-2x 1
    "downtown-highlights": "101414dc",  # oplaa-gigapixel-high fidelity v2-2x 1
    "downtown-entertainment": "3b024b70",  # ent 1
    "downtown-map": "0518c9bf",  # last map 1
}

# The light each Figma photo itself shows: the frame used dusk renders of the Dubai towers.
LIGHT = {name: "night" for name in ("home-tresora", "home-downtown", "downtown-hero", "downtown-highlights", "downtown-entertainment")}


def write_widths(image, stem, widths):
    for width in widths:
        height = round(image.height * width / image.width)
        resized = image if width == image.width else image.resize((width, height), Image.LANCZOS)
        resized.save(OUT / f"{stem}-{width}.webp", "WEBP", quality=86, method=6)


def main(source: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    for name, ref in PHOTOS.items():
        ref, crop = ref if isinstance(ref, tuple) else (ref, None)
        original = next(source.glob(f"{ref}*"))
        image = Image.open(original)
        image = image.convert("RGB" if crop else "RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
        if crop:
            image = image.resize((round(image.width * 4), round(image.height * 4)), Image.LANCZOS).crop(tuple(round(v * 4) for v in crop))
            image = image.resize((round(image.width / 4), round(image.height / 4)), Image.LANCZOS)
        widths = sorted({w for w in WIDTHS if w < image.width} | ({image.width} if image.width <= WIDTHS[-1] else {WIDTHS[-1]}))
        write_widths(image, name, widths)
        previous = manifest.get(name, {})
        manifest[name] = {"width": image.width, "height": image.height, "widths": widths}
        if name in LIGHT:
            manifest[name]["light"] = LIGHT[name]
        if previous.get("themes"):
            manifest[name]["themes"] = previous["themes"]
        print(name, image.size, widths)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


def reference(name, manifest):
    """The Figma photo at its full manifest size (from the largest WebP written)."""
    entry = manifest[name]
    base = ROOT / "public" / entry["base"].lstrip("/") if entry.get("base") else OUT / name
    image = Image.open(f"{base}-{entry['widths'][-1]}.webp").convert("RGB")
    return image.resize((entry["width"], entry["height"]), Image.LANCZOS)


def find_placement(candidate, target, any_scale=False):
    """The similarity transform (2 x 3) that puts `candidate` onto `target`, or None if unsure."""
    import cv2
    import numpy as np

    tw, th = target.size
    cand = np.asarray(candidate.convert("RGB"))[:, :, ::-1]
    targ = np.asarray(target.convert("RGB"))[:, :, ::-1]
    scale = 1600 / max(tw, th)
    small_t = cv2.resize(targ, (round(tw * scale), round(th * scale)), interpolation=cv2.INTER_AREA)
    cs = 1600 / max(cand.shape[1], cand.shape[0])
    small_c = cv2.resize(cand, (round(cand.shape[1] * cs), round(cand.shape[0] * cs)), interpolation=cv2.INTER_AREA)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    # Lighting changes between the versions, geometry does not: match on edges first, then on
    # contrast-equalised grey (dark night images), and keep the first placement that is certain.
    views = (
        lambda im: cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), (3, 3), 0), 40, 120),
        lambda im: clahe.apply(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)),
    )
    expected = tw / cand.shape[1]
    for view in views:
        orb = cv2.ORB_create(8000)
        kt, dt = orb.detectAndCompute(view(small_t), None)
        kc, dc = orb.detectAndCompute(view(small_c), None)
        if dt is None or dc is None:
            continue
        matches = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(dc, dt), key=lambda m: m.distance)[:1500]
        if len(matches) < 30:
            continue
        pc = np.float32([kc[m.queryIdx].pt for m in matches]) / cs
        pt = np.float32([kt[m.trainIdx].pt for m in matches]) / scale
        found, inliers = cv2.estimateAffinePartial2D(pc, pt, ransacReprojThreshold=4)
        if found is None or inliers is None or int(inliers.sum()) < 60:
            continue
        s = float(np.hypot(found[0, 0], found[1, 0]))
        if (0.25 < s < 4 if any_scale else 0.8 < s / expected < 1.25) and abs(np.degrees(np.arctan2(found[1, 0], found[0, 0]))) < 2:
            return found, int(inliers.sum())
    return None, 0


def align(candidate, target, matrix=None):
    """`candidate` placed on `target`'s frame (same size); returns the image and how it was placed."""
    import cv2
    import numpy as np

    tw, th = target.size
    cand = np.asarray(candidate.convert("RGB"))[:, :, ::-1]
    found = 0
    if matrix is None:
        matrix, found = find_placement(candidate, target)
    if matrix is None:
        # Not certain: fill the frame keeping the proportions (centre crop), never stretch.
        k = max(tw / cand.shape[1], th / cand.shape[0])
        matrix = np.float32([[k, 0, (tw - cand.shape[1] * k) / 2], [0, k, (th - cand.shape[0] * k) / 2]])
        how = "NOT ALIGNED: centre-cropped to fill (check it)"
    else:
        s = float(np.hypot(matrix[0, 0], matrix[1, 0]))
        how = f"aligned ({found or 'given'} matches, scale {s:.3f}, shift {matrix[0, 2]:.1f},{matrix[1, 2]:.1f})"
    warped = cv2.warpAffine(cand, matrix, (tw, th), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT_101)
    return Image.fromarray(warped[:, :, ::-1]), how


def add_theme(name, theme, image, manifest, matrix=None):
    entry = manifest[name]
    aligned, how = align(image, reference(name, manifest), matrix)
    write_widths(aligned, f"{name}-{theme}", entry["widths"])
    entry.setdefault("themes", {})[theme] = {"width": entry["width"], "height": entry["height"], "widths": entry["widths"]}
    print(f"{name} {theme}: {image.size} -> {aligned.size}, {how}")


def themes(folder: Path) -> None:
    manifest = json.loads(MANIFEST.read_text())
    for path in sorted(folder.iterdir()):
        stem = path.stem
        name, _, theme = stem.rpartition("-")
        if path.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp") or theme not in THEMES or name not in manifest:
            print("skipped", path.name)
            continue
        add_theme(name, theme, Image.open(path), manifest)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


def from_themed(pair: str) -> None:
    name, family = pair.split("=")
    manifest = json.loads(MANIFEST.read_text())
    sizes = json.loads((ROOT / "src/data/theme-photo-sizes.json").read_text())[family]
    load = lambda theme: Image.open(THEMED / f"{family}-{theme}-{sizes[theme]['widths'][-1]}.webp").convert("RGB")
    # The family's versions share one geometry: place its day photo (the clearest) and reuse that.
    matrix, found = find_placement(load("day"), reference(name, manifest))
    if matrix is None:
        sys.exit(f"{family} does not line up with {name}")
    print(f"{family} day on {name}: {found} matches")
    for theme in ("afternoon", "night"):
        add_theme(name, theme, load(theme), manifest, matrix)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


def onto(pair: str) -> None:
    name, source = pair.split("=")
    manifest = json.loads(MANIFEST.read_text())
    media = json.loads((ROOT / "src/data/dubai-media.json").read_text())[name]
    entry = {"width": media["width"], "height": media["height"], "widths": media["widths"], "base": f"/assets/dubai/{name}"}
    if manifest[source].get("light"):
        entry["light"] = manifest[source]["light"]
    manifest[name] = entry
    # The cut and the Figma photo show the same light: place one on the other, then reuse that placement.
    # A cut can be any part of the photo, at any scale.
    matrix, found = find_placement(reference(source, manifest), reference(name, manifest), any_scale=True)
    if matrix is None:
        sys.exit(f"{source} does not line up with {name}")
    print(f"{source} on {name}: {found} matches")
    for theme, version in manifest[source].get("themes", {}).items():
        image = Image.open(OUT / f"{source}-{theme}-{version['widths'][-1]}.webp").convert("RGB")
        image = image.resize((manifest[source]["width"], manifest[source]["height"]), Image.LANCZOS)
        add_theme(name, theme, image, manifest, matrix)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    if sys.argv[1] == "--themes":
        themes(Path(sys.argv[2]))
    elif sys.argv[1] == "--from-themed":
        for pair in sys.argv[2:]:
            from_themed(pair)
    elif sys.argv[1] == "--onto":
        for pair in sys.argv[2:]:
            onto(pair)
    else:
        main(Path(sys.argv[1]))
