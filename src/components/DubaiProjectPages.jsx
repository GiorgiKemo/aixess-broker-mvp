import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { DUBAI_PROJECTS_COPY } from "../dubai-projects-copy.js";
import { DUBAI_SOURCES_COPY } from "../dubai-projects-sources-copy.js";
import {
  DOWNTOWN_LAYOUTS, DOWNTOWN_MAPS_URL, DOWNTOWN_MIX, DOWNTOWN_PLANS, DUBAI_DOCS, TRESORA_FLOORS,
  TRESORA_FROM_AED, TRESORA_PLAN_4060, TRESORA_PLAN_PHPP, TRESORA_PRICES, docBytes, dubaiImage, usdFromAed,
} from "../dubai-projects-data.js";
import { formatUsdOnly } from "../currency.js";
import { CONTACT } from "../contact-copy.js";
import { LashaArrow, routeLinkClick, useHeroCopyFitsScreen } from "./LashaHomeSections.jsx";
import { Lightbox } from "./ReveranceProjectInfo.jsx";
import { ScrollDownCue } from "./ScrollDownCue.jsx";
import "./reverance-project.css";
import "./dubai-projects.css";

// TRESORA by WADAN and SAMANA Downtown One, each on its own page: #tresora and #downtown-one, with
// sections at #tresora/prices and the like. Copy from the two DOCX briefs (22 October 2026), facts,
// renders, plans and downloads from the developers' source packet (23 October 2026). Renders are the
// developers' own, labelled as renderings; plans open whole and unscaled-down in the lightbox, with
// the original PDF to download. Every request button is an email to AiXESS that names the project and
// the request, the same route as Reverance's materials request (the Vercel site has no form server).

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useDubaiCopy(key) {
  const { locale } = useLanguage();
  const copy = DUBAI_PROJECTS_COPY[locale] || DUBAI_PROJECTS_COPY.en;
  const sources = DUBAI_SOURCES_COPY[locale] || DUBAI_SOURCES_COPY.en;
  return { locale, common: copy.common, project: key ? copy[key] : null, all: copy, labels: sources.common, extra: key ? sources[key] : null };
}

// Figures in the page's language: AED exactly as supplied, US dollars derived at the dirham's peg.
function useFormat() {
  const { locale } = useLanguage();
  const dateLocale = locale === "en" ? "en-GB" : locale;
  const aed = (value) => new Intl.NumberFormat(locale, { style: "currency", currency: "AED", minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value);
  const usd = (aedValue) => formatUsdOnly(usdFromAed(aedValue), locale);
  const pct = (value) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value / 100);
  const number = (value) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const day = (iso) => new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const month = (iso) => new Intl.DateTimeFormat(dateLocale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}-01T00:00:00Z`));
  // {{price}} is TRESORA's 40/60 starting price, {{studio}} DOWNTOWN ONE's studio launch price.
  const text = (value) => value
    .replace("{{price}}", usd(TRESORA_FROM_AED))
    .replace("{{studio}}", usd(DOWNTOWN_MIX[0].fromAed))
    .replace(/\{\{pct:(\d+)\}\}/g, (_, n) => pct(Number(n)));
  return { aed, usd, pct, number, day, month, text, locale };
}

// An email to AiXESS's verified address, already naming the project, its location and the request.
export function projectMailto(common, project, request) {
  const mail = common.mail;
  const name = project.hero.title.join(" ");
  const subject = mail.subject.replace("{{project}}", name).replace("{{request}}", request);
  const body = [`${mail.project}: ${name}`, `${mail.location}: ${project.place}`, `${mail.request}: ${request}`, "", `${mail.name}:`, `${mail.phone}:`, `${mail.message}:`, ""].join("\r\n");
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function RequestButton({ common, project, request, label, primary = false }) {
  return (
    <a className={`button ${primary ? "button-primary" : "button-ghost"}`} href={projectMailto(common, project, request)} aria-label={`${label} (${common.opensEmail})`}>
      {label}<LashaArrow length={24} />
    </a>
  );
}

function RequestLink({ common, project, request, label }) {
  return (
    <a className="dp-inline-link" href={projectMailto(common, project, request)} aria-label={`${label} (${common.opensEmail})`}>
      {label}<LashaArrow length={20} />
    </a>
  );
}

// A direct link to one of the developers' original PDFs, with its size.
function DownloadButton({ href, label, labels, primary = false }) {
  const { locale } = useLanguage();
  const megabytes = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(docBytes(href) / 1e6);
  return (
    <a className={`button ${primary ? "button-primary" : "button-ghost"} dp-download`} href={href} download aria-label={`${label} (${labels.pdf}, ${megabytes} MB)`}>
      {label}<span className="dp-download-size" aria-hidden="true">{labels.pdf} · {megabytes} MB</span><LashaArrow length={24} />
    </a>
  );
}

function Picture({ slug, alt = "", sizes, className, eager = false }) {
  const image = dubaiImage(slug);
  return <img className={className} src={image.src} srcSet={image.srcSet} sizes={sizes} width={image.width} height={image.height} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" />;
}

// Scrolls to a section of the page and moves focus there, keeping the page's own route in the address.
function scrollToSection(route, section, behavior) {
  const target = document.getElementById(`${route}-${section}`);
  if (!target) return false;
  target.scrollIntoView({ behavior: behavior || (reducedMotion() ? "auto" : "smooth"), block: "start" });
  const focusTarget = target.matches("h2, p") ? target : target.querySelector("h2") || target;
  if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
  focusTarget.focus({ preventScroll: true });
  return true;
}

function sectionLinkClick(route, section) {
  return (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}#${route}/${section}`);
    scrollToSection(route, section);
  };
}

// "#tresora/prices" opens the page at that section (shared links, reload, Back and Forward).
function useSectionFromHash(route) {
  useEffect(() => {
    const timers = [];
    const scrollFromHash = () => {
      const [page, section] = window.location.hash.replace(/^#/, "").toLowerCase().split("/");
      if (page !== route || !section || !document.getElementById(`${route}-${section}`)) return;
      timers.push(window.setTimeout(() => scrollToSection(route, section, "auto"), 60));
      timers.push(window.setTimeout(() => scrollToSection(route, section, "auto"), 700));
    };
    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    window.addEventListener("popstate", scrollFromHash);
    return () => {
      window.removeEventListener("hashchange", scrollFromHash);
      window.removeEventListener("popstate", scrollFromHash);
      timers.forEach(window.clearTimeout);
    };
  }, [route]);
}

// One lightbox per page: open(items, index) shows a set of images; focus returns to the trigger.
function useLightbox(labels) {
  const [state, setState] = useState(null);
  const trigger = useRef(null);
  const open = useCallback((items, index, event) => { trigger.current = event?.currentTarget ?? null; setState({ items, index }); }, []);
  const close = useCallback(() => {
    setState(null);
    window.setTimeout(() => trigger.current?.focus({ preventScroll: true }), 0);
  }, []);
  const step = useCallback((delta) => setState((current) => current && { ...current, index: (current.index + delta + current.items.length) % current.items.length }), []);
  const lightbox = state ? <Lightbox items={state.items} index={state.index} onClose={close} onStep={step} labels={labels.lightbox} /> : null;
  return { open, lightbox };
}

// A lightbox item: [caption, image sources, description, link to the full-size file].
function lightboxItem(slug, caption, alt, labels) {
  const image = dubaiImage(slug);
  const extra = <a className="dp-lightbox-full" href={image.full} target="_blank" rel="noopener noreferrer" aria-label={`${labels.openFull} (${labels.opensNewTab})`}>{labels.openFull}</a>;
  return [caption, image, alt, extra];
}

// The page hero: copy on the theme's ground, the developer's rendering beside it (above it on phones),
// so no text ever sits on the photograph. Fills the first screen with the scroll-down cue at its foot.
function ProjectHero({ header, route, eyebrow, hero, developer, labels, image, imageAlt, children }) {
  const ref = useRef(null);
  const { locale } = useLanguage();
  useHeroCopyFitsScreen(ref, locale);
  return (
    <section ref={ref} className="lasha-page-hero lasha-page-hero-type dp-hero dp-hero-media" aria-labelledby={`${route}-title`}>
      {header}
      <figure className="dp-hero-figure">
        <Picture slug={image} alt={imageAlt} sizes="(max-width: 1099px) 100vw, 36vw" eager />
        <figcaption>{labels.rendering}</figcaption>
      </figure>
      <div className="lasha-page-hero-copy dp-hero-copy">
        <div className="dp-hero-head">
          <p className="lasha-eyebrow">{eyebrow}</p>
          <h1 className="lasha-page-hero-title" id={`${route}-title`}>{hero.title.map((line) => <span key={line}>{line}</span>)}</h1>
          <p className="dp-hero-subtitle">{hero.subtitle}</p>
          <p className="dp-hero-tagline">{hero.tagline}</p>
          <p className="dp-hero-developer">{labels.developedBy} <strong>{developer}</strong></p>
        </div>
        <div className="dp-hero-side">{children}</div>
      </div>
      <div className="lasha-page-hero-cue"><ScrollDownCue /></div>
    </section>
  );
}

function SectionHeading({ id, eyebrow, title, lead }) {
  return (
    <header className="rp-heading">
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2 id={id}>{title}</h2>
      {lead && <p className="rp-lead">{lead}</p>}
    </header>
  );
}

// The asterisk on a figure points to the note that qualifies it.
function Qualified({ value, route, section, label }) {
  return <>{value}<a className="dp-mark" href={`#${route}/${section}`} aria-label={label} onClick={sectionLinkClick(route, section)}>*</a></>;
}

function HeroFacts({ facts, format, route, noteSection, noteId, priceNote }) {
  return (
    <dl className="dp-hero-facts">
      {facts.map(([label, text, flag]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd aria-describedby={flag === "price" ? noteId : undefined}>
            {flag === "price" ? <Qualified value={format.text(text)} route={route} section={noteSection} label={priceNote} /> : format.text(text)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// A captioned rendering that opens larger.
function RenderFigure({ slug, caption, alt, labels, onOpen, sizes, className = "" }) {
  return (
    <figure className={`dp-figure ${className}`}>
      <button type="button" onClick={(event) => onOpen([lightboxItem(slug, caption, alt, labels)], 0, event)} aria-label={`${labels.viewLarger}: ${alt}`}>
        <Picture slug={slug} sizes={sizes} />
      </button>
      <figcaption><span>{caption}</span> <span className="dp-figure-kind">{labels.rendering}</span></figcaption>
    </figure>
  );
}

function Gallery({ items, labels, onOpen }) {
  const set = items.map(([slug, caption, alt]) => lightboxItem(slug, caption, alt, labels));
  return (
    <ul className="rp-gallery dp-gallery">
      {items.map(([slug, caption, alt], index) => (
        <li key={slug}>
          <button type="button" onClick={(event) => onOpen(set, index, event)} aria-label={`${labels.viewLarger}: ${alt}`}>
            <Picture slug={slug} sizes="(max-width: 599px) calc(100vw - 2.5rem), (max-width: 1099px) 46vw, 31vw" />
            <span className="rp-gallery-label">{caption}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// A technical plan: shown whole (contain, never cropped), opening at full size.
function PlanCard({ slug, thumb, title, text, alt, labels, onOpen, set, index, children }) {
  return (
    <li className="dp-plan">
      <button type="button" className="dp-plan-image" onClick={(event) => onOpen(set, index, event)} aria-label={`${labels.viewLarger}: ${title}`}>
        <Picture slug={thumb || slug} alt={alt || ""} sizes="(max-width: 599px) calc(100vw - 2.5rem), (max-width: 1099px) 46vw, 31vw" />
      </button>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </li>
  );
}

export function TresoraPage({ header }) {
  const route = "tresora";
  const { common, project, labels, extra } = useDubaiCopy("tresora");
  const format = useFormat();
  const { open, lightbox } = useLightbox(labels);
  useSectionFromHash(route);
  const { hero, discover, highlights, spaces, lifestyle, location, payment, more } = project;
  const { prices, floors, plans } = extra;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;
  const floorSet = TRESORA_FLOORS.map((number) => lightboxItem(`tresora-floor-${number}`, floors.items[number][0], floors.items[number][1], labels));
  const priceCell = (value) => (value === null ? <span className="dp-price-none">{prices.noPrice}</span> : <><strong>{format.usd(value)}</strong><span>{format.aed(value)}</span></>);

  return (
    <>
      <ProjectHero header={header} route={route} eyebrow={common.eyebrow} hero={hero} developer={extra.developer} labels={labels} image="tresora-tower" imageAlt={extra.heroAlt}>
        <p className="lasha-page-hero-text">{hero.intro}</p>
        <HeroFacts facts={hero.facts} format={format} route={route} noteSection="currency" noteId="tresora-currency" priceNote={hero.priceNote} />
        <div className="it-hero-actions">
          <a className="button button-primary" href={`#${route}/spaces`} onClick={sectionLinkClick(route, "spaces")}>{hero.explore}<LashaArrow length={24} /></a>
          <RequestButton common={common} project={project} request={common.requests.availability} label={hero.availability} />
        </div>
      </ProjectHero>

      <main className="page-main dp-page">
        <section className="rp-section" id="tresora-discover" aria-labelledby="tresora-discover-title">
          <SectionHeading id="tresora-discover-title" eyebrow={discover.eyebrow} title={discover.title} />
          <div className="dp-media-split">
            <div className="dp-columns dp-columns-1">{discover.body.map((text) => <p key={text}>{text}</p>)}</div>
            <RenderFigure slug="tresora-facade" caption={extra.facade[0]} alt={extra.facade[1]} labels={labels} onOpen={open} sizes="(max-width: 899px) calc(100vw - 2.5rem), 46vw" />
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-highlights" aria-labelledby="tresora-highlights-title">
          <SectionHeading id="tresora-highlights-title" eyebrow={highlights.eyebrow} title={highlights.title} />
          <dl className="dp-cards">
            {highlights.items.map(([text, label]) => (
              <div key={label}><dd>{text}</dd><dt>{label}</dt></div>
            ))}
          </dl>
        </section>

        <section className="rp-section" id="tresora-spaces" aria-labelledby="tresora-spaces-title">
          <SectionHeading id="tresora-spaces-title" eyebrow={spaces.eyebrow} title={spaces.title} />
          <div className="dp-columns dp-columns-2">{spaces.body.map((text) => <p key={text}>{text}</p>)}</div>
          <h3 className="rp-subtitle">{spaces.listTitle}</h3>
          <ul className="rp-benefits dp-categories">
            {spaces.categories.map((name, index) => (
              <li key={name}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h4>{name}</h4></li>
            ))}
          </ul>
          <p className="rp-note">{spaces.note}</p>
          <div className="rp-actions">
            <RequestButton common={common} project={project} request={common.requests.units} label={spaces.units} primary />
            <RequestButton common={common} project={project} request={common.requests.prices} label={spaces.prices} />
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-prices" aria-labelledby="tresora-prices-title">
          <SectionHeading id="tresora-prices-title" eyebrow={prices.eyebrow} title={prices.title} lead={prices.lead} />
          <div className="dp-table-wrap">
            <table className="dp-table dp-price-table">
              <thead>
                <tr>{prices.columns.map((name) => <th key={name} scope="col">{name}</th>)}</tr>
              </thead>
              <tbody>
                {TRESORA_PRICES.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">
                      {prices.rows[row.key]}
                      <RequestLink common={common} project={project} request={`${common.requests.prices}: ${prices.rows[row.key]}`} label={`${labels.askAbout} ${prices.rows[row.key]}`} />
                    </th>
                    <td data-label={prices.columns[1]}>{row.sizes.map(format.number).join("–")} {labels.sqft}</td>
                    <td data-label={prices.columns[2]}>{priceCell(row.plan4060)}</td>
                    <td data-label={prices.columns[3]}>{priceCell(row.phpp)}</td>
                    <td data-label={prices.columns[4]}>{priceCell(row.upfront)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dp-table-after">{prices.onRequest}</p>
          <ul className="dp-notes">{prices.notes.map((note) => <li key={note}>{note}</li>)}</ul>
          <div className="dp-terms" id="tresora-currency">
            <p>{highlights.currency}</p>
            <p>{labels.conversion}</p>
          </div>
        </section>

        <section className="rp-section" id="tresora-floors" aria-labelledby="tresora-floors-title">
          <SectionHeading id="tresora-floors-title" eyebrow={floors.eyebrow} title={floors.title} lead={floors.lead} />
          <ul className="dp-plans">
            {TRESORA_FLOORS.map((number, index) => (
              <PlanCard key={number} slug={`tresora-floor-${number}`} title={floors.items[number][0]} text={floors.items[number][1]} alt={floors.items[number][1]} labels={labels} onOpen={open} set={floorSet} index={index} />
            ))}
          </ul>
          <p className="rp-note">{floors.disclaimer}</p>
          <div className="rp-actions">
            <DownloadButton href={DUBAI_DOCS.tresoraFloorPlans} label={floors.download} labels={labels} primary />
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-lifestyle" aria-labelledby="tresora-lifestyle-title">
          <SectionHeading id="tresora-lifestyle-title" eyebrow={lifestyle.eyebrow} title={lifestyle.title} lead={lifestyle.lead} />
          <div className="dp-media-split dp-media-split-reverse">
            <ul className="dp-list dp-list-2">
              {lifestyle.amenities.map((name, index) => (
                <li key={name}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{name}</li>
              ))}
            </ul>
            <RenderFigure slug="tresora-pool" caption={extra.pool[0]} alt={extra.pool[1]} labels={labels} onOpen={open} sizes="(max-width: 899px) calc(100vw - 2.5rem), 46vw" />
          </div>
        </section>

        <section className="rp-section" id="tresora-location" aria-labelledby="tresora-location-title">
          <SectionHeading id="tresora-location-title" eyebrow={location.eyebrow} title={location.title} />
          <div className="rp-split dp-split">
            <div>
              {location.body.map((text) => <p className="dp-text" key={text}>{text}</p>)}
              <h3 className="dp-list-title">{location.nearbyTitle}</h3>
              <ul className="dp-list dp-list-1">
                {location.nearby.map((name) => <li key={name}>{name}</li>)}
              </ul>
              <div className="rp-actions">
                <a className="button button-primary" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${location.explore} (${common.opensMaps})`}>{location.explore}<LashaArrow length={24} /></a>
              </div>
            </div>
            <figure className="dp-figure dp-map">
              <button type="button" onClick={(event) => open([lightboxItem("tresora-map", extra.map[0], extra.map[1], labels)], 0, event)} aria-label={`${labels.viewLarger}: ${extra.map[0]}`}>
                <Picture slug="tresora-map" alt={extra.map[1]} sizes="(max-width: 899px) calc(100vw - 2.5rem), 40vw" />
              </button>
              <figcaption>{extra.map[0]}</figcaption>
            </figure>
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-payment" aria-labelledby="tresora-payment-title">
          <SectionHeading id="tresora-payment-title" eyebrow={payment.eyebrow} title={payment.title} />
          <div className="dp-columns">{payment.body.map((text) => <p key={text}>{text}</p>)}</div>
          <div className="dp-plans-pay">
            <article className="dp-pay" aria-labelledby="tresora-plan-4060">
              <h3 id="tresora-plan-4060">{plans.title4060}</h3>
              <p className="dp-pay-lead">{plans.lead4060}</p>
              <table className="dp-table dp-schedule">
                <thead><tr><th scope="col">{plans.date}</th><th scope="col">{plans.payment}</th></tr></thead>
                <tbody>
                  {TRESORA_PLAN_4060.map(([when, value]) => (
                    <tr key={when}>
                      <th scope="row">{when === "booking" ? plans.booking : when === "completion" ? plans.completion : format.day(when)}</th>
                      <td>{format.pct(value)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><th scope="row">{labels.total}</th><td>{format.pct(TRESORA_PLAN_4060.reduce((sum, [, value]) => sum + value, 0))}</td></tr></tfoot>
              </table>
            </article>
            <article className="dp-pay dp-pay-wide" aria-labelledby="tresora-plan-phpp">
              <h3 id="tresora-plan-phpp">{plans.titlePhpp}</h3>
              <p className="dp-pay-lead">{plans.leadPhpp}</p>
              <div className="dp-phases">
                <table className="dp-table dp-schedule">
                  <caption className="dp-caption-spacer" aria-hidden="true">{plans.down}</caption>
                  <tbody><tr><th scope="row">{plans.down}</th><td>{format.pct(TRESORA_PLAN_PHPP.down)}</td></tr></tbody>
                </table>
                {[["toCompletion", TRESORA_PLAN_PHPP.toCompletion], ["afterCompletion", TRESORA_PLAN_PHPP.afterCompletion]].map(([phase, rows]) => (
                  <table className="dp-table dp-schedule" key={phase}>
                    <caption>{plans[phase]}</caption>
                    <tbody>
                      {rows.map(([when, value, mark]) => (
                        <tr key={when}>
                          <th scope="row">{format.month(when)}{mark && <span className="dp-schedule-mark"> · {plans.completionShort}</span>}</th>
                          <td>{format.pct(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><th scope="row">{labels.total}</th><td>{format.pct(rows.reduce((sum, [, value]) => sum + value, 0))}</td></tr></tfoot>
                  </table>
                ))}
              </div>
            </article>
          </div>
          <p className="rp-note">{plans.source}</p>
          <div className="rp-actions">
            <RequestButton common={common} project={project} request={plans.request} label={plans.ask} primary />
            <DownloadButton href={DUBAI_DOCS.tresoraPaymentPlan} label={plans.download} labels={labels} />
          </div>
        </section>

        <section className="rp-section dp-closing" id="tresora-more" aria-labelledby="tresora-more-title">
          <SectionHeading id="tresora-more-title" eyebrow={more.eyebrow} title={more.title} />
          <div className="dp-columns dp-columns-2">{more.body.map((text) => <p key={text}>{text}</p>)}</div>
          <div className="rp-actions">
            <RequestButton common={common} project={project} request={common.requests.contact} label={more.contact} primary />
            <RequestButton common={common} project={project} request={common.requests.details} label={more.details} />
          </div>
        </section>
      </main>
      {lightbox}
    </>
  );
}

function LayoutViewer({ copy, labels, onOpen }) {
  const [filter, setFilter] = useState("all");
  const shown = DOWNTOWN_LAYOUTS.filter(([, kind]) => filter === "all" || kind === filter);
  const set = shown.map(([page]) => lightboxItem(`downtown-layout-${page}`, copy.types[page], copy.planAlt.replace("{{type}}", copy.types[page]), labels));
  return (
    <div className="dp-layouts">
      <h3 className="rp-subtitle" id="downtown-one-layouts-title">{copy.title}</h3>
      <p className="dp-text">{copy.lead}</p>
      <div className="dp-filter" role="group" aria-label={copy.filterLabel}>
        {Object.entries(copy.filters).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      <ul className="dp-plans dp-plans-layouts" aria-labelledby="downtown-one-layouts-title">
        {shown.map(([page], index) => (
          <PlanCard key={page} slug={`downtown-layout-${page}`} thumb={`downtown-layout-${page}-plan`} title={copy.types[page]} alt={copy.planAlt.replace("{{type}}", copy.types[page])} labels={labels} onOpen={onOpen} set={set} index={index} />
        ))}
      </ul>
      <p className="rp-note">{copy.noAreas}</p>
      <p className="rp-note">{copy.disclaimer}</p>
    </div>
  );
}

export function DowntownOnePage({ header }) {
  const route = "downtown-one";
  const { common, project, labels, extra } = useDubaiCopy("downtown");
  const format = useFormat();
  const { open, lightbox } = useLightbox(labels);
  useSectionFromHash(route);
  const { hero, highlights, amenities, location, more } = project;
  const { residences, layouts, payment, gallery, amenityGallery, levels } = extra;
  const levelSet = [
    lightboxItem("downtown-plan-podium", levels.podium[0], levels.podium[1], labels),
    lightboxItem("downtown-plan-roof", levels.roof[0], levels.roof[1], labels),
  ];

  return (
    <>
      <ProjectHero header={header} route={route} eyebrow={common.eyebrow} hero={hero} developer={extra.developer} labels={labels} image="downtown-tower" imageAlt={extra.heroAlt}>
        {hero.body.map((text) => <p className="lasha-page-hero-text" key={text}>{text}</p>)}
        <HeroFacts facts={hero.facts} format={format} route={route} noteSection="residences" noteId="downtown-one-mix-note" priceNote={residences.note} />
        <div className="it-hero-actions">
          <a className="button button-primary" href={`#${route}/residences`} onClick={sectionLinkClick(route, "residences")}>{hero.explore}<LashaArrow length={24} /></a>
          <RequestButton common={common} project={project} request={common.requests.availability} label={hero.availability} />
        </div>
      </ProjectHero>

      <main className="page-main dp-page">
        <section className="rp-section" id="downtown-one-highlights" aria-labelledby="downtown-one-highlights-title">
          <SectionHeading id="downtown-one-highlights-title" eyebrow={highlights.eyebrow} title={highlights.title} />
          <ul className="dp-cards dp-cards-3">
            {highlights.items.map(([text, title, line]) => (
              <li key={title}>
                <strong>{format.text(text)}</strong>
                <h3>{title}</h3>
                <p>{line}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rp-section rp-mist" id="downtown-one-residences" aria-labelledby="downtown-one-residences-title">
          <SectionHeading id="downtown-one-residences-title" eyebrow={residences.eyebrow} title={residences.title} lead={residences.lead} />
          <div className="dp-table-wrap">
            <table className="dp-table dp-mix-table">
              <thead><tr>{residences.columns.map((name) => <th key={name} scope="col">{name}</th>)}</tr></thead>
              <tbody>
                {DOWNTOWN_MIX.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">
                      {residences.rows[row.key]}
                      <RequestLink common={common} project={project} request={`${common.requests.prices}: ${residences.rows[row.key]}`} label={`${labels.askAbout} ${residences.rows[row.key]}`} />
                    </th>
                    <td data-label={residences.columns[1]}>{format.number(row.units)}</td>
                    <td data-label={residences.columns[2]}><strong>{format.usd(row.fromAed)}</strong><span>{format.aed(row.fromAed)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dp-terms" id="downtown-one-mix-note">
            <p>{residences.note}</p>
            <p>{labels.conversion}</p>
          </div>
          <LayoutViewer copy={layouts} labels={labels} onOpen={open} />
          <div className="rp-actions">
            <DownloadButton href={DUBAI_DOCS.downtownBrochure} label={extra.downloads.brochure} labels={labels} primary />
            <RequestButton common={common} project={project} request={layouts.title} label={layouts.ask} />
          </div>
        </section>

        <section className="rp-section" id="downtown-one-payment" aria-labelledby="downtown-one-payment-title">
          <SectionHeading id="downtown-one-payment-title" eyebrow={payment.eyebrow} title={payment.title} lead={payment.lead} />
          <div className="dp-table-wrap">
            <table className="dp-table dp-schedule dp-compare">
              <thead>
                <tr><td />{DOWNTOWN_PLANS.map((plan) => <th key={plan.key} scope="col">{payment.plans[plan.key]}</th>)}</tr>
              </thead>
              <tbody>
                <tr><th scope="row">{payment.down}</th>{DOWNTOWN_PLANS.map((plan) => <td key={plan.key}>{format.pct(plan.down)}</td>)}</tr>
                <tr><th scope="row">{payment.month6}<span className="dp-schedule-mark">{payment.milestone}</span></th>{DOWNTOWN_PLANS.map((plan) => <td key={plan.key}>+{format.pct(plan.month6)}</td>)}</tr>
                <tr><th scope="row">{payment.month12}<span className="dp-schedule-mark">{payment.milestone}</span></th>{DOWNTOWN_PLANS.map((plan) => <td key={plan.key}>+{format.pct(plan.month12)}</td>)}</tr>
                <tr><th scope="row">{payment.monthly}</th>{DOWNTOWN_PLANS.map((plan) => <td key={plan.key}>{format.pct(plan.monthly)} × {format.number(plan.months)}<span className="dp-schedule-mark">{payment.months.replace("{{n}}", format.number(plan.months))}</span></td>)}</tr>
              </tbody>
              <tfoot>
                <tr><th scope="row">{payment.total}</th>{DOWNTOWN_PLANS.map((plan) => <td key={plan.key}>{format.pct(plan.down + plan.month6 + plan.month12 + plan.monthly * plan.months)}</td>)}</tr>
              </tfoot>
            </table>
          </div>
          <p className="rp-note">{payment.note}</p>
          <div className="rp-actions">
            <RequestButton common={common} project={project} request={payment.request} label={payment.ask} primary />
            <DownloadButton href={DUBAI_DOCS.downtownFactbook} label={extra.downloads.factbook} labels={labels} />
          </div>
        </section>

        <section className="rp-section rp-mist" id="downtown-one-amenities" aria-labelledby="downtown-one-amenities-title">
          <SectionHeading id="downtown-one-amenities-title" eyebrow={amenities.eyebrow} title={amenities.title} />
          <div className="dp-columns dp-columns-2">{amenities.body.map((text) => <p key={text}>{text}</p>)}</div>
          <div className="dp-groups">
            {amenities.groups.map(([group, items]) => (
              <section key={group} aria-label={group}>
                <h3>{group}</h3>
                <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
          </div>
          <h3 className="rp-subtitle">{levels.title}</h3>
          <ul className="dp-plans dp-plans-2">
            {[["downtown-plan-podium", levels.podium], ["downtown-plan-roof", levels.roof]].map(([slug, [title, text]], index) => (
              <PlanCard key={slug} slug={slug} title={title} text={text} alt={text} labels={labels} onOpen={open} set={levelSet} index={index} />
            ))}
          </ul>
          <p className="rp-note">{levels.community}</p>
          <h3 className="rp-subtitle">{amenityGallery.title}</h3>
          <Gallery items={amenityGallery.items} labels={labels} onOpen={open} />
        </section>

        <section className="rp-section" id="downtown-one-gallery" aria-labelledby="downtown-one-gallery-title">
          <SectionHeading id="downtown-one-gallery-title" eyebrow={gallery.eyebrow} title={gallery.title} />
          <Gallery items={gallery.items} labels={labels} onOpen={open} />
          <p className="rp-note">{gallery.note}</p>
        </section>

        <section className="rp-section rp-mist" id="downtown-one-location" aria-labelledby="downtown-one-location-title">
          <SectionHeading id="downtown-one-location-title" eyebrow={location.eyebrow} title={location.title} />
          <div className="rp-split dp-split">
            <div>
              {location.body.map((text) => <p className="dp-text" key={text}>{text}</p>)}
              <p className="dp-text">{extra.location.area}</p>
              <h3 className="dp-list-title">{extra.location.highlightsTitle}</h3>
              <ul className="dp-list dp-list-1">{extra.location.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="rp-actions">
                <a className="button button-primary" href={DOWNTOWN_MAPS_URL} target="_blank" rel="noopener noreferrer" aria-label={`${extra.location.maps} (${common.opensMaps})`}>{extra.location.maps}<LashaArrow length={24} /></a>
              </div>
            </div>
            <div>
              <h3 className="dp-list-title">{location.nearbyTitle}</h3>
              <dl className="dp-nearby">
                {location.nearby.map(([time, places]) => (
                  <div key={time}><dt>{time}</dt><dd>{places}</dd></div>
                ))}
              </dl>
              <p className="rp-note">{extra.location.travelNote}</p>
              <figure className="dp-figure dp-map">
                <button type="button" onClick={(event) => open([lightboxItem("downtown-map", extra.location.map[0], extra.location.map[1], labels)], 0, event)} aria-label={`${labels.viewLarger}: ${extra.location.map[0]}`}>
                  <Picture slug="downtown-map" alt={extra.location.map[1]} sizes="(max-width: 899px) calc(100vw - 2.5rem), 40vw" />
                </button>
                <figcaption>{extra.location.map[0]}</figcaption>
              </figure>
            </div>
          </div>
          <p className="rp-bridge">{location.closing}</p>
        </section>

        <section className="rp-section dp-closing" id="downtown-one-more" aria-labelledby="downtown-one-more-title">
          <SectionHeading id="downtown-one-more-title" eyebrow={more.eyebrow} title={more.title} />
          <div className="dp-columns dp-columns-2">{more.body.map((text) => <p key={text}>{text}</p>)}</div>
          <div className="rp-actions">
            <RequestButton common={common} project={project} request={common.requests.contact} label={more.contact} primary />
          </div>
        </section>
      </main>
      {lightbox}
    </>
  );
}

// The homepage's Dubai cards, under the Batumi project: one per project, each opening its own page.
export function DubaiProjectCards({ onNavigate }) {
  const { common, all } = useDubaiCopy();
  const { locale } = useLanguage();
  const sources = DUBAI_SOURCES_COPY[locale] || DUBAI_SOURCES_COPY.en;
  const cards = [["tresora", all.tresora, "tresora-tower", sources.tresora], ["downtown-one", all.downtown, "downtown-street", sources.downtown]];
  return (
    <section className="dp-listing" id="dubai-projects" aria-labelledby="dubai-projects-title">
      <p className="lasha-eyebrow">{common.listEyebrow}</p>
      <h2 id="dubai-projects-title">{common.listTitle}</h2>
      <ul className="dp-listing-cards">
        {cards.map(([route, project, image, extra]) => (
          <li key={route}>
            <article aria-labelledby={`${route}-card-title`}>
              <Picture slug={image} className="dp-listing-image" sizes="(max-width: 899px) calc(100vw - 2.5rem), 44vw" />
              <p className="dp-listing-category">{common.category} · {extra.developer}</p>
              <h3 id={`${route}-card-title`}>{project.cardName}</h3>
              <p className="dp-listing-line">{project.cardLine}</p>
              <p className="dp-listing-meta">{project.place}<br />{project.cardStatus}</p>
              <a className="lasha-button lasha-button-primary" href={`#${route}`} onClick={routeLinkClick(onNavigate, route)} aria-label={`${common.exploreProject}: ${project.cardName}`}>
                {common.exploreProject}<LashaArrow length={26} />
              </a>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
