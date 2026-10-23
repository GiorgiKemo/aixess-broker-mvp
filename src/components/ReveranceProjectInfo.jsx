import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { REVERANCE_INFO_COPY } from "../reverance-project-info-copy.js";
import GALLERY_SIZES from "../data/project-gallery-sizes.json";
import "./reverance-project.css";

// Project Reverance information beneath the approved hero (Klem, 16 October 2026: "compare" the
// AIXCO.Global v4 project page). Copy and its qualifications are in reverance-project-info-copy.js.

export const PROJECT_SECTIONS = ["opportunity", "why-batumi", "residence", "payment", "ownership", "gallery"];

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useProjectInfoCopy() {
  const { locale } = useLanguage();
  return REVERANCE_INFO_COPY[locale] || REVERANCE_INFO_COPY.en;
}

function gallerySource(slug) {
  const meta = GALLERY_SIZES[slug];
  const widths = meta.widths;
  return {
    src: `/assets/projects/gallery/${slug}-${widths[Math.min(1, widths.length - 1)]}.webp`,
    srcSet: widths.map((w) => `/assets/projects/gallery/${slug}-${w}.webp ${w}w`).join(", "),
    full: `/assets/projects/gallery/${slug}-${widths[widths.length - 1]}.webp`,
    width: meta.width,
    height: meta.height,
  };
}

function ProjectImage({ slug, alt, sizes, className }) {
  const image = gallerySource(slug);
  return <img className={className} src={image.src} srcSet={image.srcSet} sizes={sizes} width={image.width} height={image.height} alt={alt} loading="lazy" decoding="async" />;
}

// Scrolls to a section of this page and moves focus to its heading, keeping the #residences route.
export function scrollToProjectSection(id, behavior) {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: behavior || (reducedMotion() ? "auto" : "smooth"), block: "start" });
  const heading = target.matches("h2, h3") ? target : target.querySelector("h2, h3");
  if (heading) {
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  return true;
}

// Project specifics from AIXCO's opportunity block. Its heading, 24-available count and anything
// already shown above are left out so no text repeats; so is the Golden Premium list (Kemo, 16 October 2026).
export function AixcoOpportunity() {
  const { opportunity, gallery } = useProjectInfoCopy();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const items = [[opportunity.imageLabel, "sunset", opportunity.imageAlt]];
  return (
    <section className="rp-section rp-opportunity" aria-label={opportunity.eyebrow}>
      <div className="rp-split">
        <div>
          <dl className="rp-stats rp-stats-2">
            {opportunity.stats.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <ul className="rp-highlights">
            {opportunity.highlights.map(([label, value]) => <li key={label}><strong>{label}:</strong> {value}</li>)}
          </ul>
        </div>
        <figure className="rp-opportunity-media">
          <button type="button" ref={trigger} onClick={() => setOpen(true)} aria-label={`${opportunity.expand}: ${opportunity.imageAlt}`}>
            <ProjectImage slug="sunset" alt="" sizes="(max-width: 899px) calc(100vw - 2.5rem), 42vw" />
          </button>
          <figcaption><span>{opportunity.imageLabel}</span></figcaption>
        </figure>
      </div>
      {open && <Lightbox items={items} index={0} onClose={() => { setOpen(false); window.setTimeout(() => trigger.current?.focus({ preventScroll: true }), 0); }} onStep={() => {}} labels={gallery} />}
    </section>
  );
}

function Heading({ id, eyebrow, title, lead }) {
  return (
    <header className="rp-heading">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {lead && <p className="rp-lead">{lead}</p>}
    </header>
  );
}

export function WhyBatumi() {
  const { batumi } = useProjectInfoCopy();
  return (
    <section className="rp-section rp-mist" id="why-batumi" aria-labelledby="why-batumi-title">
      <header className="rp-heading">
        <p className="section-eyebrow">{batumi.eyebrow}</p>
        <h2 id="why-batumi-title" className="rp-statement">{batumi.title}</h2>
      </header>
      <dl className="rp-stats rp-stats-5">
        {batumi.stats.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="rp-note">{batumi.source} {batumi.note}</p>
    </section>
  );
}

export function WhyReverance() {
  const { residence, gallery } = useProjectInfoCopy();
  const [open, setOpen] = useState(null);
  const triggers = useRef({});
  return (
    <section className="rp-section" id="residence" aria-labelledby="residence-title">
      <Heading id="residence-title" eyebrow={residence.eyebrow} title={residence.title} />
      <h3 className="rp-subtitle">{residence.amenitiesTitle}</h3>
      <ul className="rp-amenities">
        {residence.amenities.map(([title, , images]) => (
          <li key={title}>
            <h4>{title}</h4>
            <ul className="rp-amenity-images">
              {images.map(([slug, caption, alt], index) => (
                <li key={slug}>
                  <button type="button" ref={(node) => { triggers.current[`${title}-${index}`] = node; }} onClick={() => setOpen({ title, index })} aria-label={`${residence.viewAmenity}: ${caption}`}>
                    <ProjectImage slug={slug} alt="" sizes={index === 0 ? "(max-width: 699px) calc(100vw - 2.5rem), (max-width: 1099px) 46vw, 23vw" : "(max-width: 699px) 50vw, (max-width: 1099px) 23vw, 12vw"} />
                  </button>
                  <span>{caption}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {open && (() => {
        const [, , images] = residence.amenities.find(([title]) => title === open.title);
        const items = images.map(([slug, caption, alt]) => [caption, slug, alt]);
        return <Lightbox items={items} index={open.index} onStep={(delta) => setOpen((current) => ({ ...current, index: (current.index + delta + items.length) % items.length }))} onClose={() => { const key = `${open.title}-${open.index}`; setOpen(null); window.setTimeout(() => triggers.current[key]?.focus({ preventScroll: true }), 0); }} labels={gallery} />;
      })()}
      <p className="rp-note">{residence.renderNote}</p>
    </section>
  );
}

export function PaymentStructure({ children }) {
  const { locale } = useLanguage();
  const { payment } = useProjectInfoCopy();
  const percent = (value) => new Intl.NumberFormat(locale, { style: "percent" }).format(value / 100);
  return (
    <section className="rp-section rp-mist" id="payment" aria-labelledby="payment-title">
      <Heading id="payment-title" eyebrow={payment.eyebrow} title={payment.title} lead={payment.lead} />
      <ol className="rp-stages">
        {payment.stages.map(([value, title, body], index) => (
          <li key={title}>
            <span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <strong>{percent(Number.parseInt(value, 10))}</strong>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p className="rp-note">{payment.note}</p>
      <p className="rp-bridge">{payment.bridge}</p>
      {children}
    </section>
  );
}

export function Ownership() {
  const { ownership } = useProjectInfoCopy();
  return (
    <section className="rp-section" id="ownership" aria-labelledby="ownership-title">
      <Heading id="ownership-title" eyebrow={ownership.eyebrow} title={ownership.title} />
      <ul className="rp-benefits rp-benefits-3">
        {ownership.items.map(([title, body], index) => (
          <li key={title}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></li>
        ))}
      </ul>
      <p className="rp-note">{ownership.note}</p>
    </section>
  );
}

// items are [label, slug or image sources, alt, extra]; extra (optional) is shown in the caption.
export function Lightbox({ items, index, onClose, onStep, labels }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (typeof dialog.showModal === "function") { if (!dialog.open) dialog.showModal(); } else dialog.setAttribute("open", "");
    const onKey = (event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); onStep(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); onStep(-1); }
    };
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, [onStep]);
  const [label, slug, alt, extra] = items[index];
  const image = typeof slug === "string" ? gallerySource(slug) : slug;
  return (
    <dialog
      ref={dialogRef}
      className="rp-lightbox"
      aria-label={label}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}
    >
      <figure>
        <img src={image.full} srcSet={image.srcSet} sizes="100vw" width={image.width} height={image.height} alt={alt} decoding="async" />
        <figcaption><strong>{label}</strong><span>{alt}</span>{extra}{items.length > 1 && <span className="rp-lightbox-count">{index + 1} {labels.of} {items.length}</span>}</figcaption>
      </figure>
      <button className="rp-lightbox-close" type="button" onClick={onClose} aria-label={labels.close} autoFocus>×</button>
      {items.length > 1 && <button className="rp-lightbox-step rp-lightbox-prev" type="button" onClick={() => onStep(-1)} aria-label={labels.previous}>←</button>}
      {items.length > 1 && <button className="rp-lightbox-step rp-lightbox-next" type="button" onClick={() => onStep(1)} aria-label={labels.next}>→</button>}
    </dialog>
  );
}

export function ProjectGallery() {
  const { gallery } = useProjectInfoCopy();
  const [open, setOpen] = useState(null);
  const triggers = useRef([]);
  const items = gallery.items;
  const close = useCallback(() => {
    setOpen((current) => {
      if (current !== null) window.setTimeout(() => triggers.current[current]?.focus({ preventScroll: true }), 0);
      return null;
    });
  }, []);
  const step = useCallback((delta) => setOpen((current) => (current === null ? null : (current + delta + items.length) % items.length)), [items.length]);
  return (
    <section className="rp-section" id="gallery" aria-labelledby="gallery-title">
      <Heading id="gallery-title" eyebrow={gallery.eyebrow} title={gallery.title} />
      <ul className="rp-gallery">
        {items.map(([label, slug, alt], index) => (
          <li key={slug}>
            <button type="button" ref={(node) => { triggers.current[index] = node; }} onClick={() => setOpen(index)} aria-label={`${gallery.open}: ${alt}`}>
              <ProjectImage slug={slug} alt="" sizes="(max-width: 599px) calc(100vw - 2.5rem), (max-width: 1099px) 46vw, 31vw" />
              <span className="rp-gallery-label">{label}</span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox items={items} index={open} onClose={close} onStep={step} labels={gallery} />}
    </section>
  );
}

// "#residences/payment" opens this page at that section (direct links, reload, edited hashes).
export function useProjectSectionFromHash() {
  useEffect(() => {
    const timers = [];
    const scrollFromHash = () => {
      const [, section] = window.location.hash.replace(/^#/, "").split("/");
      if (!section || !document.getElementById(section)) return;
      timers.push(window.setTimeout(() => scrollToProjectSection(section, "auto"), 60));
      timers.push(window.setTimeout(() => scrollToProjectSection(section, "auto"), 700));
    };
    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => { window.removeEventListener("hashchange", scrollFromHash); timers.forEach(window.clearTimeout); };
  }, []);
}
