import { useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { glideScrollTo } from "./ScrollToTopButton.jsx";

/* Every page hero fills the first screen (Kemo, 20 October 2026: no strip of the next section
   under the photo), so this cue at the hero's foot tells visitors there is more below. It is the
   scroll-to-top button turned over: the same square, colours and chevron, pointing down, and a
   click glides to the end of its section (or of the element marked data-scroll-cue-end). */
export function ScrollDownCue({ className = "" }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      type="button"
      className={`scroll-down-cue${className ? ` ${className}` : ""}`}
      aria-label={t("scrollDown")}
      onClick={() => {
        const end = ref.current?.closest("[data-scroll-cue-end], section");
        if (!end) return;
        glideScrollTo(window.scrollY + end.getBoundingClientRect().bottom);
        ref.current?.blur();
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
        <path d="M6.5 7 12 12.5 17.5 7" />
        <path d="M6.5 17.5h11" />
      </svg>
    </button>
  );
}
