import { useLayoutEffect } from "react";
import { useLanguage } from "../i18n.jsx";

// Shrinks a wrapping headline only when one of its words is wider than the headline itself
// (ПЕРВОНАЧАЛЬНОГО, АДМИНИСТРИРОВАНИЯ in Russian, 31 October 2026), so the word stays inside its
// column instead of running into the next one. Lines keep wrapping as before; a headline whose
// words all fit keeps its size. With a selector, every match inside ref shares the smallest size.
// With { words: true } it measures each word itself rather than the headline's scroll width, for
// Figma titles whose box is set a hair narrower than their English line (14 November 2026).
// A no-break space keeps its two words together, so they are measured as one.
const WORD = /(?:[^\s\u00ad-]|\u00a0)+/gu;

function widestWord(heading) {
  let widest = 0;
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  // Test DOMs without layout have no client rects: nothing to measure there.
  if (typeof range.getClientRects !== "function") return 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const match of node.textContent.matchAll(WORD)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      // A word that already broke over two lines measures as the sum of its pieces.
      const width = Array.from(range.getClientRects()).reduce((sum, rect) => sum + rect.width, 0);
      widest = Math.max(widest, width);
    }
  }
  return widest;
}

export function useWordFit(ref, selector, { words = false } = {}) {
  const { locale } = useLanguage();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const headings = selector ? Array.from(root.querySelectorAll(selector)) : [root];
    let frame = 0;
    const measure = () => {
      let ratio = 1;
      headings.forEach((heading) => {
        // Measure with words kept whole, so a headline set to break long words mid-word
        // (ПРИСОЕ / ДИНЯЙТЕ / СЬ) still shows how much room its longest word needs.
        heading.style.overflowWrap = "normal";
        heading.style.wordBreak = "normal";
        const parent = heading.parentElement;
        const parentStyle = parent && getComputedStyle(parent);
        const room = parent ? parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight) : Infinity;
        // A headline allowed to grow to its longest word (min-width: min-content) is checked
        // against its column instead.
        const available = Math.min(heading.clientWidth, room);
        const needed = words ? widestWord(heading) : Math.max(heading.scrollWidth, heading.offsetWidth);
        heading.style.removeProperty("overflow-wrap");
        heading.style.removeProperty("word-break");
        if (available && needed > available + (words ? 0 : 0.5)) ratio = Math.min(ratio, (available - 2) / needed);
      });
      return ratio;
    };
    const fit = () => {
      headings.forEach((heading) => heading.style.removeProperty("font-size"));
      // Letter-spacing set in frame pixels does not shrink with the type, so a word can still be
      // a pixel too wide after one pass (WebKit, 14 November 2026): measure again, a few times at most.
      for (let pass = 0; pass < 4; pass += 1) {
        const ratio = measure();
        if (ratio === 1) return;
        headings.forEach((heading) => {
          heading.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(heading).fontSize) * ratio * 100) / 100}px`;
        });
        if (!words) return;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    let lastWidth = root.clientWidth;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (root.clientWidth === lastWidth) return;
      lastWidth = root.clientWidth;
      schedule();
    });
    observer?.observe(root);
    document.fonts?.ready?.then(schedule);
    document.fonts?.addEventListener?.("loadingdone", schedule);
    window.addEventListener("load", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [ref, selector, locale, words]);
}

// The Figma desktop frames draw some headlines in a fixed number of lines inside a fixed block
// (YOUR AiXESS / ADVANTAGE, LESS ADMINISTRATION. / MORE OPPORTUNITY.). A translation that needs more
// lines, or has a word wider than the column, would run into what sits below it (Russian, 19 November
// 2026). Where `media` matches, the headline (and its line spans) is set smaller, line pitch in
// proportion, until it fits `lines` lines of its own pitch with every word inside the column; a
// headline that already fits keeps its size, so English stays exactly as drawn. Elsewhere it only keeps
// every word inside the column, as useWordFit does.
export function useLineFit(ref, { lines, media = "(min-width: 900px)" }) {
  const { locale } = useLanguage();

  useLayoutEffect(() => {
    const heading = ref.current;
    if (!heading) return undefined;
    const query = window.matchMedia?.(media);
    const parts = () => [heading, ...heading.children];
    let frame = 0;
    const reset = () => parts().forEach((part) => { part.style.removeProperty("font-size"); part.style.removeProperty("line-height"); });
    const fit = () => {
      reset();
      const limit = !query || query.matches ? lines : Infinity;
      const natural = parts().map((part) => {
        const style = getComputedStyle(part);
        return { part, size: parseFloat(style.fontSize), pitch: parseFloat(style.lineHeight) || parseFloat(style.fontSize) };
      });
      const lineCount = () => {
        const blocks = heading.children.length ? Array.from(heading.children).filter((child) => getComputedStyle(child).display === "block") : [];
        if (!blocks.length) return Math.round(heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight));
        return blocks.reduce((sum, block) => sum + Math.round(block.getBoundingClientRect().height / parseFloat(getComputedStyle(block).lineHeight)), 0);
      };
      const fits = () => {
        heading.style.overflowWrap = "normal";
        const wide = heading.scrollWidth > heading.clientWidth + 0.5;
        heading.style.removeProperty("overflow-wrap");
        return !wide && lineCount() <= limit;
      };
      if (fits()) return;
      const apply = (ratio) => natural.forEach(({ part, size, pitch }) => {
        part.style.fontSize = `${Math.floor(size * ratio * 100) / 100}px`;
        part.style.lineHeight = `${Math.floor(pitch * ratio * 100) / 100}px`;
      });
      let low = 0.3;
      let high = 1;
      for (let step = 0; step < 12; step += 1) {
        const middle = (low + high) / 2;
        apply(middle);
        if (fits()) low = middle; else high = middle;
      }
      apply(low);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    let lastWidth = heading.clientWidth;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (heading.clientWidth === lastWidth) return;
      lastWidth = heading.clientWidth;
      schedule();
    });
    observer?.observe(heading);
    query?.addEventListener?.("change", schedule);
    document.fonts?.ready?.then(schedule);
    document.fonts?.addEventListener?.("loadingdone", schedule);
    window.addEventListener("load", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      query?.removeEventListener?.("change", schedule);
      document.fonts?.removeEventListener?.("loadingdone", schedule);
      window.removeEventListener("load", schedule);
      reset();
    };
  }, [ref, lines, media, locale]);
}
