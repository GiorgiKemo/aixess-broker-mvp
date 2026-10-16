import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { REVERANCE_INFO_COPY } from "../reverance-project-info-copy.js";
import GALLERY_SIZES from "../data/project-gallery-sizes.json";
import { CONTACT } from "../contact-copy.js";
import "./reverance-project.css";

// Project Reverance information beneath the approved hero (Klem, 16 October 2026: "compare" the
// AIXCO.Global v4 project page). Copy and its qualifications are in reverance-project-info-copy.js.

export const PROJECT_SECTIONS = ["opportunity", "why-batumi", "residence", "payment", "ownership", "why-aixco", "gallery", "faq", "approach"];

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

// AIXCO's form posts to its own endpoint; AiXESS has no form destination, so "Request a brief" is
// an email to the AiXESS address (see CONTACT).
export function briefHref(label) {
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(`AiXESS · Project Reverance: ${label}`)}`;
}

const goToExplorer = (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  document.getElementById("residence-explorer")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
};

// AIXCO's hero copy and proof points, under the approved AiXESS hero.
export function ProjectProfile() {
  const { profile, briefCta, availabilityCta } = useProjectInfoCopy();
  return (
    <section className="rp-profile" aria-labelledby="rp-profile-title">
      <p className="section-eyebrow">{profile.eyebrow}</p>
      <h2 id="rp-profile-title">{profile.title}</h2>
      <p className="rp-lead">{profile.lead}</p>
      <ul className="rp-proof">{profile.proof.map((point) => <li key={point}>{point}</li>)}</ul>
      <p className="rp-profile-meta"><span>{profile.address}</span><span>{profile.completion}</span></p>
      <div className="rp-actions">
        <a className="button button-primary" href="#residence-explorer" onClick={goToExplorer}>{availabilityCta}<span aria-hidden="true">→</span></a>
        <a className="button button-ghost" href={briefHref(briefCta)}>{briefCta}</a>
      </div>
      <p className="rp-note">{profile.note}</p>
    </section>
  );
}

// AIXCO's opportunity block, with its availability snapshot and highlights. The Golden Premium list is left out (Kemo, 16 October 2026).
export function AixcoOpportunity() {
  const { opportunity, gallery } = useProjectInfoCopy();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const items = [[opportunity.imageLabel, "sunset", opportunity.imageAlt]];
  return (
    <section className="rp-section rp-opportunity" aria-labelledby="rp-opportunity-title">
      <div className="rp-split">
        <div>
          <Heading id="rp-opportunity-title" eyebrow={opportunity.eyebrow} title={opportunity.title} lead={opportunity.lead} />
          <p className="rp-body rp-body-tight">{opportunity.availability}</p>
          <dl className="rp-stats rp-stats-4">
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
          <figcaption><span>{opportunity.imageLabel}</span><strong>{opportunity.imageCaption}</strong></figcaption>
        </figure>
      </div>
      {open && <Lightbox items={items} index={0} onClose={() => { setOpen(false); window.setTimeout(() => trigger.current?.focus({ preventScroll: true }), 0); }} onStep={() => {}} labels={gallery} />}
    </section>
  );
}

export function ProjectSubnav() {
  const copy = useProjectInfoCopy();
  const [active, setActive] = useState(null);
  const listRef = useRef(null);

  // On phones the bar scrolls sideways: keep the current section's link in view (the bar only,
  // never the page).
  useEffect(() => {
    const list = listRef.current;
    const link = active && list?.querySelector(`a[href="#residences/${active}"]`);
    if (!link || list.scrollWidth <= list.clientWidth) return;
    const left = link.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + link.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo?.({ left: Math.max(0, left - 16), behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }, [active]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const seen = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => seen.set(entry.target.id, entry.isIntersecting));
      setActive(PROJECT_SECTIONS.find((id) => seen.get(id)) || null);
    }, { rootMargin: "-20% 0px -70% 0px" });
    PROJECT_SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const go = (id) => (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // replaceState fires no hashchange, so the app router keeps this page instead of resetting.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}#residences/${id}`);
    scrollToProjectSection(id);
  };

  return (
    <nav className="rp-subnav" aria-label={copy.navLabel}>
      <ul ref={listRef}>
        {PROJECT_SECTIONS.map((id) => (
          <li key={id}>
            <a href={`#residences/${id}`} onClick={go(id)} aria-current={active === id ? "true" : undefined}>{copy.nav[id]}</a>
          </li>
        ))}
        <li className="rp-subnav-action"><a href={briefHref(copy.briefCta)}>{copy.briefCta}</a></li>
      </ul>
    </nav>
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
      <ul className="rp-benefits">
        {residence.benefits.map(([title, body], index) => (
          <li key={title}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></li>
        ))}
      </ul>
      <h3 className="rp-subtitle">{residence.amenitiesTitle}</h3>
      <ul className="rp-amenities">
        {residence.amenities.map(([title, body, images]) => (
          <li key={title}>
            <h4>{title}</h4>
            <p>{body}</p>
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
      <ul className="rp-benefits rp-benefits-4">
        {ownership.items.map(([title, body], index) => (
          <li key={title}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></li>
        ))}
      </ul>
      <p className="rp-note">{ownership.note}</p>
    </section>
  );
}

export function WhyAixco() {
  const { aixco } = useProjectInfoCopy();
  return (
    <section className="rp-section rp-mist" id="why-aixco" aria-labelledby="why-aixco-title">
      <Heading id="why-aixco-title" eyebrow={aixco.eyebrow} title={aixco.title} lead={aixco.lead} />
      <dl className="rp-stats rp-stats-5">
        {aixco.stats.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="rp-note">{aixco.statsNote}</p>
      <p className="rp-body">{aixco.body}</p>
      <p className="rp-path">{aixco.path.map((step, index) => <span key={step}>{index > 0 && <span className="rp-path-arrow" aria-hidden="true">→</span>}{step}</span>)}</p>

      <div className="rp-block">
        <p className="section-eyebrow">{aixco.researchEyebrow}</p>
        <h3 className="rp-block-title">{aixco.researchTitle}</h3>
        <p className="rp-lead">{aixco.researchLead}</p>
        <ul className="rp-cards">
          {aixco.research.map(([title, body]) => <li key={title}><h4>{title}</h4><p>{body}</p></li>)}
        </ul>
      </div>

      <div className="rp-block rp-anchor" id="approach">
        <p className="section-eyebrow">{aixco.journeyEyebrow}</p>
        <h3 className="rp-block-title">{aixco.journeyTitle}</h3>
        <p className="rp-lead">{aixco.journeyLead}</p>
        <ol className="rp-cards rp-journey">
          {aixco.journey.map(([title, body], index) => (
            <li key={title}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h4>{title}</h4><p>{body}</p></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Lightbox({ items, index, onClose, onStep, labels }) {
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
  const [label, slug, alt] = items[index];
  const image = gallerySource(slug);
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
        <figcaption><strong>{label}</strong><span>{alt}</span>{items.length > 1 && <span className="rp-lightbox-count">{index + 1} {labels.of} {items.length}</span>}</figcaption>
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
      <Heading id="gallery-title" eyebrow={gallery.eyebrow} title={gallery.title} lead={gallery.lead} />
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

export function ProjectFaq() {
  const { faq } = useProjectInfoCopy();
  return (
    <section className="rp-section rp-mist" id="faq" aria-labelledby="faq-title">
      <Heading id="faq-title" eyebrow={faq.eyebrow} title={faq.title} />
      <div className="rp-faq">
        {faq.items.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}<span aria-hidden="true">+</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function StartWithAixco() {
  const { start, briefCta, availabilityCta } = useProjectInfoCopy();
  return (
    <section className="rp-section rp-start" aria-labelledby="rp-start-title">
      <Heading id="rp-start-title" eyebrow={start.eyebrow} title={start.title} lead={start.lead} />
      <div className="rp-actions">
        <a className="button button-primary" href={briefHref(briefCta)}>{briefCta}<span aria-hidden="true">→</span></a>
        <a className="button button-ghost" href="#residence-explorer" onClick={goToExplorer}>{availabilityCta}</a>
      </div>
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
