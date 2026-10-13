"""Write the static AiXESS logo files from the vector wordmark in src/brand/aixess-wordmark.js.

usage: python3 scripts/build-logo-assets.py   (needs cairosvg and Pillow)
writes public/brand/: aixess-logo.svg (dark), aixess-logo-white.svg, aixess-logo-white.png (client PDF),
aixess-mark.svg (favicon: the custom A cut just before the I) and aixess-mark-180.png (apple touch icon).
"""

import io
import re
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "brand"
INK, PAPER = "#171a1d", "#f7f7f4"
MARK_CLIP_X = 298  # the I starts at x 299.6; the swoosh tip is cut just short of it

source = (ROOT / "src" / "brand" / "aixess-wordmark.js").read_text()
WIDTH = float(re.search(r"width: ([\d.]+)", source).group(1))
HEIGHT = float(re.search(r"height: ([\d.]+)", source).group(1))
PATHS = re.findall(r'"(M[^"]+)"', source)


def wordmark(fill):
    paths = "".join(f'<path d="{d}"/>' for d in PATHS)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}" '
        f'role="img" aria-label="AiXESS"><title>AiXESS</title><g fill="{fill}">{paths}</g></svg>\n'
    )


def mark(style, background=""):
    pad = (360 - MARK_CLIP_X) / 2
    paths = "".join(f'<path d="{d}"/>' for d in PATHS[:2])
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad:g} 0 360 360"><style>{style}</style>{background}'
        f'<clipPath id="a"><rect x="{-pad:g}" y="0" width="{pad + MARK_CLIP_X:g}" height="360"/></clipPath>'
        f'<g clip-path="url(#a)">{paths}</g></svg>\n'
    )


(OUT).mkdir(parents=True, exist_ok=True)
(OUT / "aixess-logo.svg").write_text(wordmark(INK))
(OUT / "aixess-logo-white.svg").write_text(wordmark("#ffffff"))
cairosvg.svg2png(bytestring=wordmark("#ffffff").encode(), write_to=str(OUT / "aixess-logo-white.png"), output_width=2400)
(OUT / "aixess-mark.svg").write_text(mark(f"g{{fill:{INK}}}@media (prefers-color-scheme:dark){{g{{fill:{PAPER}}}}}"))
# Apple touch icon: iOS adds no background, so the dark A sits on a paper square with breathing room.
touch = mark(f"g{{fill:{INK}}}", f'<rect x="-100" y="-100" width="600" height="600" fill="{PAPER}"/>')
pad = (360 - MARK_CLIP_X) / 2
touch = touch.replace(f'viewBox="{-pad:g} 0 360 360"', f'viewBox="{-pad - 45:g} -45 450 450"', 1)
png = cairosvg.svg2png(bytestring=touch.encode(), output_width=180, output_height=180)
Image.open(io.BytesIO(png)).convert("RGB").save(OUT / "aixess-mark-180.png")
print("wrote", sorted(p.name for p in OUT.iterdir()))
