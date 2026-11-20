import { Fragment, useEffect, useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { DUBAI_PROJECTS_COPY } from "../dubai-projects-copy.js";
import { DUBAI_IMAGES_COPY } from "../dubai-projects-images-copy.js";
import { dubaiImage } from "../dubai-projects-data.js";
import { figmaPhoto } from "../data/figmaPhotos.js";
import { ThemedImage } from "./ThemedImage.jsx";
import { CONTACT } from "../contact-copy.js";
import { siteFormClick } from "../enquiry.js";
import { LashaArrow, routeLinkClick } from "./LashaHomeSections.jsx";
import { useWordFit } from "./useWordFit.js";
import "./reverance-project.css";
import "./dubai-projects.css";
import "./tresora-figma.css";
import "./downtown-figma.css";

// TRESORA and Downtown One, each on its own page: #tresora and #downtown-one, with sections at
// #tresora/spaces and the like. The Word briefs supply the base text and section order; Kemo's
// 27 October photos add TRESORA's starting prices and furnished-apartment inclusions.
// The developers' renderings stay as pictures, without captions. Every request button is an email to
// AiXESS that names the project and the request (the Vercel site has no form server).

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useDubaiCopy(key) {
  const { locale } = useLanguage();
  const copy = DUBAI_PROJECTS_COPY[locale] || DUBAI_PROJECTS_COPY.en;
  const images = DUBAI_IMAGES_COPY[locale] || DUBAI_IMAGES_COPY.en;
  return { common: copy.common, project: key ? copy[key] : null, all: copy, images: key ? images[key] : null };
}

// An email to AiXESS's verified address, already naming the project, its location and the request.
export function projectMailto(common, project, request) {
  const mail = common.mail;
  const name = project.hero.title.join(" ");
  const subject = mail.subject.replace("{{project}}", name).replace("{{request}}", request);
  const body = [`${mail.project}: ${name}`, `${mail.location}: ${project.place}`, `${mail.request}: ${request}`, "", `${mail.name}:`, `${mail.phone}:`, `${mail.message}:`, ""].join("\r\n");
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}


// TRESORA's scene renders have versions for the other times of day (src/data/figma-photo-sizes.json).
// Pictures with day / afternoon / night versions (src/data/figma-photo-sizes.json, Kemo 19 November 2026).
const THEMED = new Set(["tresora-fig-hero", "tresora-fig-discover", "tresora-fig-spaces", "tresora-fig-lifestyle", "tresora-fig-payment", "downtown-fig-hero", "downtown-fig-ent"]);
// DOWNTOWN ONE's highlights band stays the dusk render in every theme: its six items run down over the
// palms and the street, where no ink reads on a daylight version (checked 19 November 2026).
// The same words in English, for the AiXESS team's copy of the request.
function englishWords(locale, label) {
  const find = (node, path) => {
    if (node === label) return path;
    if (!node || typeof node !== "object") return null;
    for (const [key, value] of Object.entries(node)) {
      const found = find(value, [...path, key]);
      if (found) return found;
    }
    return null;
  };
  const path = find(DUBAI_PROJECTS_COPY[locale] || DUBAI_PROJECTS_COPY.en, []);
  const english = path?.reduce((node, key) => node?.[key], DUBAI_PROJECTS_COPY.en);
  return typeof english === "string" ? english : label;
}

// A request button opens the request form (Kemo, 14 November 2026: "it should be a form where user
// fills it out"); the team gets it by email and the visitor a confirmation. The mailto stays as the
// link's fallback (middle-click, no script).
function useRequestForm(project, label) {
  const { locale } = useLanguage();
  return siteFormClick(() => ({
    type: "enquiry",
    project: project.name || project.hero.title.join(" "),
    place: project.place,
    request: label,
    requestEn: englishWords(locale, label),
    route: window.location.hash.replace(/^#/, "").split("/")[0].toLowerCase(),
  }));
}

// The button's own words are the request.
function RequestButton({ common, project, label, primary = false }) {
  const onClick = useRequestForm(project, label);
  return (
    <a className={`button ${primary ? "button-primary" : "button-ghost"}`} href={projectMailto(common, project, label)} onClick={onClick} aria-haspopup="dialog">
      {label}<LashaArrow length={24} />
    </a>
  );
}

function Picture({ slug, alt = "", sizes, className, eager = false }) {
  if (THEMED.has(slug)) {
    return <ThemedImage figma={slug} className={className} sizes={sizes} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" />;
  }
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






// TRESORA as Lasha drew it (Figma frame "TRESORA", node 485:3; Kemo, 2 November 2026: "pixel perfect of
// whats on figma"). tresora-figma.css sets it in frame pixels from 900px and restacks it on phones.
// Prices: "$176,000 / Starting from" in Project highlights (Kemo, 3 November 2026), and the frame's two
// figures beside the property categories (Kemo, 13 November 2026: "there should be numbers as in
// figma ... if numbers are changed keep current ones"): the site's starting price and price per m² from
// Kemo's 27 October photos. The frame labels the second figure "Yearly rent"; it is the price per m².
// The frame's pictures are cut from its export (public/assets/dubai/tresora-fig-*).

// Lines of one width (the frame's title lockups: "TRESORA DUBAI" over "A TREASURE OF BALANCE",
// "DESIGNED FOR" over "DIFFERENT LIFESTYLES"). The CSS gives the width and each line's Figma size; the
// hook opens or closes each line's tracking until it spans the width, as in the frame, and only changes
// the size when a translation is too long or short for tracking alone.
function useFitLines(ref, deps) {
  useEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = box.clientWidth;
        if (!target) return;
        box.querySelectorAll(":scope > .tr-fit-line").forEach((line) => {
          // Measure the bare letters, then share the leftover width among the gaps between them.
          line.style.fontSize = "";
          line.style.letterSpacing = "0px";
          line.style.marginRight = "";
          let size = parseFloat(getComputedStyle(line).fontSize);
          const gaps = Math.max(1, line.textContent.trim().length - 1);
          let width = line.getBoundingClientRect().width;
          if (!size || !width) return;
          let extra = (target - width) / gaps;
          const most = 0.06 * size;
          const least = 0; // Morganite is already tight: never squeeze the letters together.
          if (extra > most || extra < least) {
            const clamped = Math.min(most, Math.max(least, extra));
            size = (size * (target - clamped * gaps)) / width;
            line.style.fontSize = `${size}px`;
            width = line.getBoundingClientRect().width;
            extra = (target - width) / gaps;
          }
          line.style.letterSpacing = `${extra}px`;
          line.style.marginRight = `${-extra}px`;
        });
        box.classList.add("is-fitted");
      });
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(box);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// TRESORA's Project highlights: four figures (Kemo, 3 November 2026, added "$176,000 / Starting from").
// They sit in one row, spread across the column with equal gaps and a hairline in the middle of each,
// the last one ending at the column's right edge. A language whose figures need more room shrinks all
// four together, at most to 85% (95% below 900px); past that they go two by two, and on a narrow phone
// one under another.
const FACTS_LEAST_SCALE = 0.85;

function useFactsLayout(ref, deps) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return undefined;
    let frame = 0;
    const textWidth = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().width;
    };
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const room = list.clientWidth;
        if (!room) return;
        // Measure at full size in the default layout; nothing paints until the frame ends.
        delete list.dataset.layout;
        list.style.setProperty("--tr-fact-k", "1");
        const items = Array.from(list.children);
        const widths = items.map((item) => Math.max(...Array.from(item.children, textWidth)));
        // The smallest gap allowed between two figures (a hairline sits in its middle).
        const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        const rowScale = Math.min(1, (room - gap * (items.length - 1) - 2) / widths.reduce((sum, width) => sum + width, 0));
        const columns = [0, 1].map((column) => Math.max(...widths.filter((_, index) => index % 2 === column)));
        const pairScale = Math.min(1, (room - gap - 2) / (columns[0] + columns[1]));
        let layout = "stack";
        let scale = Math.min(1, room / Math.max(...widths));
        // Below 900px a row that has to shrink gives way to two by two at full size.
        const rowLeast = pairScale >= 1 && window.matchMedia?.("(max-width: 899px)").matches ? 0.95 : FACTS_LEAST_SCALE;
        if (rowScale >= rowLeast) [layout, scale] = ["row", rowScale];
        else if (items.length % 2 === 0 && pairScale >= FACTS_LEAST_SCALE) [layout, scale] = ["pairs", pairScale];
        list.dataset.layout = layout;
        list.style.setProperty("--tr-fact-k", String(Math.floor(scale * 1000) / 1000));
        // Text does not always shrink exactly with its size (Safari rounds it), so check the real widths.
        for (let pass = 0; pass < 3 && scale < 1; pass += 1) {
          const now = items.map((item) => Math.max(...Array.from(item.children, textWidth)));
          const needed = layout === "row" ? now.reduce((sum, width) => sum + width, 0) + gap * (items.length - 1)
            : layout === "pairs" ? Math.max(now[0], now[2] ?? 0) + Math.max(now[1], now[3] ?? 0) + gap : Math.max(...now);
          if (needed <= room - 1) break;
          scale *= (room - 2) / needed;
          list.style.setProperty("--tr-fact-k", String(Math.floor(scale * 1000) / 1000));
        }
        // The figures spread to the column's edges, so every gap is equal: each hairline goes halfway across.
        if (layout !== "stack" && items.length > 1) {
          const gapNow = items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().right;
          list.style.setProperty("--tr-fact-half", `${Math.max(0, gapNow) / 2}px`);
        } else list.style.removeProperty("--tr-fact-half");
      });
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(list);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

function HighlightFacts({ items }) {
  const ref = useRef(null);
  useFactsLayout(ref, [items.flat().join("|")]);
  return (
    <dl className="tr-facts" ref={ref}>
      {items.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

export function FitLines({ as: Tag = "h2", id, className, lines }) {
  const ref = useRef(null);
  useFitLines(ref, [lines.join("|")]);
  return (
    <Tag id={id} ref={ref} className={`tr-fit ${className}`}>
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index ? " " : null}
          <span className={`tr-fit-line tr-fit-line-${index + 1}`}>{line}</span>
        </Fragment>
      ))}
    </Tag>
  );
}

// Splits a title into two lines of about the same number of letters ("Designed for | Different Lifestyles").
function twoLines(title) {
  const words = title.split(/\s+/);
  let best = 1;
  let bestGap = Infinity;
  for (let cut = 1; cut < words.length; cut += 1) {
    const gap = Math.abs(words.slice(0, cut).join(" ").length - words.slice(cut).join(" ").length);
    if (gap < bestGap) { best = cut; bestGap = gap; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function Eyebrow({ children }) {
  return <p className="tr-eyebrow">{children}</p>;
}

function TrButton({ href, onClick, label, primary = false, ...rest }) {
  return (
    <a className={`tr-button${primary ? " tr-button-primary" : ""}`} href={href} onClick={onClick} {...rest}>
      <span>{label}</span><LashaArrow length={38} />
    </a>
  );
}

function TrRequest({ common, project, label, primary }) {
  const onClick = useRequestForm(project, label);
  return <TrButton href={projectMailto(common, project, label)} onClick={onClick} label={label} primary={primary} aria-haspopup="dialog" />;
}

/* Figma TRESORA frame 485:3 sets the English discover text with its own line breaks. The words stay
   as written; a break is placed before each phrase below when the paragraph contains it. */
const TRESORA_DISCOVER_BREAKS = ["the heart of", "residential communities", "curated retail", "around the balance", "and integrated smart", "where functionality"];

function withFigmaBreaks(text) {
  const parts = [];
  let rest = text;
  for (const phrase of TRESORA_DISCOVER_BREAKS) {
    const at = rest.indexOf(` ${phrase}`);
    if (at < 0) continue;
    // The space stays before the break: it is dropped at the line end where the break shows, and it
    // keeps the words apart on phones, where the break is hidden.
    parts.push(rest.slice(0, at + 1), <br key={phrase} className="tr-figma-break" />);
    rest = rest.slice(at + 1);
  }
  parts.push(rest);
  return parts;
}

// The two price figures keep the frame's size unless a language's figure (Russian "4 115 USD" in AiXESS
// Head) would run past the hairline or the column: then both shrink together, just enough.
function usePriceFit(ref, deps) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return undefined;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        list.style.setProperty("--tr-price-k", "1");
        const [first, second] = list.querySelectorAll("dd");
        // Phones let the two figures wrap under each other instead.
        if (!first || !second || window.matchMedia?.("(max-width: 899px)").matches) return;
        const width = (node) => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect().width; };
        const box = list.getBoundingClientRect();
        const firstRoom = second.parentElement.getBoundingClientRect().left - box.left - 70 * (Math.min(document.documentElement.clientWidth, 1920) / 1440);
        const secondRoom = box.right - second.getBoundingClientRect().left;
        const k = Math.min(1, firstRoom / width(first), secondRoom / width(second));
        if (k < 1) list.style.setProperty("--tr-price-k", String(Math.floor(k * 1000) / 1000));
      });
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(list);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

function PriceFigures({ items }) {
  const ref = useRef(null);
  usePriceFit(ref, [items.flat().join("|")]);
  return <dl className="tr-prices" ref={ref}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

// Figma writes the dollar figures "US $176,635"; the other languages keep "176.635 USD".
const figmaUsd = (text) => text.replace(/^US\$/, "US $");

// A section title whose longest word is wider than its column (Russian ВСТРЕЧАЮТСЯ, НЕДВИЖИМОСТЬ,
// Polish ZAPROJEKTOWANY) shrinks just enough to keep that word whole; titles that fit keep their size.
function WordFitTitle({ className, id, children }) {
  const ref = useRef(null);
  useWordFit(ref, undefined, { words: true });
  return <h2 className={className} id={id} ref={ref}>{children}</h2>;
}

export function TresoraPage({ header }) {
  const route = "tresora";
  const { common, project, images } = useDubaiCopy("tresora");
  useSectionFromHash(route);
  const { hero, discover, highlights, spaces, pricing, included, lifestyle, location, payment, more } = project;
  const [locationFirst, locationSecond] = location.title.split(/\s* ?—\s*/);
  // ВАША НЕДВИЖИМОСТЬ broke mid-word in Russian at every width: the title shrinks just enough to keep it whole.
  const paymentTitleRef = useRef(null);
  useWordFit(paymentTitleRef);
  const paymentLines = payment.title.split(/\.\s+/).map((line) => line.replace(/\.$/, ""));
  const gallery = [
    [lifestyle.amenities[0], [["tresora-fig-g1a", images.pool], ["tresora-fig-g1b", images.gallery[0][1]], ["tresora-fig-g1c", images.sunsetPool]]],
    [lifestyle.amenities[1], [["tresora-fig-g2a", images.gallery[1][1]], ["tresora-fig-g2b", images.gymRow], ["tresora-fig-g2c", images.gymWeights]]],
    [lifestyle.exterior, [["tresora-fig-g3a", images.gallery[2][1]], ["tresora-fig-g3b", images.gallery[3][1]], ["tresora-fig-g3c", images.balcony]]],
    [lifestyle.interior, [["tresora-fig-g4a", images.gallery[6][1]], ["tresora-fig-g4b", images.gallery[7][1]], ["tresora-fig-g4c", images.gallery[4][1]]]],
  ];

  return (
    <>
      <section className="lasha-page-hero tr-hero" aria-labelledby={`${route}-title`}>
        {header}
        <Picture slug="tresora-fig-hero" alt={images.hero} className="tr-bg tr-hero-bg" sizes="100vw" eager />
        <div className="tr-hero-copy">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <FitLines as="h1" id={`${route}-title`} className="tr-hero-title" lines={[hero.title.join(" "), hero.subtitle]} />
          <p className="tr-hero-intro">{hero.intro}</p>
          <div className="tr-actions tr-hero-actions">
            <TrRequest common={common} project={project} label={hero.availability} />
            <TrButton href={`#${route}/spaces`} onClick={sectionLinkClick(route, "spaces")} label={hero.explore} />
          </div>
        </div>
      </section>

      <main className="page-main tr-page">
        <section className="tr-photo-band tr-discover" id="tresora-discover" aria-labelledby="tresora-discover-title">
          <Picture slug="tresora-fig-discover" className="tr-bg" sizes="100vw" />
          <div className="tr-wrap">
            <Eyebrow>{discover.eyebrow}</Eyebrow>
            <WordFitTitle className="tr-title tr-discover-title" id="tresora-discover-title">{discover.title}</WordFitTitle>
            <div className="tr-body tr-discover-body">{discover.body.map((text) => <p key={text}>{withFigmaBreaks(text)}</p>)}</div>
          </div>
        </section>

        <section className="tr-ink-band tr-highlights" id="tresora-highlights" aria-labelledby="tresora-highlights-title">
          <div className="tr-wrap">
            <h2 className="tr-title tr-highlights-title" id="tresora-highlights-title">{highlights.title}</h2>
            <HighlightFacts items={highlights.items} />
          </div>
        </section>

        <div className="tr-paper">
          <section className="tr-spaces" id="tresora-spaces" aria-labelledby="tresora-spaces-title">
            <figure className="tr-slant tr-spaces-figure"><Picture slug="tresora-fig-spaces" alt={images.pool} sizes="(max-width: 899px) 100vw, 57vw" /></figure>
            <div className="tr-wrap">
              <div className="tr-spaces-copy">
                <Eyebrow>{spaces.eyebrow}</Eyebrow>
                <FitLines id="tresora-spaces-title" className="tr-spaces-title" lines={twoLines(spaces.title)} />
                <div className="tr-body tr-spaces-body">{spaces.body.map((text) => <p key={text}>{text}</p>)}</div>
              </div>
              <div className="tr-spaces-row">
                <div className="tr-categories">
                  <h3>{spaces.listTitle}</h3>
                  <ul>{spaces.categories.map((name) => <li key={name}>{name}</li>)}</ul>
                </div>
                <div className="tr-spaces-side">
                  <PriceFigures items={[[pricing.startingLabel, figmaUsd(pricing.starting)], [pricing.perSqmLabel, figmaUsd(pricing.perSqm)]]} />
                  <div className="tr-actions tr-spaces-actions">
                    <TrButton href={`#${route}/gallery`} onClick={sectionLinkClick(route, "gallery")} label={hero.explore} primary />
                    <TrRequest common={common} project={project} label={hero.availability} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="tr-included" id="tresora-included" aria-labelledby="tresora-included-title">
            <div className="tr-wrap">
              <Eyebrow>{included.eyebrow}</Eyebrow>
              <h2 className="tr-title" id="tresora-included-title">{included.title}</h2>
              <p className="tr-body tr-included-lead">{included.lead}</p>
              <dl className="tr-included-list">
                {included.items.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}
              </dl>
            </div>
          </section>

          <section className="tr-lifestyle" id="tresora-lifestyle" aria-labelledby="tresora-lifestyle-title">
            <figure className="tr-slant tr-lifestyle-figure"><Picture slug="tresora-fig-lifestyle" alt={images.sunsetPool} sizes="(max-width: 899px) 100vw, 58vw" /></figure>
            <div className="tr-wrap">
              <div className="tr-lifestyle-copy">
                <Eyebrow>{lifestyle.eyebrow}</Eyebrow>
                <WordFitTitle className="tr-title tr-lifestyle-title" id="tresora-lifestyle-title">{lifestyle.title}</WordFitTitle>
                <p className="tr-body tr-lifestyle-lead">{lifestyle.lead}</p>
              </div>
              <h3 className="tr-amenities-title">{lifestyle.listTitle}</h3>
              <ol className="tr-amenities">
                {lifestyle.amenities.map((name, index) => <li key={name}><span className="tr-amenity-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="tr-amenity-name">{name}</span></li>)}
              </ol>
            </div>
          </section>

          <section className="tr-gallery" id="tresora-gallery" aria-label={project.name}>
            <div className="tr-wrap">
              {gallery.map(([caption, pictures]) => (
                <figure className="tr-gallery-group" key={caption}>
                  <div className="tr-gallery-grid">
                    {pictures.map(([slug, alt], index) => <Picture key={slug} slug={slug} alt={alt} className={index ? "tr-gallery-small" : "tr-gallery-large"} sizes={index ? "(max-width: 899px) 50vw, 34vw" : "(max-width: 899px) 100vw, 55vw"} />)}
                  </div>
                  <figcaption>{caption}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        </div>

        <section className="tr-field-band tr-location" id="tresora-location" aria-labelledby="tresora-location-title">
          <div className="tr-wrap">
            <Eyebrow>{location.eyebrow}</Eyebrow>
            <FitLines id="tresora-location-title" className="tr-location-title" lines={locationSecond ? [locationFirst, locationSecond] : twoLines(location.title)} />
            <div className="tr-body tr-location-body">{location.body.map((text) => <p key={text}>{text}</p>)}</div>
          </div>
        </section>
        <figure className="tr-map"><Picture slug="tresora-fig-map" alt={images.map} sizes="100vw" /></figure>

        <section className="tr-photo-band tr-payment" id="tresora-payment" aria-labelledby="tresora-payment-title">
          <Picture slug="tresora-fig-payment" className="tr-bg" sizes="100vw" />
          <div className="tr-wrap">
            <Eyebrow>{payment.eyebrow}</Eyebrow>
            <h2 className="tr-title tr-payment-title" id="tresora-payment-title" ref={paymentTitleRef}>{paymentLines.map((line) => <span key={line}>{line} </span>)}</h2>
            <div className="tr-body tr-payment-body">{payment.body.map((text) => <p key={text}>{text}</p>)}</div>
          </div>
        </section>

        <section className="tr-ink-band tr-more" id="tresora-more" aria-labelledby="tresora-more-title">
          <div className="tr-wrap">
            <h2 className="tr-title tr-more-title" id="tresora-more-title">{more.title}</h2>
            <div className="tr-body tr-more-body">{more.body.map((text) => <p key={text}>{text}</p>)}</div>
            <div className="tr-actions tr-more-actions">
              <TrRequest common={common} project={project} label={more.contact} />
              <TrRequest common={common} project={project} label={more.details} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// DOWNTOWN ONE as Lasha drew it (Figma frame "DOWNTOWN ONE", node 553:232, 1440 x 8358; Kemo,
// 13 November 2026: "make pixel perfect copy of that figma page design"). downtown-figma.css sets it in
// frame pixels from 900px (shared pieces from tresora-figma.css) and restacks it on phones. The words are
// the site's; the frame's headings (Project highlights, Resident amenities, Exterior, Interior) are
// translated. Pictures: the developer's renders in the frame's crops (each mask's image box, in frame
// pixels relative to the mask: [x, y, width, height]); the hero, highlights, entertainment and map
// pictures are the frame's own 2x exports.
const DT_AMENITY_PICTURES = [
  ["downtown-gym", [0.753, -169.532, 819.964, 579.74]],
  ["downtown-pool", [0, -186, 818, 578]],
  ["downtown-fig-ent", [0, 0, 818, 332]],
  ["downtown-kids", [0, -92, 818, 578]],
];

// Resident amenities: one big picture and two small ones per row. Slots where the frame shows TRESORA
// pictures (WADAN's pool and façade) carry Downtown One's own renders, cropped to the slot.
const DT_GALLERY = [
  ["pools", [["downtown-pool", [0, -112, 790, 559]], ["downtown-kids", null], ["downtown-aerial", null, "50% 62%"]]],
  ["wellness", [["downtown-gym", [-87.994, -226.551, 1095.747, 774.727]], ["downtown-golf", [0, -65.968, 486.82, 344.197]], ["downtown-cycling", [0, -66, 487, 344]]]],
  ["exterior", [["downtown-fig-tower", [0, 0, 790, 444]], ["downtown-podium", null, "50% 70%"], ["downtown-street", null, "50% 66%"]]],
  ["interior", [["downtown-living", [0, -90, 788, 557]], ["downtown-kitchen", [0, -119, 486, 344]], ["downtown-bedroom", [-0.25, -94.823, 486.271, 343.809]]]],
];

function CropPicture({ slug, alt, box, crop, position, sizes, className = "" }) {
  const [width, height] = box;
  const pct = (value, of) => `${(value / of) * 100}%`;
  const imageStyle = crop
    ? { left: pct(crop[0], width), top: pct(crop[1], height), width: pct(crop[2], width), height: pct(crop[3], height) }
    : { inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position || "50% 50%" };
  const image = dubaiImage(slug);
  return (
    <div className={`dt-crop ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      {THEMED.has(slug) ? (
        <ThemedImage figma={slug} sizes={sizes} alt={alt} loading="lazy" decoding="async" style={imageStyle} />
      ) : (
        <img src={image.src} srcSet={image.srcSet} sizes={sizes} width={image.width} height={image.height} alt={alt} loading="lazy" decoding="async" style={imageStyle} />
      )}
    </div>
  );
}

// "Dubai Metro and Aster Cedars Hospital — approximately 5–10 minutes" → ["5–10 minutes", places].
function nearbyGroup(line) {
  const [places, time = ""] = line.split(/\s+—\s+/);
  // The frame lists the places with middle dots: "Dubai Metro · Aster Cedars Hospital".
  const dotted = places.split(/,\s+|\s+(?:and|und|i|in|и)\s+/).join(" · ");
  return [time.replace(/^(approximately|ca\.|ok\.|približno|примерно)\s+/i, ""), dotted];
}

export function DowntownOnePage({ header }) {
  const route = "downtown-one";
  const { common, project, images } = useDubaiCopy("downtown");
  useSectionFromHash(route);
  const { hero, highlights, amenities, location, more, figma } = project;
  const [locationFirst, locationSecond] = location.title.split(/\s* ?—\s*/);
  const alt = Object.fromEntries(images.gallery);
  alt["downtown-fig-tower"] = images.hero;
  alt["downtown-fig-ent"] = images.entertainment;
  // The frame's order: Wellness, Pools, Entertainment, Family; the highlights in the frame's order too.
  const highlightOrder = [0, 4, 5, 3, 1, 2];
  const captions = { pools: amenities.groups[1][0], wellness: amenities.groups[0][0], exterior: figma.exterior, interior: figma.interior };

  return (
    <>
      <section className="lasha-page-hero tr-hero dt-hero" aria-labelledby={`${route}-title`}>
        {header}
        <Picture slug="downtown-fig-hero" alt={images.hero} className="tr-bg tr-hero-bg" sizes="100vw" eager />
        <div className="tr-hero-copy">
          <Eyebrow>{hero.tagline}</Eyebrow>
          <FitLines as="h1" id={`${route}-title`} className="tr-hero-title" lines={[hero.title.join(" "), hero.subtitle]} />
          <p className="tr-hero-intro">{hero.body[0]}</p>
          <div className="tr-actions tr-hero-actions">
            <TrRequest common={common} project={project} label={hero.availability} />
            <TrButton href={`#${route}/highlights`} onClick={sectionLinkClick(route, "highlights")} label={hero.explore} />
          </div>
        </div>
      </section>

      <main className="page-main tr-page dt-page">
        <section className="tr-photo-band dt-highlights" id="downtown-one-highlights" aria-labelledby="downtown-one-highlights-title">
          <Picture slug="downtown-fig-highlights" className="tr-bg" sizes="100vw" />
          <div className="tr-wrap">
            <WordFitTitle className="tr-title dt-highlights-title" id="downtown-one-highlights-title">{figma.highlights}</WordFitTitle>
            <dl className="dt-facts">
              {highlightOrder.map((index) => {
                const [value, title, line] = highlights.items[index];
                return <div key={title}><dt>{title}</dt><dd>{value} – {line}</dd></div>;
              })}
            </dl>
          </div>
        </section>

        <section className="dt-amenities" id="downtown-one-amenities" aria-labelledby="downtown-one-amenities-title">
          <div className="tr-wrap">
            <Eyebrow>{amenities.eyebrow}</Eyebrow>
            <h2 className="tr-title dt-amenities-title" id="downtown-one-amenities-title">
              <span>{figma.amenityLines[0]}</span>{" "}
              <span className="dt-accent">{figma.amenityLines[1]}</span>
            </h2>
            <div className="tr-body dt-amenities-body">{amenities.body.map((text) => <p key={text}>{text}</p>)}</div>
            <div className="dt-amenity-rows">
              {amenities.groups.map(([group, items], index) => (
                <section className={`dt-amenity dt-amenity-${index + 1}`} key={group} aria-label={group}>
                  <CropPicture slug={DT_AMENITY_PICTURES[index][0]} alt={alt[DT_AMENITY_PICTURES[index][0]]} box={[818, 333]} crop={DT_AMENITY_PICTURES[index][1]} sizes="(max-width: 899px) 100vw, 57vw" className="dt-amenity-picture" />
                  <div className="dt-amenity-list">
                    <h3>{group}</h3>
                    <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="dt-location" id="downtown-one-location" aria-labelledby="downtown-one-location-title">
          <div className="tr-wrap">
            <Eyebrow>{location.eyebrow}</Eyebrow>
            <h2 className="tr-title dt-location-title" id="downtown-one-location-title">
              <span>{locationFirst}</span>{" "}
              {locationSecond && <span className="dt-accent">{locationSecond}</span>}
            </h2>
            <div className="tr-body dt-location-body">{location.body.map((text) => <p key={text}>{text}</p>)}</div>
            <div className="dt-nearby">
              <CropPicture slug="downtown-fig-map" alt={images.map} box={[818, 573]} crop={[0, 0, 818, 573]} sizes="(max-width: 899px) 100vw, 57vw" className="dt-map" />
              <div className="dt-nearby-copy">
                <h3>{location.nearbyTitle}</h3>
                <dl>
                  {location.nearby.map((line) => {
                    const [time, places] = nearbyGroup(line);
                    return <div key={line}><dt>{time}</dt><dd>{places}</dd></div>;
                  })}
                </dl>
                <p>{location.closing}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="dt-gallery" id="downtown-one-gallery" aria-labelledby="downtown-one-gallery-title">
          <div className="tr-wrap">
            <h2 className="tr-title dt-gallery-title" id="downtown-one-gallery-title">{figma.gallery}</h2>
            {DT_GALLERY.map(([key, pictures]) => (
              <figure className="dt-gallery-group" key={key}>
                <div className="dt-gallery-grid">
                  {pictures.map(([slug, crop, position], index) => (
                    <CropPicture key={slug} slug={slug} alt={alt[slug]} box={index ? [486, 212] : [790, 445]} crop={crop} position={position} className={index ? "dt-gallery-small" : "dt-gallery-large"} sizes={index ? "(max-width: 899px) 50vw, 34vw" : "(max-width: 899px) 100vw, 55vw"} />
                  ))}
                </div>
                <figcaption>{captions[key]}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="tr-ink-band dt-more" id="downtown-one-more" aria-labelledby="downtown-one-more-title">
          <div className="tr-wrap">
            <Eyebrow>{more.eyebrow}</Eyebrow>
            <WordFitTitle className="tr-title dt-more-title" id="downtown-one-more-title">{more.title}</WordFitTitle>
            <div className="tr-body dt-more-body">{more.body.map((text) => <p key={text}>{text}</p>)}</div>
          </div>
        </section>
      </main>
    </>
  );
}

export function DubaiProjectCards({ onNavigate }) {
  const { common, all } = useDubaiCopy();
  // Photos, order and type as Lasha's HOME frame draws the two cards (Figma sync, 19 November 2026):
  // photo, a blue eyebrow row (the market, then the project's line), the name, a rule and the place
  // and status. The words are the site's own.
  const cards = [["tresora", all.tresora, "home-tresora"], ["downtown-one", all.downtown, "home-downtown"]];
  return (
    <section className="dp-listing" id="dubai-projects" aria-labelledby="dubai-projects-title">
      <p className="lasha-eyebrow">{common.listEyebrow}</p>
      <h2 id="dubai-projects-title">{common.listTitle}</h2>
      <ul className="dp-listing-cards">
        {cards.map(([route, project, image]) => (
          <li key={route}>
            <article aria-labelledby={`${route}-card-title`}>
              <div className="dp-listing-media">
                <ThemedImage className="dp-listing-image" figma={image} defaultWidth={800} sizes="(max-width: 899px) calc(100vw - 2.5rem), 74vw" alt="" loading="lazy" decoding="async" />
              </div>
              <div className="dp-listing-eyebrow">
                <p className="dp-listing-category">{common.category}</p>
                <p className="dp-listing-line">{project.cardLine}</p>
              </div>
              <h3 id={`${route}-card-title`}>{project.cardName}</h3>
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
