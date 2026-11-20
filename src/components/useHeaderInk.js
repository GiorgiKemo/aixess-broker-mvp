import { useLayoutEffect } from "react";
import { useTimeTheme } from "../timeTheme.js";
import { FIGMA_PHOTOS } from "../data/figmaPhotos.js";

// Kemo, 19 November 2026: "make sure that all the texts are visible everywhere despite the time of
// the day". The header floats over every hero photo, and each photo now has a day, afternoon and
// night version, so fixed per-page colour rules (16 October 2026) no longer fit. Each header label
// that sits on a photo takes the ink that reads better on the pixels actually behind it: the photo
// on screen is drawn into a small canvas, the label's box is mapped onto it through the photo's
// object-fit crop, and white and ink (#171a1d) are compared on the worst tenth of the pixels under
// the letters (the label's text box, not its padding).
// Only the Figma pages' photos (and the sky bands drawn as left-to-right gradients) are measured (they have no wash over them); the other heroes keep
// their tuned CSS (16 October 2026), since a night wash drawn over a photo cannot be measured here.
// Labels over a panel, a band or the header's own ground are left to their CSS (data-ink removed).
// figma-sync.css styles [data-ink='dark'] and [data-ink='light'].
export const HEADER_ITEMS = ".brand, .desktop-nav > button, .nav-group > button, .time-theme-menu__button, .language-switcher-trigger, .login-button, .menu-toggle";

const INK = [23, 26, 29];
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const INK_L = luminance(...INK);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const pixels = new Map(); // currentSrc -> { width, height, data } (downscaled), or null if unreadable
function photoPixels(image) {
  const key = image.currentSrc || image.src;
  if (pixels.has(key)) return pixels.get(key);
  let result = null;
  try {
    const scale = Math.min(1, 480 / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    result = { width, height, data: context.getImageData(0, 0, width, height).data };
  } catch {
    result = null;
  }
  if (pixels.size > 24) pixels.clear();
  pixels.set(key, result);
  return result;
}

// One object-position component ("50%", "12px", "left") as an offset for `free` spare pixels.
function positionOffset(value, free) {
  if (!value) return free / 2;
  if (value.endsWith("%")) return (free * parseFloat(value)) / 100;
  if (value.endsWith("px")) return parseFloat(value);
  return { left: 0, top: 0, right: free, bottom: free, center: free / 2 }[value] ?? free / 2;
}

// The label's letters mapped onto the photo's pixels, column by column: which ink reads on each
// stretch of the label. Returns { ink: "dark" | "light" } when one ink suits the whole label, or
// { ink: "split", stops, major } when the label crosses from a pale part of the photo to a dark one
// (a stone beam beside a shaded soffit): then the letters over each part take that part's ink.
const DARK = "#171a1d";
const LIGHT = "#fff";
function inkOver(image, rect, groundOf) {
  const photo = photoPixels(image);
  if (!photo) return null;
  const box = image.getBoundingClientRect();
  const style = getComputedStyle(image);
  const { naturalWidth: w, naturalHeight: h } = image;
  let dw = box.width;
  let dh = box.height;
  if (style.objectFit === "cover" || style.objectFit === "contain") {
    const s = (style.objectFit === "cover" ? Math.max : Math.min)(box.width / w, box.height / h);
    dw = w * s;
    dh = h * s;
  }
  const [px, py] = style.objectPosition.split(" ");
  const left = box.left + positionOffset(px, box.width - dw);
  const top = box.top + positionOffset(py, box.height - dh);
  const toX = (x) => Math.floor(((x - left) / dw) * photo.width);
  const y0 = Math.max(0, Math.floor(((rect.top - top) / dh) * photo.height));
  const y1 = Math.min(photo.height, Math.ceil(((rect.bottom - top) / dh) * photo.height));
  if (y1 <= y0) return null;
  // The ink whose darkest-lit stretch (the worst tenth of the pixels) reads best.
  const low = (list) => list.sort((a, b) => a - b)[Math.floor(list.length * 0.1)];
  const choose = (x0, x1) => {
    const white = [];
    const ink = [];
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const i = (y * photo.width + x) * 4;
        const l = luminance(photo.data[i], photo.data[i + 1], photo.data[i + 2]);
        white.push(contrast(1, l));
        ink.push(contrast(INK_L, l));
      }
    }
    return white.length ? { dark: low(ink) > low(white), onDark: low(ink), onLight: low(white) } : null;
  };
  const whole = choose(Math.max(0, toX(rect.left)), Math.min(photo.width, toX(rect.right) + 1));
  if (!whole) return null;
  const single = { ink: whole.dark ? "dark" : "light", onDark: whole.onDark, onLight: whole.onLight };
  // A label that one ink already reads on (3:1 on its worst tenth) is never split: a split is for a
  // hard edge in the photo, not for a soft gradient of sky.
  if (Math.max(whole.onDark, whole.onLight) >= 3) return single;
  // One ink is enough when it reads on every part of the label.
  const step = Math.max(2, Math.round(dw / photo.width));
  const runs = [];
  for (let x = rect.left; x < rect.right; x += step) {
    // Each stretch is read against what is behind it: this photo, or a panel's flat colour.
    const ground = groundOf(x + step / 2);
    let dark = whole.dark;
    if (ground?.color) {
      const l = luminance(...ground.color);
      dark = contrast(INK_L, l) > contrast(1, l);
    } else if (ground?.image === image) {
      const a = Math.max(0, toX(x));
      const b = Math.min(photo.width, Math.max(a + 1, toX(x + step)));
      const part = a < photo.width && b > 0 ? choose(a, b) : null;
      if (part) dark = part.dark;
    }
    if (runs.length && runs.at(-1).dark === dark) runs.at(-1).to = Math.min(rect.right, x + step);
    else runs.push({ dark, from: x, to: Math.min(rect.right, x + step) });
  }
  // Ignore slivers narrower than a letter stroke; they flip back to their neighbours.
  const merged = [];
  for (const run of runs) {
    if (merged.length && (run.to - run.from < 4 || merged.at(-1).dark === run.dark)) merged.at(-1).to = run.to;
    else merged.push({ ...run });
  }
  // One run left once slivers are ignored: that run's ink (not the whole box's, which the sliver skewed).
  if (merged.length < 2) return { ...single, ink: (merged[0]?.dark ?? whole.dark) ? "dark" : "light" };
  const darkWidth = merged.filter((run) => run.dark).reduce((sum, run) => sum + run.to - run.from, 0);
  return { ...single, ink: "split", runs: merged, major: darkWidth * 2 > rect.width ? DARK : LIGHT };
}

// A label on a sky band: the ink that reads at both ends and the middle of it.
function inkOnColors(grounds) {
  const colors = grounds.filter((ground) => ground?.color).map((ground) => luminance(...ground.color));
  if (!colors.length) return null;
  const onDark = Math.min(...colors.map((l) => contrast(INK_L, l)));
  const onLight = Math.min(...colors.map((l) => contrast(1, l)));
  return { ink: onDark > onLight ? "dark" : "light", onDark, onLight };
}

const opaque = (element) => {
  const color = getComputedStyle(element).backgroundColor;
  const alpha = color.match(/[\d.]+/g)?.[3];
  return color !== "transparent" && (alpha === undefined || Number(alpha) > 0.5);
};

// A left-to-right sky band (linear-gradient(90deg, rgb() n%, ...)): its colour at x, or null.
function gradientColorAt(image, box, x) {
  const match = image.match(/^linear-gradient\(90deg, (.*)\)$/);
  if (!match || !box.width) return null;
  // Computed gradients leave out the first and last positions (0% and 100%).
  const stops = [...match[1].matchAll(/rgba?\(([^)]+)\)(?:\s+([\d.]+)%)?/g)].map((stop, index, all) => ({
    rgb: stop[1].split(",").slice(0, 3).map(Number),
    at: stop[2] !== undefined ? Number(stop[2]) / 100 : index === 0 ? 0 : index === all.length - 1 ? 1 : NaN,
  }));
  if (stops.length < 2 || stops.some((stop) => Number.isNaN(stop.at))) return null;
  const f = Math.min(1, Math.max(0, (x - box.left) / box.width));
  const next = stops.findIndex((stop) => stop.at >= f);
  if (next <= 0) return stops[next === 0 ? 0 : stops.length - 1].rgb;
  const a = stops[next - 1];
  const b = stops[next];
  const k = (f - a.at) / (b.at - a.at || 1);
  return a.rgb.map((value, i) => value + (b.rgb[i] - value) * k);
}

// What is painted behind the point once the header is set aside: a Figma photo ({ image }), a filled
// ground ({ color: [r, g, b] }), or null when it cannot be told (another picture, a gradient).
function groundAt(header, x, y) {
  for (const element of document.elementsFromPoint(x, y)) {
    if (header.contains(element) || element === document.documentElement || element === document.body) continue;
    if (element.tagName === "IMG") {
      const photo = element.dataset.themePhoto?.replace(/-(day|afternoon|night)$/, "");
      return photo && FIGMA_PHOTOS[photo] && element.complete && element.naturalWidth ? { image: element } : null;
    }
    const style = getComputedStyle(element);
    if (style.backgroundImage !== "none") {
      const color = gradientColorAt(style.backgroundImage, element.getBoundingClientRect(), x);
      return color ? { color, sky: true } : null;
    }
    if (opaque(element)) return { color: style.backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number) };
  }
  return null;
}

// The box of the label's letters (its padding and border left out); icon buttons use their own box.
function textBox(item) {
  const range = document.createRange();
  range.selectNodeContents(item);
  const box = item.textContent.trim() ? range.getBoundingClientRect() : null;
  return box && box.width ? box : item.getBoundingClientRect();
}

// True while a View Transition runs (browsers without the selector throw on it: treat as false).
function inViewTransition() {
  try {
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

export function useHeaderInk(ref, deps = []) {
  const { theme } = useTimeTheme();
  useLayoutEffect(() => {
    const header = ref.current;
    const hero = header?.parentElement;
    if (!header || !hero) return undefined;
    let frame = 0;
    const mark = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const items = header.querySelectorAll(HEADER_ITEMS);
        // A header with its own ground (the menu panel on phones) keeps its CSS colours.
        const ownGround = opaque(header);
        // Mid cross-fade the page is a snapshot: keep the current marks until it ends.
        if (inViewTransition()) return;
        // elementsFromPoint skips elements without pointer events: let it see the photos.
        document.documentElement.classList.add("is-measuring-header-ink");
        const results = [...items].map((item) => {
          const rect = textBox(item);
          if (ownGround || !rect.width || !rect.height) return null;
          const middle = rect.top + rect.height / 2;
          const ground = groundAt(header, rect.left + rect.width / 2, middle);
          if (ground?.sky) return inkOnColors([groundAt(header, rect.left + 1, middle), ground, groundAt(header, rect.right - 1, middle)]);
          return ground?.image ? inkOver(ground.image, rect, (x) => groundAt(header, x, middle)) : null;
        });
        document.documentElement.classList.remove("is-measuring-header-ink");
        // One ink for the whole header when it reads (3:1) on every label over the photo: the
        // labels then match, as in Figma, and only a header that cannot be read in one ink mixes.
        const measured = results.filter((result) => result && result.ink !== "split");
        if (measured.length && measured.length === results.filter(Boolean).length) {
          const worst = (key) => Math.min(...measured.map((result) => result[key]));
          const best = worst("onDark") >= worst("onLight") ? "dark" : "light";
          if (worst(best === "dark" ? "onDark" : "onLight") >= 3) measured.forEach((result) => { result.ink = best; });
        }
        items.forEach((item, index) => {
          const result = results[index];
          if (result) item.dataset.ink = result.ink;
          else delete item.dataset.ink;
          if (result?.ink === "split") {
            // Gradient stops in the item's own padding box, where background-clip: text paints.
            const origin = item.getBoundingClientRect().left + item.clientLeft;
            const stops = result.runs.map((run) => `${run.dark ? DARK : LIGHT} ${(run.from - origin).toFixed(1)}px ${(run.to - origin).toFixed(1)}px`);
            item.style.setProperty("--ink-split", `linear-gradient(90deg, ${stops.join(", ")})`);
            item.style.setProperty("--ink-major", result.major);
            item.style.setProperty("--ink-minor", result.major === DARK ? LIGHT : DARK);
          } else {
            item.style.removeProperty("--ink-split");
            item.style.removeProperty("--ink-major");
            item.style.removeProperty("--ink-minor");
          }
        });
      });
    };
    mark();
    // A theme switch cross-fades the page (View Transitions, 380ms in time-theme.css): while the
    // fade runs the page reports its snapshot, not the photo, so measure again once it is over.
    const settled = [window.setTimeout(mark, 600), window.setTimeout(mark, 1400)];
    // A theme switch or a lazy photo swaps the image: re-measure when any hero photo loads.
    hero.addEventListener("load", mark, true);
    document.fonts?.ready.then(mark);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(mark);
    observer?.observe(hero);
    observer?.observe(header);
    const mutations = typeof MutationObserver === "undefined" ? null : new MutationObserver(mark);
    mutations?.observe(hero, { subtree: true, attributes: true, attributeFilter: ["src", "srcset", "data-theme-photo"] });
    return () => {
      cancelAnimationFrame(frame);
      settled.forEach((timer) => window.clearTimeout(timer));
      hero.removeEventListener("load", mark, true);
      observer?.disconnect();
      mutations?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, theme, ...deps]);
}
