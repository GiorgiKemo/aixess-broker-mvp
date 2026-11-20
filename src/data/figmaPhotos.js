import SIZES from "./figma-photo-sizes.json";

// Photos drawn in Lasha's Figma file, imported unchanged by scripts/import-figma-photos.py
// (Kemo, 19 November 2026: the pages match the Figma file pixel for pixel).
//
// Each photo can also have versions for the other times of day (Kemo, 19 November 2026: "for each
// pic ... generate 2 more one for afternoon one for night ... beautiful lights to buildings during
// night"): `themes` in the manifest lists them, aligned to the Figma photo by
// `import-figma-photos.py --themes`, and ThemedImage shows the one for the current theme. A theme
// without its own version shows the Figma photo. `light` is the light the Figma photo itself shows
// ("day" unless the frame used a dusk render), so text over it can follow what is really on screen.
export const FIGMA_PHOTOS = SIZES;

const url = (file, width) => `/assets/figma/${file}-${width}.webp`;
// A photo whose own file lives elsewhere (TRESORA's renders in /assets/dubai) names it in `base`.
const baseUrl = (entry, name, width) => (entry.base ? `${entry.base}-${width}.webp` : url(name, width));

/** The look a Figma photo shows in a theme: its own version for that theme, or its Figma light. */
export function figmaPhotoLight(name, theme = "day") {
  const entry = SIZES[name];
  return entry.themes?.[theme] ? theme : entry.light ?? "day";
}

/** The WebP sources for one Figma photo in one theme: src (closest to defaultWidth), srcSet, width, height. */
export function figmaPhoto(name, defaultWidth = 1200, theme = "day") {
  const entry = SIZES[name];
  const version = entry.themes?.[theme];
  const { width, height, widths } = version ?? entry;
  const at = (w) => (version ? url(`${name}-${theme}`, w) : baseUrl(entry, name, w));
  const fallback = widths.find((w) => w >= defaultWidth) ?? widths.at(-1);
  return { width, height, src: at(fallback), srcSet: widths.map((w) => `${at(w)} ${w}w`).join(", ") };
}
