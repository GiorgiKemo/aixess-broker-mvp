// Generated mood photography for the brand pages (Kemo, 13 October 2026, in the directions Klem
// checked on her imagery boards). These are illustrations, never a project or a listing, so they
// stay off Reverance and inventory content. Originals: /mnt/project-files/klem-oct13/photos-original;
// sizes written by scripts/import-generic-photos.py.
export const GENERIC_PHOTOS = {
  "dubai-skyline": { width: 1672, height: 941, widths: [480, 800, 1200, 1672] },
  "switzerland-lake": { width: 1672, height: 941, widths: [480, 800, 1200, 1672] },
  "coastal-terrace": { width: 1672, height: 941, widths: [480, 800, 1200, 1672] },
  "coastal-city": { width: 1672, height: 941, widths: [480, 800, 1200, 1672] },
  "glass-tower": { width: 1024, height: 1536, widths: [480, 800, 1024] },
  "marina-towers": { width: 1536, height: 1024, widths: [480, 800, 1200, 1536] },
  "coastal-residence": { width: 1672, height: 941, widths: [480, 800, 1200, 1672] },
};

export const genericPhotoUrl = (name, width) => `/assets/generic/${name}-${width}.webp`;

export function genericPhoto(name, defaultWidth = 1200) {
  const photo = GENERIC_PHOTOS[name];
  const src = genericPhotoUrl(name, photo.widths.includes(defaultWidth) ? defaultWidth : photo.widths.at(-1));
  return { ...photo, src, srcSet: photo.widths.map((width) => `${genericPhotoUrl(name, width)} ${width}w`).join(", ") };
}
