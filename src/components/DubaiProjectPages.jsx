import { useEffect, useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { DUBAI_PROJECTS_COPY, TRESORA_PRICE_USD } from "../dubai-projects-copy.js";
import { formatUsdOnly } from "../currency.js";
import { CONTACT } from "../contact-copy.js";
import { LashaArrow, routeLinkClick, useHeroCopyFitsScreen } from "./LashaHomeSections.jsx";
import { ScrollDownCue } from "./ScrollDownCue.jsx";
import "./reverance-project.css";
import "./dubai-projects.css";

// TRESORA and DOWNTOWN ONE (Kemo, 22 October 2026), each on its own page: #tresora and #downtown-one,
// with sections at #tresora/spaces and the like. Neither brief came with renders, amenity photos,
// a brochure, floor plans or a map pin, so the pages are set in type only: no stand-in photo of
// another building, no empty image frames. Every request button is an email to AiXESS that names the
// project and the request, the same route as Reverance's materials request (the Vercel site has no
// form server).

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useDubaiCopy(key) {
  const { locale } = useLanguage();
  const copy = DUBAI_PROJECTS_COPY[locale] || DUBAI_PROJECTS_COPY.en;
  return { locale, common: copy.common, project: key ? copy[key] : null, all: copy };
}

// {{price}} is TRESORA's starting price in US dollars, {{pct:N}} a percentage in the page's language.
function useValue() {
  const { locale } = useLanguage();
  return (text) => text
    .replace("{{price}}", formatUsdOnly(TRESORA_PRICE_USD, locale))
    .replace(/\{\{pct:(\d+)\}\}/g, (_, value) => new Intl.NumberFormat(locale, { style: "percent" }).format(Number(value) / 100));
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

// "#tresora/spaces" opens the page at that section (shared links, reload, Back and Forward).
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

// The page hero in type alone: no photo exists for either project, so it stands on the theme's pale
// ground (night: near-black) and still fills the first screen with the scroll-down cue at its foot.
function ProjectHero({ header, route, eyebrow, hero, children }) {
  const ref = useRef(null);
  const { locale } = useLanguage();
  useHeroCopyFitsScreen(ref, locale);
  return (
    <section ref={ref} className="lasha-page-hero lasha-page-hero-type dp-hero" aria-labelledby={`${route}-title`}>
      {header}
      <div className="lasha-page-hero-copy dp-hero-copy">
        <div className="dp-hero-head">
          <p className="lasha-eyebrow">{eyebrow}</p>
          <h1 className="lasha-page-hero-title" id={`${route}-title`}>{hero.title.map((line) => <span key={line}>{line}</span>)}</h1>
          <p className="dp-hero-subtitle">{hero.subtitle}</p>
          <p className="dp-hero-tagline">{hero.tagline}</p>
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
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {lead && <p className="rp-lead">{lead}</p>}
    </header>
  );
}

// The asterisk on a figure points to the note that qualifies it.
function Qualified({ value, route, section, label }) {
  return <>{value}<a className="dp-mark" href={`#${route}/${section}`} aria-label={label} onClick={sectionLinkClick(route, section)}>*</a></>;
}

export function TresoraPage({ header }) {
  const route = "tresora";
  const { common, project } = useDubaiCopy("tresora");
  const value = useValue();
  useSectionFromHash(route);
  const { hero, discover, highlights, spaces, lifestyle, location, payment, more } = project;
  const priceMark = (text) => <Qualified value={value(text)} route="tresora" section="currency" label={hero.priceNote} />;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;

  return (
    <>
      <ProjectHero header={header} route={route} eyebrow={common.eyebrow} hero={hero}>
        <p className="lasha-page-hero-text">{hero.intro}</p>
        <dl className="dp-hero-facts">
          {hero.facts.map(([label, text, flag]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd aria-describedby={flag === "price" ? "tresora-currency" : undefined}>{flag === "price" ? priceMark(text) : value(text)}</dd>
            </div>
          ))}
        </dl>
        <div className="it-hero-actions">
          <a className="button button-primary" href={`#${route}/spaces`} onClick={sectionLinkClick(route, "spaces")}>{hero.explore}<LashaArrow length={24} /></a>
          <RequestButton common={common} project={project} request={common.requests.availability} label={hero.availability} />
        </div>
      </ProjectHero>

      <main className="page-main dp-page">
        <section className="rp-section" id="tresora-discover" aria-labelledby="tresora-discover-title">
          <SectionHeading id="tresora-discover-title" eyebrow={discover.eyebrow} title={discover.title} />
          <div className="dp-columns">{discover.body.map((text) => <p key={text}>{text}</p>)}</div>
        </section>

        <section className="rp-section rp-mist" id="tresora-highlights" aria-labelledby="tresora-highlights-title">
          <SectionHeading id="tresora-highlights-title" eyebrow={highlights.eyebrow} title={highlights.title} />
          <dl className="dp-cards dp-cards-2">
            {highlights.items.map(([text, label, flag]) => (
              <div key={label}>
                <dd aria-describedby={flag === "price" ? "tresora-currency" : undefined}>{flag === "price" ? priceMark(text) : value(text)}</dd>
                <dt>{label}</dt>
              </div>
            ))}
          </dl>
          <p className="rp-note dp-terms" id="tresora-currency">{highlights.currency}</p>
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

        <section className="rp-section rp-mist" id="tresora-lifestyle" aria-labelledby="tresora-lifestyle-title">
          <SectionHeading id="tresora-lifestyle-title" eyebrow={lifestyle.eyebrow} title={lifestyle.title} lead={lifestyle.lead} />
          <ul className="dp-list dp-list-4">
            {lifestyle.amenities.map((name, index) => (
              <li key={name}><span className="rp-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{name}</li>
            ))}
          </ul>
        </section>

        <section className="rp-section" id="tresora-location" aria-labelledby="tresora-location-title">
          <SectionHeading id="tresora-location-title" eyebrow={location.eyebrow} title={location.title} />
          <div className="rp-split dp-split">
            <div>
              {location.body.map((text) => <p className="dp-text" key={text}>{text}</p>)}
              <div className="rp-actions">
                <a className="button button-primary" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${location.explore} (${common.opensMaps})`}>{location.explore}<LashaArrow length={24} /></a>
                <RequestButton common={common} project={project} request={common.requests.contact} label={location.contact} />
              </div>
            </div>
            <div>
              <h3 className="dp-list-title">{location.nearbyTitle}</h3>
              <ul className="dp-list dp-list-1">
                {location.nearby.map((name) => <li key={name}>{name}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="rp-section rp-mist" id="tresora-payment" aria-labelledby="tresora-payment-title">
          <SectionHeading id="tresora-payment-title" eyebrow={payment.eyebrow} title={payment.title} />
          <div className="dp-columns">{payment.body.map((text) => <p key={text}>{text}</p>)}</div>
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
    </>
  );
}

export function DowntownOnePage({ header }) {
  const route = "downtown-one";
  const { common, project } = useDubaiCopy("downtown");
  const value = useValue();
  useSectionFromHash(route);
  const { hero, highlights, amenities, location, more } = project;

  return (
    <>
      <ProjectHero header={header} route={route} eyebrow={common.eyebrow} hero={hero}>
        {hero.body.map((text) => <p className="lasha-page-hero-text" key={text}>{text}</p>)}
        <div className="it-hero-actions">
          <a className="button button-primary" href={`#${route}/highlights`} onClick={sectionLinkClick(route, "highlights")}>{hero.explore}<LashaArrow length={24} /></a>
          <RequestButton common={common} project={project} request={common.requests.availability} label={hero.availability} />
        </div>
        {/* No starting price was supplied, so the price is a request, never a figure. */}
        <p className="dp-hero-price">
          <strong>{hero.priceTitle}</strong> {hero.priceText}{" "}
          <a className="dp-inline-link" href={projectMailto(common, project, common.requests.currentPrices)} aria-label={`${hero.priceLink} (${common.opensEmail})`}>{hero.priceLink}<LashaArrow length={20} /></a>
        </p>
      </ProjectHero>

      <main className="page-main dp-page">
        <section className="rp-section" id="downtown-one-highlights" aria-labelledby="downtown-one-highlights-title">
          <SectionHeading id="downtown-one-highlights-title" eyebrow={highlights.eyebrow} title={highlights.title} />
          <ul className="dp-cards dp-cards-3">
            {highlights.items.map(([text, title, line, flag]) => (
              <li key={title}>
                <strong aria-describedby={flag === "terms" ? "downtown-one-terms" : undefined}>
                  {flag === "terms" ? <Qualified value={value(text)} route="downtown-one" section="terms" label={highlights.terms.replace(/^\*/, "")} /> : value(text)}
                </strong>
                <h3>{title}</h3>
                <p>{line}</p>
              </li>
            ))}
          </ul>
          <p className="rp-note dp-terms" id="downtown-one-terms">{highlights.terms}</p>
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
        </section>

        <section className="rp-section" id="downtown-one-location" aria-labelledby="downtown-one-location-title">
          <SectionHeading id="downtown-one-location-title" eyebrow={location.eyebrow} title={location.title} />
          <div className="rp-split dp-split">
            <div>{location.body.map((text) => <p className="dp-text" key={text}>{text}</p>)}</div>
            <div>
              <h3 className="dp-list-title">{location.nearbyTitle}</h3>
              <dl className="dp-nearby">
                {location.nearby.map(([time, places]) => (
                  <div key={time}><dt>{time}</dt><dd>{places}</dd></div>
                ))}
              </dl>
            </div>
          </div>
          <p className="rp-bridge">{location.closing}</p>
        </section>

        <section className="rp-section rp-mist dp-closing" id="downtown-one-more" aria-labelledby="downtown-one-more-title">
          <SectionHeading id="downtown-one-more-title" eyebrow={more.eyebrow} title={more.title} />
          <div className="dp-columns dp-columns-2">{more.body.map((text) => <p key={text}>{text}</p>)}</div>
          <div className="rp-actions">
            {/* No brochure file exists yet, so this asks AiXESS for it rather than linking a download. */}
            <RequestButton common={common} project={project} request={common.requests.brochure} label={more.brochure} primary />
            <RequestButton common={common} project={project} request={common.requests.contact} label={more.contact} />
          </div>
        </section>
      </main>
    </>
  );
}

// The homepage's Dubai cards, under the Batumi project: one per project, each opening its own page.
export function DubaiProjectCards({ onNavigate }) {
  const { common, all } = useDubaiCopy();
  const cards = [["tresora", all.tresora], ["downtown-one", all.downtown]];
  return (
    <section className="dp-listing" id="dubai-projects" aria-labelledby="dubai-projects-title">
      <p className="lasha-eyebrow">{common.listEyebrow}</p>
      <h2 id="dubai-projects-title">{common.listTitle}</h2>
      <ul className="dp-listing-cards">
        {cards.map(([route, project]) => (
          <li key={route}>
            <article aria-labelledby={`${route}-card-title`}>
              <p className="dp-listing-category">{common.category}</p>
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
