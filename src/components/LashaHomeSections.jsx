import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { FittedHeading } from "./FittedHeading.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { HOME_HERO_LINES } from "../project-showcase-copy.js";
import { useWordFit } from "./useWordFit.js";
import { ThemedImage } from "./ThemedImage.jsx";

// Lasha's hairline arrows, drawn the way Figma draws them (19 November 2026): a shaft exactly as long as
// the width the parent's CSS gives the arrow, ending in a 45° head whose arms are 3.2 stroke widths long,
// so a thicker stroke (`stroke-width` on the arrow) draws a proportionally larger head, as in Figma, and
// the head never stretches with the shaft. `length` is only the width without CSS.
export function LashaArrow({ className = "lasha-arrow", length = 24 }) {
  const head = `lasha-arrow-head-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg className={className} width={length} height="8" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
      <defs>
        <marker id={head} markerUnits="strokeWidth" viewBox="-4 -4 5 8" markerWidth="5" markerHeight="8" refX="0" refY="0" orient="auto" overflow="visible">
          <path d="M-3.2 -3.2L0 0L-3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <line x1="0" y1="50%" x2="100%" y2="50%" markerEnd={`url(#${head})`} />
    </svg>
  );
}

export function LashaValue({ value, className }) {
  const plus = value.endsWith("+");
  return (
    <span className={className}>
      {plus ? value.slice(0, -1) : value}
      {plus && <span className="lasha-plus">+</span>}
    </span>
  );
}

// A same-tab click on a route link goes through the app router (pushState, no hashchange jump);
// modified clicks keep the browser's own new-tab behaviour.
export function routeLinkClick(onNavigate, page) {
  return (event) => {
    if (!onNavigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(page);
  };
}

export function HomeHero({ children, onNavigate }) {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const lines = HOME_HERO_LINES[locale] ?? HOME_HERO_LINES.en;
  // The title waits for the photo so both fade in together instead of the text showing alone on an
  // empty ground while the photo loads (Kemo, 9 October 2026). A slow or failed photo never hides it for long.
  const mediaRef = useRef(null);
  const [mediaReady, setMediaReady] = useState(false);
  useEffect(() => {
    if (mediaRef.current?.complete) setMediaReady(true);
    const timer = window.setTimeout(() => setMediaReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);
  // The copy is centred in the photo below the floating header (Kemo, 17 October 2026: the title sat
  // jammed under the menu), so the CSS needs the header's real height, which changes with the window.
  const sectionRef = useRef(null);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const header = section?.querySelector(":scope > .site-header");
    if (!header) return undefined;
    const mark = () => section.style.setProperty("--hero-header", `${header.offsetHeight}px`);
    mark();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(mark);
    observer?.observe(header);
    return () => observer?.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="lasha-hero" id="project" data-media-ready={mediaReady ? "" : undefined}>
      {children}
      <div className="lasha-hero-frame">
        <ThemedImage
          ref={mediaRef}
          className="lasha-hero-media"
          // The Figma HOME frame's photo (Kemo, 19 November 2026: pixel for pixel), in its
          // afternoon and night light where those versions exist.
          figma="home-hero"
          defaultWidth={1600}
          alt=""
          // Portrait phones draw the photo 1.4 × the hero's height and portrait tablets 1.75 ×
          // (lasha-home.css); from 900px it is 1593 of the frame's 1440 wide (figma-sync.css).
          sizes="(max-width: 899px) and (orientation: portrait) and (min-width: 600px) 255vh, (max-width: 899px) and (orientation: portrait) 205vh, 111vw"
          fetchPriority="high"
          decoding="async"
          onLoad={() => setMediaReady(true)}
          onError={() => setMediaReady(true)}
        />
        <div className="lasha-hero-copy">
          <FittedHeading as="h1" fillLines maxLineRatio={260 / 423}>{lines.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
          <p>{copy.heroSubtitle}</p>
          {/* Opens the Project Reverance page itself (Klem, 16 October 2026), not a homepage section. */}
          <a className="lasha-hero-cta" href="#residences" onClick={routeLinkClick(onNavigate, "residences")}>{copy.heroCta}<LashaArrow length={24} /></a>
        </div>
      </div>
    </section>
  );
}

// Each inner page opens on its own image (Kemo, 7 October 2026: not the same image everywhere).
// Reverance renders stay on project pages; the brand pages use generated photography in day,
// afternoon and night versions that follow the theme (13 October 2026). Positions are
// desktop / phone focal points; `aspect` sizes the phone crop (see pageHeroSizes).
const PAGE_HERO_IMAGES = {
  // Insights: the Batumi Black Sea coast (Klem, 14 October 2026), open sea and sky behind the copy
  // on the left, the city and shore on the right.
  "batumi-coast": { family: "batumi-coast", aspect: 16 / 9, position: "100% 50%", phonePosition: "40% 50%", sizes: "(max-aspect-ratio: 1/1) 180vh, (max-aspect-ratio: 3/2) 154vh, 100vw" },
  // Broker Tools: the calmer refinement of design 1A (14 October 2026), sky and sea under the
  // copy, the stone terrace at the right edge.
  // Its hero is at least the screen's height on portrait screens (so the photo is drawn about
  // 1.8 × the height wide) and about 86% of it on 4:3 screens.
  "broker-tools-refined": { family: "broker-tools-refined", aspect: 16 / 9, position: "100% 50%", phonePosition: "62% 50%", sizes: "(max-aspect-ratio: 1/1) 180vh, (max-aspect-ratio: 3/2) 154vh, 100vw" },
  // Selected Opportunities: the official render of both Reverance towers above the Batumi coast
  // (Klem, 14 October 2026: the crown close-up "doesn't show nothing").
  // From 900px the photo spans the width; phones and portrait tablets show the right half of it
  // (both towers) at full width, so the file is about twice the screen width.
  "reverance-towers": { family: "reverance-towers", aspect: 2985 / 1767, position: "100% 0%", phonePosition: "84% 0%", sizes: "(max-width: 899px) 200vw, (max-aspect-ratio: 1/1) 200vw, 100vw" },
  skyline: { src: "reverance-skyline-1440", srcSet: "reverance-skyline-720 720w, reverance-skyline-1440 1440w, reverance-skyline-2160 2160w, reverance-skyline-2700 2700w", position: "72% 30%" },
  sunset: { src: "reverance-sunset-1600", srcSet: "reverance-sunset-800 800w, reverance-sunset-1600 1600w, reverance-sunset-2400 2400w", position: "72% 58%" },
  entrance: { src: "reverance-entrance-1200", srcSet: "reverance-entrance-600 600w, reverance-entrance-1200 1200w", position: "62% 58%" },
  front: { src: "reverance-front-1400", srcSet: "reverance-front-700 700w, reverance-front-1400 1400w", position: "70% 18%" },
  facade: { src: "reverance-facade-1200", srcSet: "reverance-facade-600 600w, reverance-facade-1200 1200w", position: "60% 40%" },
  aerial: { src: "reverance-aerial-1200", srcSet: "reverance-aerial-600 600w, reverance-aerial-1200 1200w", position: "70% 30%" },
  // Broker Access: the photo of Lasha's BROKER ACCESS frame (Figma sync, 19 November 2026), its
  // 1672 × 941 layer from x −67, y −41 of the 1440 × 900 hero; every theme.
  "broker-hero": { figma: "broker-hero", position: "50% 50%", sizes: "(max-aspect-ratio: 1/1) 180vh, 116vw" },
  tower: { src: "reverance-tower-1990", srcSet: "reverance-tower-995 995w, reverance-tower-1990 1990w, reverance-tower-2985 2985w", position: "68% 40%" },
};
const projectImage = (name) => `/assets/projects/${name}.webp`;
const pageHeroSources = (media) => ({ src: projectImage(media.src), srcSet: media.srcSet.split(", ").map((entry) => `/assets/projects/${entry.replace(" ", ".webp ")}`).join(", ") });
// The hero is about 65% of the screen height on portrait screens, so a cover crop draws the
// photo that tall and aspect × as wide; 100vw there would pick a soft, upscaled file.
const pageHeroSizes = (aspect) => `(max-aspect-ratio: 1/1) ${Math.ceil(70 * aspect)}vh, 100vw`;

// Header labels over a pale part of the hero photo take ink there (16 October 2026 readability
// audit), the rest stay white. `ranges` are the photo's light spans as fractions of its own
// width; each label's centre is mapped onto the photo through its cover crop, so the choice
// follows the crop at every width. time-theme.css styles .is-on-light-sky for the themes listed
// in data-light-sky.
const HEADER_ITEMS = ".brand, .desktop-nav > button, .nav-group > button, .time-theme-menu__button, .language-switcher-trigger, .login-button, .menu-toggle";
function useHeaderOnLightSky(ref, ranges, locale) {
  useLayoutEffect(() => {
    const hero = ref.current;
    const media = hero?.querySelector(":scope > .lasha-page-hero-media");
    if (!media || !ranges) return undefined;
    const mark = () => {
      const box = media.getBoundingClientRect();
      const { naturalWidth: w, naturalHeight: h } = media;
      if (!w || !h || !box.width) return;
      const drawn = w * Math.max(box.width / w, box.height / h);
      const posX = parseFloat(getComputedStyle(media).objectPosition) / 100 || 0;
      const left = box.left + (box.width - drawn) * posX;
      hero.querySelectorAll(`:scope > .site-header :is(${HEADER_ITEMS})`).forEach((item) => {
        const r = item.getBoundingClientRect();
        const u = (r.left + r.width / 2 - left) / drawn;
        item.classList.toggle("is-on-light-sky", r.width > 0 && ranges.some(([from, to]) => u >= from && u < to));
      });
    };
    mark();
    media.addEventListener("load", mark);
    document.fonts?.ready.then(mark);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(mark);
    observer?.observe(hero);
    return () => {
      media.removeEventListener("load", mark);
      observer?.disconnect();
    };
  }, [ref, ranges, locale]);
}

// Inner pages open with the homepage's language: the site header floating over a
// Reverance render, a blue eyebrow and an oversized headline.
export function LashaPageHero({ header, eyebrow, title, titleAs: Title = "h1", fillTitle = false, copy, image = "skyline", imageAlt = "", variant, lightSky, children }) {
  const lines = Array.isArray(title) ? title : [title];
  const media = PAGE_HERO_IMAGES[image] ?? PAGE_HERO_IMAGES.skyline;
  const style = { "--hero-position": media.position, "--hero-position-phone": media.phonePosition ?? media.position };
  const ref = useRef(null);
  const { locale } = useLanguage();
  useHeaderOnLightSky(ref, lightSky?.ranges, locale);
  // ВОЗМОЖНОСТЬЮ and ПЛАТФОРМА broke mid-word on 320px phones: the title shrinks only then.
  const titleRef = useRef(null);
  useWordFit(titleRef, undefined, { words: true });
  return (
    <section ref={ref} className={`lasha-page-hero${variant ? ` lasha-page-hero-${variant}` : ""}`} data-light-sky={lightSky?.themes}>
      {header}
      {media.figma ? (
        <ThemedImage className="lasha-page-hero-media" figma={media.figma} defaultWidth={1600} sizes={media.sizes} style={style} alt={imageAlt} fetchPriority="high" decoding="async" />
      ) : media.family ? (
        <ThemedImage className="lasha-page-hero-media" family={media.family} sizes={media.sizes ?? pageHeroSizes(media.aspect)} style={style} alt={imageAlt} fetchPriority="high" decoding="async" />
      ) : (
        <img className="lasha-page-hero-media" {...pageHeroSources(media)} sizes="100vw" style={style} alt={imageAlt} decoding="async" />
      )}
      <div className="lasha-page-hero-copy">
        {eyebrow && <p className="lasha-eyebrow">{eyebrow}</p>}
        {/* fillTitle sets every line to the title's width, as Lasha's posters do (Broker Access); the
            other heroes keep their words whole with titleRef (useWordFit). */}
        {fillTitle
          ? <FittedHeading as={Title} className="lasha-page-hero-title" fillLines>{lines.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
          : <Title className="lasha-page-hero-title" ref={titleRef}>{lines.map((line) => <span key={line}>{line}</span>)}</Title>}
        {copy && <p className="lasha-page-hero-text">{copy}</p>}
        {children}
      </div>
    </section>
  );
}

export function HomeMetrics() {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;

  return (
    <section className="lasha-metrics">
      {copy.metrics.map(([label, value, note]) => (
        <div key={label}>
          <p className="lasha-metrics-label">{label}</p>
          <p className="lasha-metrics-value" style={{ "--chars": Math.max(value.length, 6) }}>
            <LashaValue value={value} />
          </p>
          <p className="lasha-metrics-note">{note}</p>
        </div>
      ))}
      <p className="lasha-metrics-tagline">
        {copy.metricsTagline.map((line) => <span key={line}>{line}</span>)}
      </p>
    </section>
  );
}

export function HomeAbout() {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;

  return (
    <section className="lasha-about" id="why-aixess" aria-labelledby="lasha-about-title">
      <ThemedImage
        className="lasha-about-media"
        // The Figma HOME frame's "connection 1" (Kemo, 19 November 2026), in the theme's light.
        figma="home-about"
        defaultWidth={800}
        sizes="(max-width: 899px) 100vw, 53vw"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className="lasha-about-panel">
        <p className="lasha-eyebrow lasha-eyebrow-lead">{copy.aboutEyebrow}</p>
        <FittedHeading id="lasha-about-title">{copy.aboutTitle.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
        <p className="lasha-about-body">{copy.aboutBody}</p>
        <ol className="lasha-about-points">
          {copy.aboutPoints.map((point, index) => (
            <li key={point}><span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>{point}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// "ONE PLATFORM" (and its translations) stays on one line (Klem, 12 October 2026): the second
// sentence starts its own line and its first two words never split.
function keepPhraseTogether(text) {
  const match = text.match(/^(.*?[.!?])\s+(\S+\s+\S+)(.*)$/);
  if (!match) return text;
  const [, before, phrase, after] = match;
  return <>{before} <span className="lasha-starting-line"><span className="lasha-nowrap">{phrase}</span>{after}</span></>;
}

// The three starting-point cards were taken off the homepage because Broker Access shows them
// (Kemo, 28 October 2026); the statement stays.
export function HomeStartingPoints() {
  const { locale } = useLanguage();
  const network = NETWORK_COPY[locale] || NETWORK_COPY.en;
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const [lead, accent] = copy.startingTitle;

  return (
    <section className="lasha-starting" aria-labelledby="lasha-starting-title">
      <p className="lasha-eyebrow">{network.introTagline.replace(/\.$/, "")}</p>
      <h2 id="lasha-starting-title"><span>{keepPhraseTogether(lead)}</span> <span className="lasha-accent">{accent}</span></h2>
    </section>
  );
}

export function HomeAccess({ onOpenModal }) {
  const { t } = useLanguage();
  const countRef = useRef(null);
  // EXPLORE and AVAILABLE RESIDENCES stay one line each; a line wider than the column shrinks to fit.
  useWordFit(countRef, "strong");
  useWordFit(countRef, "span");

  return (
    <section className="lasha-access" aria-labelledby="lasha-access-title">
      <div className="lasha-access-copy">
        <p className="lasha-eyebrow">{t("brokerNetwork")}</p>
        <FittedHeading id="lasha-access-title"><span>{t("yourAccess")}</span> <span>{t("startsHere").replace(/\.$/, "")}</span></FittedHeading>
      </div>
      {/* No stock figure in public (Kemo, 3 November 2026): EXPLORE in blue over AVAILABLE RESIDENCES. */}
      <p className="lasha-access-count lasha-access-explore" ref={countRef}>
        <strong>{t("explore")}</strong>
        <span>{t("availableResidences")}</span>
      </p>
      <div className="lasha-access-actions">
        <button className="lasha-button lasha-button-primary" type="button" onClick={() => onOpenModal("register")}>
          {t("registerAsBroker")}<LashaArrow length={47} />
        </button>
        <button className="lasha-button lasha-button-outline" type="button" onClick={() => onOpenModal("materials")}>
          {t("downloadMaterials")}<LashaArrow length={47} />
        </button>
      </div>
    </section>
  );
}
