import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CaretDown,
  CheckCircle,
  HouseLine,
  SlidersHorizontal,
  StackSimple,
  X,
} from "@phosphor-icons/react";
import {
  getFloorSummary,
  loadLiveFloor,
  loadResidenceSnapshot,
  mergeFloorUnits,
  normalizeStatus,
} from "../data/reveranceApi";
import { useLanguage } from "../i18n.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { track } from "../analytics.js";
import { getGoldenPremiumUnit } from "../data/goldenPremiumApartments.js";
import { GOLDEN_PREMIUM_COPY } from "../golden-premium-copy.js";
import { FittedHeading } from "./FittedHeading.jsx";
import { EXPLORER_SETTLE_PROGRESS } from "./reveranceSplatMath";
import "./ResidenceExplorer.css";
import { AixessLogo } from "./AixessLogo.jsx";

const loadReverance3D = () => import("./Reverance3D");
const Reverance3D = lazy(() => loadReverance3D().then((module) => ({
  default: module.Reverance3D,
})));

// Mount the WebGL explorer well before it scrolls into view so context
// creation, shader compilation and splat decoding finish while the visitor is
// still reading the sections above, not during the scroll that reveals it.
const MODEL_MOUNT_ROOT_MARGIN = "150% 0px";
const MODEL_PREFETCH_DELAY_MS = 2500;

function canPrefetchModel() {
  if (typeof window === "undefined") return false;
  const connection = window.navigator?.connection;
  if (connection?.saveData) return false;
  if (/(^|-)2g$/.test(connection?.effectiveType || "")) return false;
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-data: reduce)")?.matches) return false;
  return true;
}

/**
 * After the page has loaded and the main thread is idle, download the 3D
 * module and the splat bundle at low priority. Mounting the model later then
 * reads both from cache instead of competing with the visitor's scroll.
 */
function useIdleModelPrefetch(enabled) {
  useEffect(() => {
    if (!enabled || !canPrefetchModel()) return undefined;
    let cancelled = false;
    let timer = 0;
    let idleHandle = 0;

    const prefetch = () => {
      idleHandle = 0;
      if (cancelled) return;
      loadReverance3D()
        .then((module) => {
          if (!cancelled) module.prefetchReveranceSplat?.();
        })
        .catch(() => {});
    };
    const scheduleIdle = () => {
      timer = 0;
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(prefetch, { timeout: 4000 });
      } else {
        prefetch();
      }
    };
    const start = () => {
      if (!timer) timer = window.setTimeout(scheduleIdle, MODEL_PREFETCH_DELAY_MS);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      if (timer) window.clearTimeout(timer);
      if (idleHandle) window.cancelIdleCallback?.(idleHandle);
    };
  }, [enabled]);
}

function pointsToString(points) {
  return (points || []).map((point) => `${point.x},${point.y}`).join(" ");
}

function floorLabel(number, t = (key) => key) {
  return `${t("floorLabelPrefix")} ${String(number).padStart(2, "0")}`;
}

function unitAreaValue(unit) {
  const rawArea = unit?.totalArea;
  if (rawArea === null || rawArea === undefined || rawArea === "") return null;
  const area = Number(rawArea);
  return Number.isFinite(area) ? area : null;
}

function unitAreaLabel(unit, locale) {
  const area = unitAreaValue(unit);
  return area === null ? "—" : `${area.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`;
}

function unitSort(a, b) {
  return String(a.name).localeCompare(String(b.name), undefined, { numeric: true });
}

function getUnitSlots(floor, units, defaultStatus = "sold") {
  const unitsByName = new Map(units.map((unit) => [String(unit.name), unit]));
  const slots = floor.shapes.map((shape) => ({
    shape,
    unit: unitsByName.get(String(shape.target)) || {
      id: `${defaultStatus}-${shape.target}`,
      name: String(shape.target),
      status: defaultStatus,
      floor: floor.number,
      rooms: null,
      bedrooms: null,
      totalArea: null,
      areas: [],
      image2d: null,
      image3d: null,
      price: null,
    },
  }));

  const mappedNames = new Set(slots.map(({ unit }) => String(unit.name)));
  for (const unit of units) {
    if (!mappedNames.has(String(unit.name))) slots.push({ shape: null, unit });
  }

  return slots.sort((a, b) => unitSort(a.unit, b.unit));
}

function getSnapshotBlocks(snapshot) {
  if (Array.isArray(snapshot?.blocks) && snapshot.blocks.length) return snapshot.blocks;
  if (!snapshot) return [];
  return [{
    id: snapshot.blockId || "ReveranceA",
    code: "A",
    name: snapshot.blockName || "A Block",
    floors: snapshot.floors || [],
  }];
}

function getSnapshotBlock(snapshot, blockId) {
  const blocks = getSnapshotBlocks(snapshot);
  return blocks.find((block) => block.id === blockId) || blocks[0] || null;
}

function getSnapshotSlots(snapshot, floor) {
  return getUnitSlots(floor, floor?.units || [], snapshot?.inventoryComplete ? "unavailable" : "sold");
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

const DEFAULT_FILTERS = {
  block: "all",
  floor: "all",
  bedrooms: "all",
  minArea: 0,
  maxArea: 100,
  status: "available",
};

function useScrollStage(sectionRef) {
  const [settled, setSettled] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [zoomable, setZoomable] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const progressRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    // Scroll fires for the whole page, not just the explorer. Remember what was
    // last written so unchanged CSS variables and React state are not touched:
    // each redundant write would invalidate the sticky stage's styles and force
    // the next scroll event's measurement to recalculate layout.
    const written = {
      progress: "",
      filterProgress: "",
      settled: null,
      interactive: null,
      zoomable: null,
      filterActive: null,
    };

    const render = () => {
      frame = 0;
      const bounds = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const height = Math.max(section.offsetHeight - viewportHeight, 1);
      const reduced = reducedMotion.matches;
      const progress = reduced
        ? 1
        : clamp(-bounds.top / height);
      const isSettled = reduced || progress >= EXPLORER_SETTLE_PROGRESS;
      const isInteractive = reduced
        || (bounds.top < viewportHeight && bounds.bottom > 0);
      const isZoomable = reduced
        || progress > 0.001
        || isInteractive;
      const filterTravel = height * EXPLORER_SETTLE_PROGRESS;
      const filterProgress = reduced
        ? 1
        : clamp(-bounds.top / filterTravel);
      const isFilterActive = reduced || filterProgress >= 0.5;

      progressRef.current = progress;
      const progressValue = progress.toFixed(4);
      if (progressValue !== written.progress) {
        written.progress = progressValue;
        section.style.setProperty("--explorer-progress", progressValue);
      }
      const filterProgressValue = filterProgress.toFixed(4);
      if (filterProgressValue !== written.filterProgress) {
        written.filterProgress = filterProgressValue;
        section.style.setProperty("--filter-progress", filterProgressValue);
      }
      if (isSettled !== written.settled) {
        written.settled = isSettled;
        setSettled(isSettled);
      }
      if (isInteractive !== written.interactive) {
        written.interactive = isInteractive;
        setInteractive(isInteractive);
      }
      if (isZoomable !== written.zoomable) {
        written.zoomable = isZoomable;
        setZoomable(isZoomable);
      }
      if (isFilterActive !== written.filterActive) {
        written.filterActive = isFilterActive;
        setFilterActive(isFilterActive);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    // Scroll events dispatch before the animation-frame callbacks of the same
    // frame, so measuring synchronously here lets the WebGL camera consume the
    // fresh progress in that very frame instead of trailing one frame behind.
    const handleScroll = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      render();
    };

    schedule();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener?.("change", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener?.("change", schedule);
    };
  }, [sectionRef]);

  return { filterActive, interactive, settled, zoomable, progressRef };
}

function useDialogA11y(open, onClose, dialogRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    document.body.classList.add("modal-open");

    const focusableSelector = [
      "button:not([disabled])",
      "select:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll(focusableSelector) || [])]
        .filter((element) => !element.hasAttribute("hidden") && element.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector("[data-autofocus]")?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [dialogRef, open]);
}

function AvailabilityLegend({ dark = false }) {
  const { t } = useLanguage();
  return (
    <div className={`availability-legend ${dark ? "is-dark" : ""}`} aria-label={t("residenceStatusLegend")}>
      <span><i className="status-swatch is-available" />{t("available")}</span>
      <span><i className="status-swatch is-reserved" />{t("reserved")}</span>
      <span><i className="status-swatch is-sold" />{t("sold")}</span>
    </div>
  );
}

function FloorNavigationSelect({ floors, value, onChange }) {
  const { t } = useLanguage();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const openFromKeyboardRef = useRef(false);
  const selectedIndex = Math.max(0, floors.findIndex((item) => item.number === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !openFromKeyboardRef.current) return;
    optionRefs.current[activeIndex]?.focus();
    openFromKeyboardRef.current = false;
  }, [activeIndex, open]);

  const chooseFloor = (floor) => {
    setOpen(false);
    onChange(floor.number);
    triggerRef.current?.focus();
  };

  const moveActive = (event, direction) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current + direction + floors.length) % floors.length);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFromKeyboardRef.current = true;
      setActiveIndex(selectedIndex);
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === "ArrowDown") return moveActive(event, 1);
    if (event.key === "ArrowUp") return moveActive(event, -1);
    if (event.key === "Home") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(floors.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      chooseFloor(floors[activeIndex]);
    }
  };

  return (
    <div className="floor-navigation-select" ref={rootRef}>
      <button
        ref={triggerRef}
        className="floor-navigation-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`floor-navigation-menu-${value}`}
        onClick={() => {
          openFromKeyboardRef.current = false;
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{floorLabel(value, t)}</span>
        <CaretDown aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`floor-navigation-menu-${value}`}
          className="floor-navigation-menu"
          role="listbox"
          aria-label={t("selectFloor")}
          onKeyDown={handleMenuKeyDown}
        >
          {floors.map((floor, index) => (
            <button
              ref={(element) => { optionRefs.current[index] = element; }}
              className="floor-navigation-option"
              type="button"
              role="option"
              aria-selected={floor.number === value}
              key={floor.number}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseFloor(floor)}
            >
              {floorLabel(floor.number, t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UnitDetail({ unit, imageMode, setImageMode, onBrokerAccess, fallbackPlanImage, onOpenPreview }) {
  const { t, locale } = useLanguage();
  const goldenPremium = unit.goldenPremium || getGoldenPremiumUnit(`${unit.block || ""}${unit.name}`);
  const goldenCopy = GOLDEN_PREMIUM_COPY[locale];
  const [imageFailed, setImageFailed] = useState(false);
  const planSource = unit.image2d || fallbackPlanImage;
  const previewSource = imageMode === "3d" ? unit.image3d : planSource;
  const previewLabel = imageMode === "3d" ? t("threeDView") : t("twoDPlan");
  const previewAlt = `${previewLabel} · ${t("residence")} ${unit.name}`;

  useEffect(() => setImageFailed(false), [previewSource]);

  return (
    <section className="unit-detail" aria-labelledby="selected-unit-title">
      <div className="unit-detail-heading">
        <div>
            {goldenPremium && <p className="golden-premium-unit-label">{goldenCopy.badge}</p>}
            <p className={`unit-status is-${normalizeStatus(unit.status)}`}>
            <span />{t(normalizeStatus(unit.status))}
          </p>
          <h3 id="selected-unit-title">{t("residenceTitle")} {unit.name}</h3>
        </div>
        <strong>{unitAreaLabel(unit, locale)}</strong>
      </div>

      {goldenPremium && (
        <div className="golden-premium-unit-meta">
          <span>{goldenCopy.referencePrice}</span>
          <strong>{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(goldenPremium.price)}</strong>
        </div>
      )}

      <dl className="unit-facts">
        <div><dt>{t("floor")}</dt><dd>{unit.floor || "—"}</dd></div>
        <div><dt>{t("rooms")}</dt><dd>{unit.rooms || "—"}</dd></div>
        <div><dt>{t("bedrooms")}</dt><dd>{unit.bedrooms || "—"}</dd></div>
        <div><dt>{t("price")}</dt><dd>{unit.price ? String(unit.price) : t("onRequest")}</dd></div>
      </dl>

      {(planSource || unit.image3d) && (
        <div className="unit-preview-wrap">
          <div className="unit-preview-tabs" aria-label={t("residenceImageView")}>
            <button className={imageMode === "2d" ? "is-active" : ""} type="button" onClick={() => setImageMode("2d")} disabled={!planSource}>{t("twoDPlan")}</button>
            <button className={imageMode === "3d" ? "is-active" : ""} type="button" onClick={() => setImageMode("3d")} disabled={!unit.image3d}>{t("threeDView")}</button>
          </div>
          {previewSource && !imageFailed ? (
            <button
              className="unit-preview-button"
              type="button"
              onClick={() => { track("plan_open", { unit: String(unit.name) }); onOpenPreview?.({ src: previewSource, alt: previewAlt, label: `${previewLabel} · ${t("residence")} ${unit.name}` }); }}
              aria-label={t("openFullViewAria", { view: previewLabel, name: unit.name })}
            >
              <img className="unit-preview" src={previewSource} alt={previewAlt} onError={() => setImageFailed(true)} />
              <span className="unit-preview-open-hint"><span>{t("openFullView")}</span><ArrowRight aria-hidden="true" /></span>
            </button>
          ) : (
            <div className="unit-preview-fallback">{t("previewUnavailable")}</div>
          )}
        </div>
      )}

      {unit.areas.length > 0 && (
        <div className="unit-area-list">
          {unit.areas.map((area) => (
            <span key={area.id}><b>{t(`room_${area.type || "other"}`)}</b>{area.size.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²</span>
          ))}
        </div>
      )}

      <button className="button button-primary unit-enquiry" type="button" onClick={onBrokerAccess} disabled={normalizeStatus(unit.status) !== "available"}>
        {t({ available: "requestResidence", sold: "soldResidence", reserved: "reservedResidence" }[normalizeStatus(unit.status)] || "unavailable")}
      </button>
    </section>
  );
}

function MobileResidenceSheet({
  areaBounds,
  bedrooms,
  blocks,
  filters,
  floors,
  matchingUnits,
  onChange,
  onOpenResidence,
  onPreviewResidence,
  onReset,
  previewResidence,
}) {
  const { t, locale } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectedUnitId = previewResidence?.id;
  const visibleUnits = matchingUnits.slice(0, 6);
  const activeFloor = filters.floor === "all" ? t("allFloors") : floorLabel(filters.floor, t);
  const activeBedrooms = filters.bedrooms === "all"
    ? t("allBedrooms")
    : filters.bedrooms === "0" ? t("studio") : `${t("bedrooms")}: ${filters.bedrooms}`;
  const activeBlock = filters.block === "all"
    ? t("allBlocks")
    : blocks.find((block) => block.id === filters.block)?.name || filters.block;

  const openDrawer = (showFilters = false) => {
    setDrawerOpen(true);
    setFiltersOpen(showFilters);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setFiltersOpen(false);
  };

  const openSelectedFloorPlan = () => {
    const unit = matchingUnits.find((candidate) => String(candidate.id) === String(selectedUnitId)) || matchingUnits[0];
    if (unit) {
      closeDrawer();
      onOpenResidence(unit);
    }
  };

  return (
    <>
      <div className="mobile-explorer-topbar">
        <AixessLogo />
        <label className="mobile-floor-chip">
          <span>{t("floor")}</span>
          <select value={filters.floor} onChange={(event) => onChange("floor", event.target.value)} aria-label={t("selectFloor")}>
            <option value="all">{t("all")}</option>
            {floors.map((floor) => <option key={floor} value={floor}>{String(floor).padStart(2, "0")}</option>)}
          </select>
          <CaretDown aria-hidden="true" />
        </label>
      </div>

      <button
        className={`mobile-residence-dock ${drawerOpen ? "is-hidden" : ""}`}
        type="button"
        onClick={(event) => {
          event.currentTarget.blur();
          openDrawer(false);
        }}
        aria-hidden={drawerOpen}
        tabIndex={drawerOpen ? -1 : 0}
      >
        <span className="mobile-dock-summary">
          <small>{t("residences")}</small>
          <strong>{matchingUnits.length}</strong>
          <em>{matchingUnits.length ? t("liveAvailabilityShort") : t("noMatchesShort")}</em>
        </span>
        <span className="mobile-dock-scope">
          <b>{activeFloor}</b>
          <span>{activeBedrooms}</span>
        </span>
        <span className="mobile-dock-open">{t("explore")} <CaretDown aria-hidden="true" /></span>
      </button>

      {drawerOpen && (
        <section className={`mobile-residence-drawer ${filtersOpen ? "is-filters-open" : ""}`} aria-label={t("mobileSelector")}>
          <div className="mobile-drawer-handle" aria-hidden="true" />
          <div className="mobile-drawer-heading">
            <div>
              <span className="mobile-sheet-kicker">{t("residenceSelector")}</span>
              <strong>{matchingUnits.length}</strong>
              <small>{t("matches")}</small>
            </div>
            <div className="mobile-drawer-actions">
              <button type="button" onClick={onReset}>{t("reset")}</button>
              <button className="mobile-drawer-close" type="button" onClick={closeDrawer} aria-label={t("closeResidenceSelector")}><X aria-hidden="true" /></button>
            </div>
          </div>

          <div className="mobile-room-list" aria-live="polite">
            {visibleUnits.length ? visibleUnits.map((unit) => {
              const status = normalizeStatus(unit.status);
              const active = String(selectedUnitId) === String(unit.id);
              const previewImage = unit.image3d || unit.image2d;
              return (
                <button
                  className={`mobile-room-card is-${status} ${active ? "is-active" : ""}`}
                  type="button"
                  key={`${unit.floor}-${unit.id}`}
                  aria-pressed={active}
                  onFocus={() => onPreviewResidence(unit)}
                  onClick={() => onPreviewResidence(unit)}
                >
                  <span className="mobile-room-thumb">
                    {previewImage && <img src={previewImage} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />}
                    <i className={`status-swatch is-${status}`} />
                  </span>
                  <span className="mobile-room-copy">
                    <strong>#{unit.name}</strong>
                    <span><StackSimple aria-hidden="true" /> {floorLabel(unit.floor, t)}</span>
                    <span>{unitAreaLabel(unit, locale)}</span>
                  </span>
                  <span className="mobile-room-meta">
                    <small>{t(status)}</small>
                    <ArrowRight aria-hidden="true" />
                  </span>
                </button>
              );
            }) : (
              <p className="mobile-room-empty">{t("residenceMatchesFilters")}</p>
            )}
          </div>

          <div className="mobile-sheet-tools">
            <button className={filtersOpen ? "is-active" : ""} type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
              <SlidersHorizontal aria-hidden="true" /> {t("filter" )}
            </button>
            <span>{filters.minArea}–{filters.maxArea} m²</span>
            <span>{activeBedrooms}</span>
            <span>{activeFloor}</span>
            <span>{activeBlock}</span>
          </div>

          {filtersOpen && (
            <div className="mobile-filter-popover">
              {blocks.length > 1 && (
                <div>
                  <span>{t("building")}</span>
                  <div className="mobile-filter-buttons">
                    <button className={filters.block === "all" ? "is-active" : ""} type="button" onClick={() => onChange("block", "all")}>{t("allBlocks")}</button>
                    {blocks.map((block) => (
                      <button className={filters.block === block.id ? "is-active" : ""} type="button" key={block.id} onClick={() => onChange("block", block.id)}>{t("blockName", { block: block.code })}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span>{t("bedrooms")}</span>
                <div className="mobile-filter-buttons">
                  <button className={filters.bedrooms === "all" ? "is-active" : ""} type="button" onClick={() => onChange("bedrooms", "all")}>{t("all")}</button>
                  {bedrooms.map((bedroom) => (
                    <button className={filters.bedrooms === String(bedroom) ? "is-active" : ""} key={bedroom} type="button" onClick={() => onChange("bedrooms", String(bedroom))}>
                      {bedroom === 0 ? t("studio") : bedroom}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span>{t("availability")}</span>
                <div className="mobile-filter-buttons">
                  {["available", "reserved", "sold", "all"].map((status) => (
                    <button className={`${filters.status === status ? "is-active" : ""} ${status === "sold" ? "is-sold" : ""}`} key={status} type="button" onClick={() => onChange("status", status)}>{t(status)}</button>
                  ))}
                </div>
              </div>
              <div className="mobile-filter-range">
                <span>{t("areaRange", { min: filters.minArea, max: filters.maxArea })}</span>
                <input type="range" min={areaBounds.min} max={areaBounds.max} value={filters.minArea} aria-label={t("minimumArea")} onChange={(event) => onChange("minArea", Math.min(Number(event.target.value), filters.maxArea))} />
                <input type="range" min={areaBounds.min} max={areaBounds.max} value={filters.maxArea} aria-label={t("maximumArea")} onChange={(event) => onChange("maxArea", Math.max(Number(event.target.value), filters.minArea))} />
              </div>
            </div>
          )}

          <button className="mobile-floor-plan-cta" type="button" onClick={openSelectedFloorPlan} disabled={!matchingUnits.length}>
            {t("viewFloorPlan")} <ArrowRight aria-hidden="true" />
          </button>
        </section>
      )}
    </>
  );
}

function FloorModal({ snapshot, blockId, floorNumber, initialUnitName, onClose, onChangeFloor, onBrokerAccess, floorLoader }) {
  const { t, locale } = useLanguage();
  const dialogRef = useRef(null);
  const requestId = useRef(0);
  const block = getSnapshotBlock(snapshot, blockId);
  const floors = block?.floors || [];
  const floor = floors.find((item) => item.number === floorNumber);
  const [units, setUnits] = useState(floor?.units || []);
  const [selectedUnitName, setSelectedUnitName] = useState(null);
  const [filter, setFilter] = useState("all");
  const [imageMode, setImageMode] = useState("2d");
  const [lightbox, setLightbox] = useState(null);
  const lightboxCloseRef = useRef(null);
  const [syncState, setSyncState] = useState("refreshing");

  useDialogA11y(true, onClose, dialogRef);

  useEffect(() => {
    if (!floor) return undefined;
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setUnits(floor.units || []);
    const initialUnit = getSnapshotSlots(snapshot, floor)
      .find(({ unit }) => String(unit.name) === String(initialUnitName))?.unit;
    setSelectedUnitName(initialUnit ? String(initialUnit.name) : null);
    setFilter("all");
    setImageMode(initialUnit?.image2d ? "2d" : initialUnit?.image3d ? "3d" : "2d");
    setLightbox(null);
    setSyncState("refreshing");

    if (snapshot.inventoryComplete) {
      setSyncState("snapshot");
      return () => { if (requestId.current === currentRequest) requestId.current += 1; };
    }

    floorLoader(block?.id || snapshot.blockId, floor.number)
      .then((liveUnits) => {
        if (requestId.current !== currentRequest) return;
        setUnits(mergeFloorUnits(floor.units, liveUnits, { authoritative: snapshot.inventoryComplete }));
        setSyncState("live");
      })
      .catch(() => {
        if (requestId.current !== currentRequest) return;
        setSyncState("snapshot");
      });

    return () => {
      if (requestId.current === currentRequest) requestId.current += 1;
    };
  }, [block?.id, floor, floorLoader, initialUnitName, snapshot.blockId, snapshot]);

  useEffect(() => {
    if (lightbox) lightboxCloseRef.current?.focus();
  }, [lightbox]);

  const slots = useMemo(() => (floor ? getUnitSlots(floor, units, snapshot.inventoryComplete ? "unavailable" : "sold") : []), [floor, snapshot.inventoryComplete, units]);
  const selectedSlot = slots.find(({ unit }) => String(unit.name) === String(selectedUnitName));
  const selectedUnit = selectedSlot?.unit || null;
  const visibleSlots = filter === "all"
    ? slots
    : slots.filter(({ unit }) => normalizeStatus(unit.status) === filter);
  const currentIndex = floors.findIndex((item) => item.number === floorNumber);
  const previousFloor = floors[currentIndex - 1];
  const nextFloor = floors[currentIndex + 1];

  const selectUnit = useCallback((unit) => {
    track("residence_open", { unit: String(unit.name) });
    setSelectedUnitName(String(unit.name));
    setImageMode(unit.image2d ? "2d" : unit.image3d ? "3d" : "2d");
  }, []);

  if (!floor) return null;

  return (
    <div className="floor-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="floor-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="floor-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="floor-modal-header">
          <div>
            <p>{block ? t("blockName", { block: block.code }) : t("projectReveranceBlock")}</p>
            <h2 id="floor-modal-title">{floorLabel(floor.number, t)}</h2>
          </div>
          <div className="floor-navigation">
            <button type="button" onClick={() => previousFloor && onChangeFloor(previousFloor.number)} disabled={!previousFloor} aria-label={t("previousFloor")}>
              <ArrowLeft aria-hidden="true" />
            </button>
            <FloorNavigationSelect floors={floors} value={floor.number} onChange={onChangeFloor} />
            <button type="button" onClick={() => nextFloor && onChangeFloor(nextFloor.number)} disabled={!nextFloor} aria-label={t("nextFloor")}>
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <button className="floor-modal-close" data-autofocus type="button" onClick={onClose} aria-label={t("closeResidenceExplorer")}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="floor-modal-content">
          <section className="floor-plan-pane" aria-label={t("floorPlanAlt", { floor: floorLabel(floor.number, t) })}>
            <div className="floor-plan-stage">
              <img src={floor.planImage} alt={t("floorPlanAlt", { floor: floorLabel(floor.number, t) })} />
              <svg className="unit-hotspots" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={t("selectResidencePlan")}>
                {slots.filter(({ shape }) => shape).map(({ shape, unit }) => {
                  const status = normalizeStatus(unit.status);
                  const active = selectedUnit && String(selectedUnit.name) === String(unit.name);
                  return (
                    <g
                      className={`unit-hotspot is-${status} ${active ? "is-active" : ""}`}
                      key={shape.id}
                      role="button"
                      tabIndex="0"
                      aria-label={`${t("residence")} ${unit.name}, ${t(status)}${unit.totalArea ? `, ${unit.totalArea} ${t("squareMetres")}` : ""}`}
                      onClick={() => selectUnit(unit)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectUnit(unit);
                        }
                      }}
                    >
                      <polygon points={pointsToString(shape.points)} />
                      <title>{t("residence")} {unit.name} · {t(status)}</title>
                    </g>
                  );
                })}
              </svg>
              {!selectedUnit && (
                <div className="floor-plan-prompt"><HouseLine aria-hidden="true" />{t("selectResidencePrompt")}</div>
              )}
            </div>
            <div className="floor-plan-footer">
              <AvailabilityLegend dark />
              <span className={`sync-state is-${syncState}`}>
                <CheckCircle weight="fill" aria-hidden="true" />
                {syncState === "refreshing" ? t("checkingAvailability") : syncState === "live" ? t("liveAvailability") : t("verifiedSnapshot")}
              </span>
            </div>
          </section>

          <aside className="inventory-pane" aria-label={t("floorResidences")}>
            <div className="inventory-heading">
              <div><p>{t("residences")}</p><strong>{slots.length}</strong></div>
              <div className="inventory-filters" aria-label={t("filterResidences")}>
                {[
                  ["all", t("allFilter")],
                  ["available", t("availableFilter")],
                  ["reserved", t("reservedFilter")],
                  ["sold", t("soldFilter")],
                ].map(([value, label]) => (
                  <button className={`${filter === value ? "is-active" : ""} ${value === "sold" ? "is-sold" : ""}`} key={value} type="button" onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
            </div>

            {selectedUnit ? (
              <UnitDetail
                unit={selectedUnit}
                imageMode={imageMode}
                setImageMode={setImageMode}
                onBrokerAccess={onBrokerAccess}
                fallbackPlanImage={floor.planImage}
                onOpenPreview={setLightbox}
              />
            ) : (
              <div className="inventory-intro">
                <Buildings aria-hidden="true" />
                <h3>{t("chooseResidence")}</h3>
                <p>{t("chooseResidenceCopy")}</p>
              </div>
            )}

            <div className="unit-list" aria-live="polite">
              {visibleSlots.length ? visibleSlots.map(({ unit }) => {
                const status = normalizeStatus(unit.status);
                const active = selectedUnit && String(selectedUnit.name) === String(unit.name);
                return (
                  <button className={`unit-row is-${status} ${active ? "is-active" : ""}`} type="button" key={unit.id} onClick={() => selectUnit(unit)}>
                    <span><i className={`status-swatch is-${status}`} />#{unit.name}</span>
                    <span>{unitAreaLabel(unit, locale)}</span>
                    <span>{t(status)}</span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                );
              }) : (
                <p className="inventory-empty">{t("noResidencesFilter")}</p>
              )}
            </div>
          </aside>
        </div>

        {lightbox && (
          <div className="floor-plan-lightbox-backdrop" role="presentation" onMouseDown={() => setLightbox(null)}>
            <section
              className="floor-plan-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={t("expandedPreviewAria", { label: lightbox.label })}
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setLightbox(null);
                }
              }}
            >
              <button
                className="floor-plan-lightbox-close"
                type="button"
                ref={lightboxCloseRef}
                onClick={() => setLightbox(null)}
                aria-label={t("closeEnlargedPreview")}
              >
                <X aria-hidden="true" />
              </button>
              <div className="floor-plan-lightbox-image">
                <img src={lightbox.src} alt={lightbox.alt} />
              </div>
              <p className="floor-plan-lightbox-caption">
                <strong>{lightbox.label}</strong>
                <span>{t("clickOutsideToClose")}</span>
              </p>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function ResidenceFilter({
  active,
  areaBounds,
  bedrooms,
  blocks,
  filters,
  floors,
  matchingUnits,
  onChange,
  onOpenResidence,
  onPreviewResidence,
  previewResidence,
  onReset,
}) {
  const { t, locale } = useLanguage();
  const formatArea = (value) => `${Number(value).toFixed(0)} m²`;
  const areaRange = Math.max(areaBounds.max - areaBounds.min, 1);
  const minAreaProgress = ((filters.minArea - areaBounds.min) / areaRange) * 100;
  const maxAreaProgress = ((filters.maxArea - areaBounds.min) / areaRange) * 100;

  return (
    <div
      className="residence-filter-panel"
      aria-hidden={!active}
      inert={!active}
    >
      <div className="residence-filter-heading">
        <p className="section-eyebrow">{t("findResidence")}</p>
        <div className="residence-filter-heading-actions">
          <span>{matchingUnits.length} {matchingUnits.length === 1 ? t("match") : t("matches")}</span>
          <button className="residence-filter-reset" type="button" onClick={onReset}>{t("resetFilters")}</button>
        </div>
      </div>
      <FittedHeading><span>{t("filterOpportunity")}</span><span>{t("opportunity")}</span></FittedHeading>
      <p className="residence-filter-intro">{t("filterIntro")}</p>

      <div className="residence-filter-controls" aria-label={t("filterResidences")}>
        {blocks.length > 1 && (
          <label className="residence-select-field residence-block-field">
            <span>{t("building")}</span>
            <select value={filters.block} onChange={(event) => onChange("block", event.target.value)}>
              <option value="all">{t("allBlocks")}</option>
              {blocks.map((block) => <option key={block.id} value={block.id}>{t("blockName", { block: block.code }).toLocaleUpperCase(locale)}</option>)}
            </select>
          </label>
        )}
        <label className="residence-select-field">
          <span>{t("floor")}</span>
          <select value={filters.floor} onChange={(event) => onChange("floor", event.target.value)}>
            <option value="all">{t("allFloors")}</option>
            {floors.map((floor) => (
              <option key={floor} value={floor}>{floorLabel(floor, t).toUpperCase()}</option>
            ))}
          </select>
        </label>

        <fieldset className="residence-choice-field">
          <legend>{t("bedrooms")}</legend>
          <div>
            <button className={filters.bedrooms === "all" ? "is-active" : ""} type="button" onClick={() => onChange("bedrooms", "all")}>{t("all")}</button>
            {bedrooms.map((bedroom) => (
              <button
                className={filters.bedrooms === String(bedroom) ? "is-active" : ""}
                key={bedroom}
                type="button"
                onClick={() => onChange("bedrooms", String(bedroom))}
              >
                {bedroom === 0 ? t("studio") : bedroom}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="residence-area-field">
          <legend>{t("area")}</legend>
          <div className="residence-area-readout">
            <output>{formatArea(filters.minArea)}</output>
            <span>{t("to")}</span>
            <output>{formatArea(filters.maxArea)}</output>
          </div>
          <div className="residence-area-ranges">
            <input
              type="range"
              min={areaBounds.min}
              max={areaBounds.max}
              step="1"
              value={filters.minArea}
              style={{ "--range-progress": `${minAreaProgress}%` }}
              aria-label={t("minimumArea")}
              onChange={(event) => onChange("minArea", Math.min(Number(event.target.value), filters.maxArea))}
            />
            <input
              type="range"
              min={areaBounds.min}
              max={areaBounds.max}
              step="1"
              value={filters.maxArea}
              style={{ "--range-progress": `${maxAreaProgress}%` }}
              aria-label={t("maximumArea")}
              onChange={(event) => onChange("maxArea", Math.max(Number(event.target.value), filters.minArea))}
            />
          </div>
        </fieldset>

        <fieldset className="residence-choice-field residence-status-field">
          <legend>{t("availability")}</legend>
          <div>
            {[
              ["available", t("available")],
              ["reserved", t("reserved")],
              ["sold", t("sold")],
              ["all", t("all")],
            ].map(([value, label]) => (
              <button className={`${filters.status === value ? "is-active" : ""} ${value === "sold" ? "is-sold" : ""}`} key={value} type="button" onClick={() => onChange("status", value)}>{label}</button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="residence-filter-results" aria-live="polite">
        {matchingUnits.length ? (
          <>
            <div className="residence-filter-results-head" aria-hidden="true">
              <span>{t("residence")}</span>
              <span>{t("floor")}</span>
              <span>{t("area")}</span>
              <span />
            </div>
            {matchingUnits.map((unit) => {
              const status = normalizeStatus(unit.status);
              const area = unitAreaValue(unit);
              const isActive = String(previewResidence?.id) === String(unit.id);
              return (
                <button
                  className={`residence-filter-result is-${status} ${isActive ? "is-active" : ""}`}
                  key={`${unit.floor}-${unit.id}`}
                  type="button"
                  aria-label={`${t("residence")} ${unit.name}, ${t("floor")} ${unit.floor}, ${area === null ? t("areaUnavailable") : `${area.toFixed(1)} ${t("squareMetres")}`}, ${t(status)}`}
                  onMouseEnter={() => onPreviewResidence(unit)}
                  onFocus={() => onPreviewResidence(unit)}
                  onClick={() => onOpenResidence(unit)}
                >
                  <span><i className={`status-swatch is-${status}`} />{unit.block ? `${unit.block} · ` : ""}#{unit.name}</span>
                  <span>F{String(unit.floor).padStart(2, "0")}</span>
                  <strong>{unitAreaLabel(unit, locale)}</strong>
                  <ArrowRight aria-hidden="true" />
                </button>
              );
            })}
          </>
        ) : (
          <div className="residence-filter-empty">
            <strong>{t("noMatches")}</strong>
            <p>{t("adjustFilters")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResidenceExplorer({ onBrokerAccess, liveInventoryTitle = false, requestedApartment = null, snapshotLoader = loadResidenceSnapshot, floorLoader = loadLiveFloor }) {
  const { t, locale } = useLanguage();
  const sectionRef = useRef(null);
  const modelHostRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedUnitName, setSelectedUnitName] = useState(null);
  const handledApartmentRequest = useRef(null);
  const [previewUnitId, setPreviewUnitId] = useState(null);
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [filtersTouched, setFiltersTouched] = useState(false);
  const filterTrackingTimer = useRef(null);
  useEffect(() => () => clearTimeout(filterTrackingTimer.current), []);
  useEffect(() => { if (selectedFloor !== null) track("floor_open", { floor: selectedFloor }); }, [selectedFloor]);
  const [retryKey, setRetryKey] = useState(0);
  const [canMountModel, setCanMountModel] = useState(() => (
    typeof window === "undefined" || !("IntersectionObserver" in window)
  ));
  const { filterActive, interactive, settled, zoomable, progressRef } = useScrollStage(sectionRef);
  useIdleModelPrefetch(!canMountModel);
  const blocks = useMemo(() => getSnapshotBlocks(snapshot), [snapshot]);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    snapshotLoader()
      .then((data) => active && setSnapshot(data))
      .catch((error) => active && setLoadError(error));
    return () => { active = false; };
  }, [retryKey, snapshotLoader]);

  useEffect(() => {
    if (canMountModel || !modelHostRef.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setCanMountModel(true);
      observer.disconnect();
    }, { rootMargin: MODEL_MOUNT_ROOT_MARGIN });

    observer.observe(modelHostRef.current);
    return () => observer.disconnect();
  }, [canMountModel]);

  const summary = useMemo(() => {
    if (!snapshot) return { available: 0, total: 0 };
    return blocks.flatMap((block) => block.floors || []).reduce((totals, floor) => {
      const floorSummary = getFloorSummary(floor);
      totals.available += floorSummary.available;
      totals.total += floorSummary.total;
      return totals;
    }, { available: 0, total: 0 });
  }, [blocks, snapshot]);

  const inventory = useMemo(() => (
    snapshot
      ? blocks.flatMap((block) => (block.floors || []).flatMap((floor) => getUnitSlots(
        floor,
        floor.units || [],
        snapshot.inventoryComplete ? "unavailable" : "sold",
      ).map(({ unit }) => ({
        ...unit,
        block: unit.block || block.code,
        blockId: unit.blockId || block.id,
        floor: floor.number,
      }))))
      : []
  ), [blocks, snapshot]);
  const areaBounds = useMemo(() => {
    const areas = inventory.map(unitAreaValue).filter((area) => area !== null);
    return {
      min: areas.length ? Math.floor(Math.min(...areas)) : 0,
      max: areas.length ? Math.ceil(Math.max(...areas)) : 100,
    };
  }, [inventory]);
  const floors = useMemo(
    () => [...new Set(blocks.flatMap((block) => (block.floors || []).map((floor) => floor.number)))].sort((a, b) => a - b),
    [blocks],
  );
  const bedroomOptions = useMemo(
    () => [...new Set(inventory.map((unit) => Number(unit.bedrooms)).filter(Number.isFinite))].sort((a, b) => a - b),
    [inventory],
  );

  useEffect(() => {
    if (!inventory.length) return;
    setFilters((current) => ({
      ...current,
      minArea: current.minArea === 0 ? areaBounds.min : current.minArea,
      maxArea: current.maxArea === 100 ? areaBounds.max : current.maxArea,
    }));
  }, [areaBounds.max, areaBounds.min, inventory.length]);

  const matchingUnits = useMemo(() => inventory.filter((unit) => {
    const area = unitAreaValue(unit);
    const rawBedrooms = unit.bedrooms;
    const bedrooms = Number(rawBedrooms);
    const hasBedrooms = rawBedrooms !== null && rawBedrooms !== undefined && rawBedrooms !== "" && Number.isFinite(bedrooms);
    return (filters.block === "all" || unit.blockId === filters.block)
      && (filters.floor === "all" || unit.floor === Number(filters.floor))
      && (filters.bedrooms === "all" || (hasBedrooms && bedrooms === Number(filters.bedrooms)))
      && (area === null || (area >= filters.minArea && area <= filters.maxArea))
      && (filters.status === "all" || normalizeStatus(unit.status) === filters.status);
  }), [filters, inventory]);
  const previewResidence = useMemo(
    () => matchingUnits.find((unit) => String(unit.id) === String(previewUnitId)) || matchingUnits[0] || null,
    [matchingUnits, previewUnitId],
  );
  const filterHighlightedFloor = filterActive && (filtersTouched || previewUnitId !== null)
    ? previewResidence?.floor ?? null
    : null;
  const filterHighlightedBlock = filterActive && (filtersTouched || previewUnitId !== null)
    ? previewResidence?.blockId ?? null
    : null;

  const updateFilter = useCallback((name, value) => {
    clearTimeout(filterTrackingTimer.current);
    filterTrackingTimer.current = setTimeout(() => track("filter_change", { filter: name }), 600);
    setFilters((current) => ({ ...current, [name]: value }));
    setPreviewUnitId(null);
    setFiltersTouched(true);
  }, []);

  const resetFilters = useCallback(() => {
    clearTimeout(filterTrackingTimer.current);
    track("filter_reset");
    setFilters({
      ...DEFAULT_FILTERS,
      minArea: areaBounds.min,
      maxArea: areaBounds.max,
    });
    setPreviewUnitId(null);
    setFiltersTouched(false);
  }, [areaBounds.max, areaBounds.min]);

  const openResidence = useCallback((unit) => {
    track("residence_open", { unit: String(unit.name), floor: unit.floor, block: unit.block || unit.blockId });
    setSelectedUnitName(String(unit.name));
    setSelectedBlockId(unit.blockId || null);
    setSelectedFloor(unit.floor);
  }, []);

  useEffect(() => {
    if (!requestedApartment || handledApartmentRequest.current === requestedApartment) return;
    const unit = inventory.find((item) => `${item.block}${item.name}` === requestedApartment.code);
    if (!unit) return;
    handledApartmentRequest.current = requestedApartment;
    openResidence(unit);
  }, [inventory, openResidence, requestedApartment]);

  const handleModelFloorSelect = useCallback((floorNumber, blockId = null) => {
    setSelectedBlockId(blockId || null);
    setSelectedUnitName(null);
    setSelectedFloor(floorNumber);
  }, []);

  return (
    <section
      className="residence-explorer"
      id="residences"
      ref={sectionRef}
      data-settled={settled}
      data-interactive={interactive}
      data-zoomable={zoomable}
      aria-labelledby="residence-explorer-title"
    >
      <div className="explorer-sticky">
        <div className="explorer-progress" aria-hidden="true"><span /></div>

        <div className="explorer-copy">
          <div className="explorer-copy-panel explorer-intro-panel" aria-hidden={filterActive} inert={filterActive}>
            <p className="section-eyebrow">{liveInventoryTitle ? NETWORK_COPY[locale].live : t("residenceExplorer")}</p>
            <FittedHeading id="residence-explorer-title">{(liveInventoryTitle ? NETWORK_COPY[locale].liveTitle : [t("selectOpportunity"), t("opportunity").replace(/\.$/, "")]).map(line => <span key={line}>{line}</span>)}</FittedHeading>
            <p className="explorer-description">
              {t("explorerDescription")}
            </p>

            <div className="explorer-metrics" aria-label={t("availabilitySummary")}>
              <div><strong>{summary.available}</strong><span>{t("availableResidences")}</span></div>
              <div><strong>{floors.length}</strong><span>{t("selectableFloors")}</span></div>
            </div>
            <AvailabilityLegend />
            <p className="explorer-footnote">{t("blockFloorsBatumi")}</p>
          </div>

          <ResidenceFilter
            active={filterActive}
            areaBounds={areaBounds}
            bedrooms={bedroomOptions}
            blocks={blocks}
            filters={filters}
            floors={floors}
            matchingUnits={matchingUnits}
            onChange={updateFilter}
            onOpenResidence={openResidence}
            onPreviewResidence={(unit) => setPreviewUnitId(unit.id)}
            previewResidence={previewResidence}
            onReset={resetFilters}
          />
        </div>

        <div className="explorer-stage">
          <div className="explorer-model-host" ref={modelHostRef}>
            {snapshot ? canMountModel ? (
              <Suspense fallback={<div className="explorer-loading" role="status"><span />{t("preparingBuilding")}</div>}>
                <Reverance3D
                  snapshot={snapshot}
                  onSelectFloor={handleModelFloorSelect}
                  highlightedFloor={filterHighlightedFloor}
                  highlightedBlock={filterHighlightedBlock}
                  interactive={interactive}
                  zoomable={zoomable}
                  settled={settled}
                  progressRef={progressRef}
                />
              </Suspense>
            ) : (
              <div className="explorer-loading" role="status"><span />{t("preparingBuilding")}</div>
            ) : loadError ? (
              <div className="explorer-error" role="alert">
                <Buildings aria-hidden="true" />
                <h3>{t("explorerUnavailable")}</h3>
                <p>{t("explorerUnavailableCopy")}</p>
                <button className="button button-primary" type="button" onClick={() => setRetryKey((key) => key + 1)}>{t("tryAgain")}</button>
              </div>
            ) : (
              <div className="explorer-loading" role="status"><span />{t("loadingExplorer")}</div>
            )}
          </div>
        </div>

        {snapshot && (
          <MobileResidenceSheet
            areaBounds={areaBounds}
            bedrooms={bedroomOptions}
            blocks={blocks}
            filters={filters}
            floors={floors}
            matchingUnits={matchingUnits}
            onChange={updateFilter}
            onOpenResidence={openResidence}
            onPreviewResidence={(unit) => setPreviewUnitId(unit.id)}
            onReset={resetFilters}
            previewResidence={previewUnitId === null ? null : previewResidence}
          />
        )}

        <div className="explorer-motion-caption" aria-hidden="true">
          {["sideProfile", "live3DRotation", "exploreFloor"].map((key) => {
            const [step, label] = t(key).split(" · ");
            return <span key={key}><span className="explorer-step-number">{step}</span><span className="explorer-step-separator"> · </span>{label}</span>;
          })}
        </div>
      </div>

      {snapshot && selectedFloor !== null && (
        <FloorModal
          snapshot={snapshot}
          blockId={selectedBlockId}
          floorNumber={selectedFloor}
          initialUnitName={selectedUnitName}
          onClose={() => {
            setSelectedBlockId(null);
            setSelectedFloor(null);
            setSelectedUnitName(null);
          }}
          onChangeFloor={(floorNumber) => {
            setSelectedFloor(floorNumber);
            setSelectedUnitName(null);
          }}
          onBrokerAccess={() => {
            setSelectedBlockId(null);
            setSelectedFloor(null);
            setSelectedUnitName(null);
            onBrokerAccess();
          }}
          floorLoader={floorLoader}
        />
      )}
    </section>
  );
}
