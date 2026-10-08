import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { setTimeThemeMode, useAutoClock, useTimeTheme } from "../timeTheme.js";

/* AIXCO.Global v4's colour-theme menu (src/components/v4/TimeTheme.tsx): one icon in the
   header, a dropdown on hover, tap or keyboard. Icons are v4's "Structure" set: 24px grid,
   1.5px square-capped strokes, one accent part per icon. */

function StructureIcon({ name, children, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`ax-icon ax-icon--${name} ${className}`.trim()}
    >
      {children}
    </svg>
  );
}

const Sun = () => (
  <StructureIcon name="sun">
    <path className="ax-a" d="M12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
    <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
  </StructureIcon>
);

const HalfSun = () => (
  <StructureIcon name="half-sun">
    <path className="ax-a" d="M7 16.75a5 5 0 0 1 10 0" />
    <path d="M12 6.5v2M5.6 9.1 7 10.5M18.4 9.1 17 10.5M2.75 16.75h2M19.25 16.75h2M2.75 20.25h18.5" />
  </StructureIcon>
);

const Moon = () => (
  <StructureIcon name="moon">
    <path d="M19.75 14.75A8.25 8.25 0 0 1 9.25 4.25a8.25 8.25 0 1 0 10.5 10.5Z" />
    <rect className="ax-af" x="15.5" y="4" width="2" height="2" />
    <rect className="ax-af" x="19" y="8" width="1.5" height="1.5" />
  </StructureIcon>
);

const Check = ({ className }) => (
  <StructureIcon name="check" className={className}>
    <path className="ax-a" d="M4.75 12.5 9.5 17.25 19.25 7" />
  </StructureIcon>
);

const themeIcons = { day: Sun, afternoon: HalfSun, night: Moon };

const options = [
  { mode: "day", labelKey: "themeDay", hours: "06–14" },
  { mode: "afternoon", labelKey: "themeAfternoon", hours: "14–19" },
  { mode: "night", labelKey: "themeNight", hours: "19–06" },
  { mode: "auto", labelKey: "themeAuto", hours: "" },
];

export function TimeThemeMenu({ className = "", onOpen }) {
  const { t } = useLanguage();
  const { mode, theme } = useTimeTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const closeTimer = useRef(null);
  useAutoClock(mode);

  const show = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen((wasOpen) => {
      if (!wasOpen) onOpen?.();
      return true;
    });
  }, [onOpen]);

  const hideSoon = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  const CurrentIcon = themeIcons[theme];
  const currentLabel = t(options.find((option) => option.mode === mode)?.labelKey ?? "themeAuto");
  const panelId = `time-theme-menu${className ? `-${className.split(" ")[0]}` : ""}`;

  return (
    <div
      ref={rootRef}
      className={`time-theme-menu ${className}`.trim()}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") show();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") hideSoon();
      }}
    >
      <button
        type="button"
        className="time-theme-menu__button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t("colourTheme")}: ${currentLabel}`}
        onClick={() => (open ? setOpen(false) : show())}
      >
        <CurrentIcon />
        {mode === "auto" ? <span className="time-theme-menu__badge" aria-hidden="true">A</span> : null}
      </button>
      {open ? (
        <div id={panelId} role="radiogroup" aria-label={t("colourTheme")} className="time-theme-menu__panel">
          <p className="time-theme-menu__title">{t("colourTheme")}</p>
          {options.map((option) => {
            const Icon = option.mode === "auto" ? null : themeIcons[option.mode];
            const selected = mode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                role="radio"
                aria-checked={selected}
                data-kind={option.mode}
                className="time-theme-menu__option"
                onClick={() => {
                  setTimeThemeMode(option.mode);
                  setOpen(false);
                }}
              >
                <span className="time-theme-menu__icon" aria-hidden="true">
                  {Icon ? <Icon /> : <span className="time-theme-menu__auto">{t("themeAuto")}</span>}
                </span>
                <span className="time-theme-menu__label">
                  {option.mode === "auto" ? t("themeAutomatic") : t(option.labelKey)}
                  {option.hours ? <small>{option.hours}</small> : null}
                </span>
                <span className="time-theme-menu__swatch" aria-hidden="true" />
                {selected ? <Check className="time-theme-menu__check" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
