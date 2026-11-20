import { useLayoutEffect, useRef } from "react";
import { useLanguage } from "../i18n.jsx";

// Keep the art-directed line breaks while fitting the actual translated glyphs.
// With fillLines, every line is sized on its own to the heading's full width (Kemo's AIXESS /
// TO MARKET poster, 7 October 2026), and later lines stay at most maxLineRatio of the first
// line's size so a short translation cannot outgrow it.
// Headings that share a fitGroup (a Map) all take the smallest fitted size, so a row of step
// titles stays one size when one translation is long (ПРИСОЕДИНЯЙТЕСЬ, 18 October 2026).
export function FittedHeading({ as: Tag = "h2", children, fillLines = false, maxLineRatio = Infinity, fitGroup, ...props }) {
  const ref = useRef(null);
  const { locale } = useLanguage();

  useLayoutEffect(() => {
    const heading = ref.current;
    let active = true;
    let frame = 0;
    let previousWidth = -1;
    let fontsSettled = !document.fonts?.ready;
    let fontTimeout = 0;
    heading.dataset.fitReady = "false";
    const fit = () => {
      if (!active || !fontsSettled || !heading.clientWidth) return;
      if (fillLines) {
        const available = heading.clientWidth - 2;
        const lines = Array.from(heading.children);
        lines.forEach((line) => line.style.removeProperty("font-size"));
        let first = 0;
        lines.forEach((line, index) => {
          const width = line.getBoundingClientRect().width;
          if (!width) return;
          const fitted = parseFloat(getComputedStyle(line).fontSize) * available / width;
          if (index === 0) first = fitted;
          let size = index === 0 ? fitted : Math.min(fitted, first * maxLineRatio);
          line.style.fontSize = `${Math.floor(size * 100) / 100}px`;
          // A line's width is not proportional to its size: the heading's letter-spacing stays a
          // fixed number of pixels on every line, and kerning and rounding add a little. Correct
          // until the line sits inside the width (each pass removes most of what is left over).
          for (let pass = 0; pass < 4; pass += 1) {
            const after = line.getBoundingClientRect().width;
            if (after <= available) break;
            size *= available / after;
            line.style.fontSize = `${Math.floor(size * 100) / 100 - (pass ? 0.01 : 0)}px`;
          }
        });
        heading.dataset.fitReady = "true";
        return;
      }
      heading.style.removeProperty("font-size");
      const maxSize = parseFloat(getComputedStyle(heading).fontSize);
      const available = heading.clientWidth;
      const longest = Math.max(...Array.from(heading.children, (line) => line.getBoundingClientRect().width));
      const size = longest > available - 2 ? Math.floor(maxSize * (available - 2) / longest * 100) / 100 : maxSize;
      if (fitGroup) {
        fitGroup.set(heading, size);
        const smallest = Math.min(...fitGroup.values());
        fitGroup.forEach((_, member) => { member.style.fontSize = `${smallest}px`; });
      } else if (size < maxSize) {
        heading.style.fontSize = `${size}px`;
      }
      heading.dataset.fitReady = "true";
    };
    const scheduleFit = () => {
      if (!active || !fontsSettled) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const settleFonts = () => {
      if (!active || fontsSettled) return;
      fontsSettled = true;
      window.clearTimeout(fontTimeout);
      fit();
      scheduleFit();
    };
    if (fontsSettled) {
      fit();
      scheduleFit();
    } else {
      fontTimeout = window.setTimeout(settleFonts, 1200);
      document.fonts.ready.then(settleFonts);
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      const width = heading.clientWidth;
      if (width !== previousWidth) {
        previousWidth = width;
        scheduleFit();
      }
    });
    observer?.observe(heading);
    window.addEventListener("resize", fit);
    // fonts.ready can resolve before a headline face has even started loading, so a fit
    // measured against the fallback face would stick. Refit whenever a face finishes:
    // the loadingdone event, the heading's own face promise (Safari is unreliable with
    // the event) and the lines' boxes changing when the web font swaps in all trigger it.
    document.fonts?.addEventListener?.("loadingdone", scheduleFit);
    const lineObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleFit);
    Array.from(heading.children).forEach((line) => lineObserver?.observe(line));
    const style = getComputedStyle(heading);
    document.fonts?.load?.(`${style.fontWeight} 64px ${style.fontFamily}`, heading.textContent)
      .then(scheduleFit, () => {});
    window.addEventListener("load", scheduleFit);
    return () => {
      active = false;
      fitGroup?.delete(heading);
      cancelAnimationFrame(frame);
      window.clearTimeout(fontTimeout);
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener?.("loadingdone", scheduleFit);
      lineObserver?.disconnect();
      window.removeEventListener("load", scheduleFit);
    };
  }, [locale, fillLines, maxLineRatio, fitGroup]);

  return <Tag {...props} ref={ref} data-fitted-heading data-fit-ready="false">{children}</Tag>;
}
