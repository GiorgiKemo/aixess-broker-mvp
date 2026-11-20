import { useCallback, useEffect, useRef, useState } from "react";
import { themePhoto } from "../data/themePhotos.js";
import { figmaPhoto, figmaPhotoLight } from "../data/figmaPhotos.js";
import { registerThemePhoto, useTimeTheme } from "../timeTheme.js";

/* Versions already decoded by this page view (keyed by srcset), and decodes in flight. */
const decoded = new Set();
const decoding = new Map();

function decodeVersion(version, sizes) {
  if (decoded.has(version.srcSet)) return Promise.resolve();
  if (!decoding.has(version.srcSet)) {
    const probe = new Image();
    if (sizes) probe.sizes = sizes;
    probe.srcset = version.srcSet;
    probe.src = version.src;
    const done = (typeof probe.decode === "function" ? probe.decode() : Promise.resolve()).then(
      () => decoded.add(version.srcSet),
      () => {},
    );
    decoding.set(version.srcSet, done);
    done.then(() => decoding.delete(version.srcSet));
  }
  return decoding.get(version.srcSet);
}

const isLoaded = (node) => Boolean(node && node.complete && node.currentSrc);

function nearViewport(node) {
  const box = node.getBoundingClientRect();
  const height = window.innerHeight || 0;
  return box.bottom > -height && box.top < height * 2 && box.width > 0;
}

/* A brand photo that follows the time-of-day theme. It reads the same effective theme as the
   page colours, so photo and UI always agree, including on first paint (index.html and
   timeTheme.js resolve the theme the same way before React renders).

   A theme switch decodes the new version of each photo near the viewport before the page
   cross-fades (timeTheme.js), so the photo changes in the same frame as the colours. A photo
   whose new version is not decoded yet keeps the old one until it is, so the box never
   collapses or flashes empty. A photo that has not loaded yet (a lazy card further down)
   just switches its source, so offscreen cards never fetch more than the version they show.

   `figma` names a Figma frame photo (src/data/figmaPhotos.js) instead of a brand photo family: it
   shows that photo's version for the theme, or the Figma photo itself where it has none.
   `data-photo-light` says which light the photo on screen shows, for text set over it. */
export function ThemedImage({ family, figma, defaultWidth = 1200, sizes, ref: externalRef, ...props }) {
  const { theme } = useTimeTheme();
  const key = figma ?? family;
  const source = (target) => (figma ? figmaPhoto(figma, defaultWidth, target) : themePhoto(family, target, defaultWidth));
  const [shown, setShown] = useState(() => ({ theme, key, ...source(theme) }));
  const element = useRef(null);
  const setRef = useCallback(
    (node) => {
      element.current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) externalRef.current = node;
    },
    [externalRef],
  );

  const stale = shown.theme !== theme || shown.key !== key;
  const next = stale ? { theme, key, ...source(theme) } : shown;
  // Swap during render when nothing visible would flash: no photo yet, or the new one is ready.
  if (stale && (decoded.has(next.srcSet) || !isLoaded(element.current))) setShown(next);

  useEffect(
    () =>
      registerThemePhoto({
        prepare(target) {
          const node = element.current;
          if (!isLoaded(node) || !nearViewport(node)) return Promise.resolve();
          return decodeVersion(figma ? figmaPhoto(figma, defaultWidth, target) : themePhoto(family, target, defaultWidth), sizes);
        },
      }),
    [family, figma, defaultWidth, sizes],
  );

  useEffect(() => {
    if (!stale) return undefined;
    let cancelled = false;
    // If the new version fails to load, keep the photo already showing rather than a broken one.
    decodeVersion(next, sizes).then(() => {
      if (!cancelled && decoded.has(next.srcSet)) setShown(next);
    });
    return () => {
      cancelled = true;
    };
  }, [stale, next.srcSet, sizes]);

  // WebP only: Safari showed a broken hero with the AVIF versions (13 October 2026).
  return (
    <img
      ref={setRef}
      src={shown.src}
      srcSet={shown.srcSet}
      sizes={sizes}
      width={shown.width}
      height={shown.height}
      data-theme-photo={`${key}-${shown.theme}`}
      data-photo-light={figma ? figmaPhotoLight(figma, shown.theme) : shown.theme}
      alt=""
      {...props}
    />
  );
}
