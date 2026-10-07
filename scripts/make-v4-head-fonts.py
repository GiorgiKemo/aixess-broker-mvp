"""Build AiXESS's headline faces from AIXCO.Global v4's type (Kemo, 7 October 2026).

AIXCO.Global v4 sets every headline in Sofia Sans Extra Condensed (SIL OFL) at weight 700 and
its hero at 800, stretched vertically (CSS scaleY 1.9 on desktop) to recover the tall poster
proportion of its brand sheet. AiXESS uses the same type, so this script ships:

  "AiXESS Head"    Sofia Sans Extra Condensed pinned at weight 700, unscaled (all headlines,
                   numbers and labels set in the display face).
  "AiXESS Poster"  Sofia Sans Extra Condensed pinned at weight 800 with every glyph stretched
                   vertically by POSTER_Y, for the AIXESS / TO MARKET hero. Building the stretch
                   into the font keeps real line boxes, so headings can be fitted and wrapped
                   without a CSS transform.

Both are modified versions of an OFL font and ship under new family names, with the OFL text.
Sofia Sans covers Latin, Latin Extended and Cyrillic, so every locale gets the same face.

Usage: python3 scripts/make-v4-head-fonts.py   (needs fonttools + brotli)
"""
from pathlib import Path

from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "font-sources" / "sofia-sans-extra-condensed-variable.ttf"
OUT = ROOT / "public" / "fonts" / "v4"

HEAD_WEIGHT = 700
POSTER_WEIGHT = 800
POSTER_Y = 1.9  # AIXCO.Global v4's desktop hero stretch

SUBSETS = {
    "latin": [*range(0x20, 0x100), 0x131, 0x152, 0x153, 0x2BB, 0x2BC, 0x2C6, 0x2DA, 0x2DC, 0x304, 0x308,
              *range(0x2000, 0x2070), 0x20AC, 0x2122, 0x2190, 0x2192, 0x2212, 0x2215],
    "latin-ext": [*range(0x100, 0x250), *range(0x1E00, 0x1EFF), *range(0x20A0, 0x20C0)],
    "cyrillic": [*range(0x400, 0x460), 0x490, 0x491, 0x4B0, 0x4B1, 0x2116],
    "cyrillic-ext": [*range(0x460, 0x530)],
}


def build(dest, family, weight, unicodes, sy=1.0):
    font = instancer.instantiateVariableFont(TTFont(SOURCE), {"wght": weight})
    options = subset.Options()
    options.layout_features = ["kern", "liga", "tnum", "lnum", "pnum", "case"]
    sub = subset.Subsetter(options)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    if sy != 1.0:
        glyf, glyph_set = font["glyf"], font.getGlyphSet()
        # Flatten composites first so a stretched accent cannot drift off its base letter.
        for name in font.getGlyphOrder():
            if glyf[name].isComposite():
                rec = DecomposingRecordingPen(glyph_set)
                glyph_set[name].draw(rec)
                pen = TTGlyphPen(glyph_set)
                rec.replay(pen)
                glyf[name] = pen.glyph()
        for name in font.getGlyphOrder():
            glyph = glyf[name]
            if glyph.numberOfContours > 0:
                glyph.coordinates.scale((1, sy))
                glyph.coordinates.toInt()
                glyph.recalcBounds(glyf)
        hhea, os2 = font["hhea"], font["OS/2"]
        hhea.ascent, hhea.descent = round(hhea.ascent * sy), round(hhea.descent * sy)
        os2.sTypoAscender, os2.sTypoDescender = round(os2.sTypoAscender * sy), round(os2.sTypoDescender * sy)
        os2.usWinAscent, os2.usWinDescent = round(os2.usWinAscent * sy), round(os2.usWinDescent * sy)
        os2.sCapHeight, os2.sxHeight = round(os2.sCapHeight * sy), round(os2.sxHeight * sy)
    for table in ("HVAR", "MVAR", "STAT", "fvar", "gvar", "avar"):
        if table in font:
            del font[table]
    for record in font["name"].names:
        if record.nameID in (1, 4, 16):
            record.string = family
        elif record.nameID == 6:
            record.string = family.replace(" ", "")
    font.flavor = "woff2"
    OUT.mkdir(parents=True, exist_ok=True)
    font.save(OUT / dest)
    print(dest, (OUT / dest).stat().st_size)


for name, unicodes in SUBSETS.items():
    build(f"aixess-head-{name}.woff2", "AiXESS Head", HEAD_WEIGHT, unicodes)
    build(f"aixess-poster-{name}.woff2", "AiXESS Poster", POSTER_WEIGHT, unicodes, sy=POSTER_Y)

(OUT / "OFL.txt").write_text((ROOT / "scripts" / "font-sources" / "OFL-SofiaSansExtraCondensed.txt").read_text())
