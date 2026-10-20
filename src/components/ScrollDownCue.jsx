import { useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { glideScrollTo } from "./ScrollToTopButton.jsx";

/* Every page hero fills the first screen (Kemo, 20 October 2026: no strip of the next section
   under the photo), so this cue at the hero's foot tells visitors there is more below: a hairline
   with a light running down it over a small chevron, straight on the photo with no background
   (Kemo: "something without background and that animates"). A click glides to the end of its
   section (or of the element marked data-scroll-cue-end). */
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
      <span className="scroll-down-cue__track" aria-hidden="true"><span className="scroll-down-cue__bead" /></span>
      <svg className="scroll-down-cue__chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
        <path d="M5 8l5 5 5-5" />
      </svg>
    </button>
  );
}
