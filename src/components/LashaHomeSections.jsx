import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { FittedHeading } from "./FittedHeading.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { HOME_HERO_LINES } from "../project-showcase-copy.js";
import { ThemedImage } from "./ThemedImage.jsx";

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

export function HomeHero({ children }) {
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

  return (
    <section className="lasha-hero" id="project" data-media-ready={mediaReady ? "" : undefined}>
      {children}
      <div className="lasha-hero-frame">
        <ThemedImage
          ref={mediaRef}
          className="lasha-hero-media"
          // Dubai skyline in the current theme's light (Benji and Giorgi, 13 October 2026); see themePhotos.js.
          family="dubai-skyline"
          // Phones crop the photo to the hero's full height, so it is drawn about 1.45 × the
          // screen height wide; asking for 100vw there picked an upscaled, soft image.
          sizes="(max-width: 899px) and (orientation: portrait) 145vh, 100vw"
          fetchPriority="high"
          decoding="async"
          onLoad={() => setMediaReady(true)}
          onError={() => setMediaReady(true)}
        />
        <div className="lasha-hero-copy">
          <FittedHeading as="h1" fillLines maxLineRatio={260 / 423}>{lines.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
          <p>{copy.heroSubtitle}</p>
          <a className="lasha-hero-cta" href="#projects">{copy.heroCta}<LashaArrow length={24} /></a>
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
  "coastal-city": { family: "coastal-city", aspect: 16 / 9, position: "62% 45%", phonePosition: "70% 50%" },
  // Broker Tools: design 1A Coastal Classic (14 October 2026), copy over the sky and sea on the
  // left, the terrace building on the right.
  // Its hero is at least the screen's height on portrait screens (so the photo is drawn about
  // 1.8 × the height wide) and about 86% of it on 4:3 screens.
  "coastal-classic": { family: "coastal-classic", aspect: 16 / 9, position: "100% 50%", phonePosition: "58% 50%", sizes: "(max-aspect-ratio: 1/1) 180vh, (max-aspect-ratio: 3/2) 154vh, 100vw" },
  // Selected Opportunities: the first AiXESS homepage render (Kemo, 13 October 2026).
  opportunities: { family: "opportunities", aspect: 1, position: "70% 30%", phonePosition: "60% 30%" },
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

// Inner pages open with the homepage's language: the site header floating over a
// Reverance render, a blue eyebrow and an oversized headline.
export function LashaPageHero({ header, eyebrow, title, titleAs: Title = "h1", copy, image = "skyline", variant, children }) {
  const lines = Array.isArray(title) ? title : [title];
  const media = PAGE_HERO_IMAGES[image] ?? PAGE_HERO_IMAGES.skyline;
  const style = { "--hero-position": media.position, "--hero-position-phone": media.phonePosition ?? media.position };
  return (
    <section className={`lasha-page-hero${variant ? ` lasha-page-hero-${variant}` : ""}`}>
      {header}
      {media.family ? (
        <ThemedImage className="lasha-page-hero-media" family={media.family} sizes={media.sizes ?? pageHeroSizes(media.aspect)} style={style} fetchPriority="high" decoding="async" />
      ) : (
        <img className="lasha-page-hero-media" {...pageHeroSources(media)} sizes="100vw" style={style} alt="" decoding="async" />
      )}
      <div className="lasha-page-hero-copy">
        {eyebrow && <p className="lasha-eyebrow">{eyebrow}</p>}
        <Title className="lasha-page-hero-title">{lines.map((line) => <span key={line}>{line}</span>)}</Title>
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
        {/* Lasha's frame repeats the first card's line under all three titles. */}
        {network.startingPoints.map(([title], index) => (
          <article key={title}>
            <span className="lasha-starting-rule" aria-hidden="true">
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <LashaArrow length={193} />
            </span>
            <h3>{title}</h3>
            <p>{network.startingPoints[0][1]}</p>
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
