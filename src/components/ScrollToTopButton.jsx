import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";

/* AIXCO.Global v4's scroll-to-top button (src/components/ScrollToTopButton.tsx): a square
   theme-blue button in the bottom-left corner once the page has scrolled 520px, with v4's
   "Structure" chevron-up icon and its eased 700–1100ms glide to the top. */

const VISIBILITY_OFFSET = 520;

// UI the button must never sit on (the explorer dock and its copy and filter panels, which runs closer to the
// edge than the page margin, the cookie notice, the footer's logo and links): it steps aside while
// one of these overlaps it.
const AVOID_SELECTOR = ".mobile-residence-dock, :is(.explorer-copy-panel, .residence-filter-panel):not([aria-hidden='true']), .cookie-notice, .site-footer-legal";

let activeFrame = null;
let cancelCleanup = null;

function stopGlide() {
  if (activeFrame !== null) window.cancelAnimationFrame(activeFrame);
  activeFrame = null;
  cancelCleanup?.();
  cancelCleanup = null;
}

const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// v4's animateScrollTo: any wheel, touch, pointer or key input hands the scroll back to the visitor.
export function glideScrollTo(targetTop) {
  stopGlide();
  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  if (Math.abs(distance) < 2) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: targetTop, left: 0, behavior: "instant" });
    return;
  }
  const duration = Math.min(1100, Math.max(700, Math.abs(distance) * 0.38));
  const startTime = window.performance.now();
  const options = { capture: true, passive: true, once: true };
  window.addEventListener("wheel", stopGlide, options);
  window.addEventListener("touchstart", stopGlide, options);
  window.addEventListener("pointerdown", stopGlide, options);
  window.addEventListener("keydown", stopGlide, { capture: true, once: true });
  cancelCleanup = () => {
    window.removeEventListener("wheel", stopGlide, options);
    window.removeEventListener("touchstart", stopGlide, options);
    window.removeEventListener("pointerdown", stopGlide, options);
    window.removeEventListener("keydown", stopGlide, { capture: true });
  };
  const step = (time) => {
    if (activeFrame === null) return;
    const progress = Math.min((time - startTime) / duration, 1);
    window.scrollTo({ top: startTop + distance * easeInOutCubic(progress), left: 0, behavior: "instant" });
    if (progress < 1) activeFrame = window.requestAnimationFrame(step);
    else stopGlide();
  };
  activeFrame = window.requestAnimationFrame(step);
}

export function scrollToPageTop() {
  glideScrollTo(0);
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function ScrollToTopButton({ page }) {
  const { t } = useLanguage();
  const buttonRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = null;
    const update = () => {
      frame = null;
      let next = window.scrollY > VISIBILITY_OFFSET;
      const button = buttonRef.current;
      if (next && button) {
        const box = button.getBoundingClientRect();
        next = ![...document.querySelectorAll(AVOID_SELECTOR)].some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden" && overlaps(box, rect);
        });
      }
      setVisible(next);
    };
    const schedule = () => { if (frame === null) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [page]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="scroll-top-button"
      aria-label={t("scrollToTop")}
      data-visible={visible ? "true" : "false"}
      aria-hidden={visible ? undefined : "true"}
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        scrollToPageTop();
        buttonRef.current?.blur();
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
        <path d="M6.5 17 12 11.5l5.5 5.5" />
        <path d="M6.5 6.5h11" />
      </svg>
    </button>
  );
}
