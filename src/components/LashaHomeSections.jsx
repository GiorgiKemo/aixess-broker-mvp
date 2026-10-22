import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { FittedHeading } from "./FittedHeading.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { HOME_HERO_LINES } from "../project-showcase-copy.js";
import { ThemedImage } from "./ThemedImage.jsx";
import { ScrollDownCue } from "./ScrollDownCue.jsx";

// Lasha's hairline arrows (traced from the Figma frame); sized by the parent's CSS.
export function LashaArrow({ className = "lasha-arrow", length = 24 }) {
  return (
    <svg className={className} viewBox={`0 0 ${length} 8`} fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
      <path d={`M0 4H${length - 0.6}`} />
      <path d={`M${length - 3.8} 0.8L${length - 0.6} 4L${length - 3.8} 7.2`} strokeLinecap="round" strokeLinejoin="round" />
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
          // Dubai skyline in the current theme's light (Benji and Giorgi, 13 October 2026); see themePhotos.js.
          family="dubai-skyline"
          // Portrait phones draw the photo 1.4 × the hero's height and portrait tablets 1.75 ×
          // (lasha-home.css), so it is about 2–2.5 × the screen height wide; 100vw would pick a soft file.
          sizes="(max-width: 899px) and (orientation: portrait) and (min-width: 600px) 255vh, (max-width: 899px) and (orientation: portrait) 205vh, 100vw"
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
        <ScrollDownCue className="lasha-hero-scroll-cue" />
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

// From 900px on a landscape window, the hero's copy shows whole on the first screen (Kemo, 19 October
// 2026: the Insights subtitle ran off the bottom of a short window). CSS sizes the title by the
// window's height; a longer translation that still runs past the bottom shrinks the title (through
// --hero-title-fit) until the last line or button ends a little above the window's lower edge.
export function useHeroCopyFitsScreen(ref, locale) {
  useLayoutEffect(() => {
    const hero = ref.current;
    const title = hero?.querySelector(".lasha-page-hero-title");
    const copy = hero?.querySelector(".lasha-page-hero-copy");
    if (!title || !copy || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(min-width: 900px) and (min-aspect-ratio: 1/1)");
    let frame = 0;
    const fit = () => {
      title.style.removeProperty("--hero-title-fit");
      if (!query.matches) return;
      // The scroll-down cue sits under the copy at the foot of the screen, so the copy stops above it.
      const cue = hero.querySelector(":scope > .lasha-page-hero-cue");
      const limit = window.innerHeight - (cue ? cue.offsetHeight + 8 : Math.min(24, window.innerHeight * 0.03));
      for (let pass = 0; pass < 4; pass += 1) {
        const last = Math.max(...Array.from(copy.children, (child) => child.getBoundingClientRect().bottom));
        const overflow = last - hero.getBoundingClientRect().top - limit;
        if (overflow <= 0.5) return;
        const size = parseFloat(getComputedStyle(title).fontSize);
        const height = title.getBoundingClientRect().height;
        if (!size || !height) return;
        const next = Math.max(size * 0.55, size * (height - overflow - 1) / height);
        title.style.setProperty("--hero-title-fit", `${Math.floor(next * 100) / 100}px`);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    document.fonts?.ready.then(schedule);
    window.addEventListener("resize", schedule);
    query.addEventListener?.("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      query.removeEventListener?.("change", schedule);
    };
  }, [ref, locale]);
}

// Inner pages open with the homepage's language: the site header floating over a
// Reverance render, a blue eyebrow and an oversized headline.
export function LashaPageHero({ header, eyebrow, title, titleAs: Title = "h1", copy, image = "skyline", imageAlt = "", variant, lightSky, children }) {
  const lines = Array.isArray(title) ? title : [title];
  const media = PAGE_HERO_IMAGES[image] ?? PAGE_HERO_IMAGES.skyline;
  const style = { "--hero-position": media.position, "--hero-position-phone": media.phonePosition ?? media.position };
  const ref = useRef(null);
  const { locale } = useLanguage();
  useHeaderOnLightSky(ref, lightSky?.ranges, locale);
  useHeroCopyFitsScreen(ref, locale);
  return (
    <section ref={ref} className={`lasha-page-hero${variant ? ` lasha-page-hero-${variant}` : ""}`} data-light-sky={lightSky?.themes}>
      {header}
      {media.family ? (
        <ThemedImage className="lasha-page-hero-media" family={media.family} sizes={media.sizes ?? pageHeroSizes(media.aspect)} style={style} alt={imageAlt} fetchPriority="high" decoding="async" />
      ) : (
        <img className="lasha-page-hero-media" {...pageHeroSources(media)} sizes="100vw" style={style} alt={imageAlt} decoding="async" />
      )}
      <div className="lasha-page-hero-copy">
        {eyebrow && <p className="lasha-eyebrow">{eyebrow}</p>}
        <Title className="lasha-page-hero-title">{lines.map((line) => <span key={line}>{line}</span>)}</Title>
        {copy && <p className="lasha-page-hero-text">{copy}</p>}
        {children}
      </div>
      <div className="lasha-page-hero-cue"><ScrollDownCue /></div>
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
      <img
        className="lasha-about-media"
        src="/assets/projects/reverance-entrance-lasha-754.webp"
        srcSet="/assets/projects/reverance-entrance-lasha-377.webp 377w, /assets/projects/reverance-entrance-lasha-754.webp 754w, /assets/projects/reverance-entrance-lasha-1508.webp 1508w"
        sizes="53vw"
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

export function HomeStartingPoints() {
  const { locale } = useLanguage();
  const network = NETWORK_COPY[locale] || NETWORK_COPY.en;
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const [lead, accent] = copy.startingTitle;

  return (
    <section className="lasha-starting" aria-labelledby="lasha-starting-title">
      <p className="lasha-eyebrow">{network.introTagline.replace(/\.$/, "")}</p>
      <h2 id="lasha-starting-title"><span>{keepPhraseTogether(lead)}</span> <span className="lasha-accent">{accent}</span></h2>
      <div className="lasha-starting-grid">
        {/* Each card has its own line (Kemo, 16 October 2026: no repeated text on a page), though
            Lasha's frame repeated the first card's line under all three titles. */}
        {network.startingPoints.map(([title, line], index) => (
          <article key={title}>
            <span className="lasha-starting-rule" aria-hidden="true">
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <LashaArrow length={193} />
            </span>
            <h3>{title}</h3>
            <p>{line}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeAccess({ availableResidences, onOpenModal }) {
  const { t } = useLanguage();

  return (
    <section className="lasha-access" aria-labelledby="lasha-access-title">
      <div className="lasha-access-copy">
        <p className="lasha-eyebrow">{t("brokerNetwork")}</p>
        <FittedHeading id="lasha-access-title"><span>{t("yourAccess")}</span> <span>{t("startsHere").replace(/\.$/, "")}</span></FittedHeading>
      </div>
      <p className="lasha-access-count">
        <strong>{availableResidences}</strong>
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
