import { useCallback, useEffect, useRef, useState } from "react";
import { themePhoto } from "../data/themePhotos.js";
import { useTimeTheme } from "../timeTheme.js";

/* A brand photo that follows the time-of-day theme. It reads the same effective theme as the
   page colours, so photo and UI always agree, including on first paint (index.html and
   timeTheme.js resolve the theme the same way before React renders).

   When the theme changes on a photo that is already showing, the new version is decoded
   first and then swapped in, so the box never collapses or flashes empty. A photo that has
   not loaded yet (a lazy card further down) just switches its source, so offscreen cards
   never fetch more than the version they will show. */
export function ThemedImage({ family, defaultWidth = 1200, sizes, ref: externalRef, ...props }) {
  const { theme } = useTimeTheme();
  const [shown, setShown] = useState(() => ({ theme, family, ...themePhoto(family, theme, defaultWidth) }));
  const element = useRef(null);
  const setRef = useCallback(
    (node) => {
      element.current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) externalRef.current = node;
    },
    [externalRef],
  );

  useEffect(() => {
    if (shown.theme === theme && shown.family === family) return undefined;
    const next = { theme, family, ...themePhoto(family, theme, defaultWidth) };
    const current = element.current;
    if (!current || !current.complete || !current.currentSrc) {
      setShown(next);
      return undefined;
    }
    let cancelled = false;
    // Decode the same file the browser picked for the current photo (AVIF or WebP).
    const avif = current.currentSrc.endsWith(".avif");
    const probe = new Image();
    if (sizes) probe.sizes = sizes;
    probe.srcset = avif ? next.avifSrcSet : next.srcSet;
    probe.src = next.src;
    const swap = () => {
      if (!cancelled) setShown(next);
    };
    // If the new version fails to load, keep the photo already showing rather than a broken one.
    if (typeof probe.decode === "function") probe.decode().then(swap, () => {});
    else swap();
    return () => {
      cancelled = true;
    };
  }, [theme, family, defaultWidth, sizes, shown.theme, shown.family]);

  // AVIF first (smaller), WebP for browsers without it. The <picture> stays inline, so the
  // img keeps its own classes and positioning.
  return (
    <picture>
      <source type="image/avif" srcSet={shown.avifSrcSet} sizes={sizes} />
      <img
        ref={setRef}
        src={shown.src}
        srcSet={shown.srcSet}
        sizes={sizes}
        width={shown.width}
        height={shown.height}
        data-theme-photo={`${family}-${shown.theme}`}
        alt=""
        {...props}
      />
    </picture>
  );
}
