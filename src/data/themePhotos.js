import SIZES from "./theme-photo-sizes.json";

// Brand photography in day / afternoon / night versions of one scene (Benji and Giorgi,
// 13 October 2026), so every marketing photo follows the time-of-day theme. These are
// generated illustrations, never a project or a listing, except "opportunities": the original
// Reverance render (day, unchanged) and two relit copies of it. Originals and manifest:
// /mnt/project-files/klem-oct13/theme-photos; sizes from scripts/import-theme-photos.py.
export const THEME_PHOTOS = SIZES;

export const themePhotoUrl = (family, theme, width, format = "webp") => `/assets/themed/${family}-${theme}-${width}.${format}`;

/** The sources for one family in one theme: src (closest to defaultWidth), WebP srcSet,
    AVIF avifSrcSet (adds the 3200/4000px sizes), width, height. */
export function themePhoto(family, theme, defaultWidth = 1200) {
  const variant = SIZES[family][theme] ?? SIZES[family].day;
  const { widths, webpWidths } = variant;
  const fallback = webpWidths.find((width) => width >= defaultWidth) ?? webpWidths.at(-1);
  return {
    width: variant.width,
    height: variant.height,
    src: themePhotoUrl(family, theme, fallback),
    srcSet: webpWidths.map((width) => `${themePhotoUrl(family, theme, width)} ${width}w`).join(", "),
    avifSrcSet: widths.map((width) => `${themePhotoUrl(family, theme, width, "avif")} ${width}w`).join(", "),
  };
}
