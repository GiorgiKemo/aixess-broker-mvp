import SIZES from "./theme-photo-sizes.json";

// Brand photography in day / afternoon / night versions of one scene (Benji and Giorgi,
// 13 October 2026), so every marketing photo follows the time-of-day theme. These are
// generated illustrations, never a project or a listing, except "reverance-towers": the official
// Reverance render (day, unchanged) and two colour grades of it. Originals and manifests:
// /mnt/project-files/klem-oct13/theme-photos and /mnt/project-files/klem-oct14; sizes from
// scripts/import-theme-photos.py.
export const THEME_PHOTOS = SIZES;

export const themePhotoUrl = (family, theme, width) => `/assets/themed/${family}-${theme}-${width}.webp`;

/** The WebP sources for one family in one theme: src (closest to defaultWidth), srcSet, width, height. */
export function themePhoto(family, theme, defaultWidth = 1200) {
  const variant = SIZES[family][theme] ?? SIZES[family].day;
  const { widths } = variant;
  const fallback = widths.find((width) => width >= defaultWidth) ?? widths.at(-1);
  return {
    width: variant.width,
    height: variant.height,
    src: themePhotoUrl(family, theme, fallback),
    srcSet: widths.map((width) => `${themePhotoUrl(family, theme, width)} ${width}w`).join(", "),
  };
}
