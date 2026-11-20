import { PORTAL_URL } from "../portal.js";
import { useLayoutEffect, useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { LashaArrow } from "./LashaHomeSections.jsx";
import { useLineFit, useWordFit } from "./useWordFit.js";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { LASHA_PAGES_COPY } from "../lasha-pages-copy.js";
import { ADVANTAGE_SERVICES_COPY } from "../advantage-services-copy.js";
import "./lasha-network-pages.css";
import { ThemedImage } from "./ThemedImage.jsx";
import { BrokerGetStarted, BrokerPlatformHero, BrokerWorkspace } from "./InsightsToolsPages.jsx";

// AiXESS Advantage and Broker Access, built to Lasha Bakashvili's Figma frames (AIXESS
// ADVANTAGE 1440 × 1865 and BROKER ACCESS 1440 × 1800, shared by Kemo on 9 October 2026).
// Copy follows the frames word for word; frame typos (ACCES, RECUEST, COMERCIAL, selectet)
// are not copied. Headlines keep the site's AIXCO v4 faces.

const image = (name) => `/assets/projects/${name}.webp`;
// Lasha's renders come out of Figma at 1x; each is upscaled 4x (EDSR super-resolution, no
// retouching) and served at 1x, 2x and 3x so they stay sharp on Retina screens.
const srcSet = (name, width) => [1, 2, 3].map((scale) => `${image(`${name}-${width * scale}`)} ${width * scale}w`).join(", ");
const noStop = (text) => text.replace(/[.。]$/, "");
const sentenceCase = (text, locale) => {
  const lower = text.toLocaleLowerCase(locale);
  return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
};
const useCopy = () => {
  const { locale } = useLanguage();
  return {
    locale,
    network: NETWORK_COPY[locale] || NETWORK_COPY.en,
    home: LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en,
    page: LASHA_PAGES_COPY[locale] || LASHA_PAGES_COPY.en,
  };
};

// Request access and partner sign-in open the broker portal, as the header's Register and Login do.
function PageButton({ variant, flow, onClick, children }) {
  if (onClick) {
    return (
      <button
        type="button"
        className={`lasha-button lnp-button lasha-button-${variant}`}
        onClick={onClick}
        data-portal={flow === "register" ? "register" : "login"}
      >
        {children}<LashaArrow length={47} />
      </button>
    );
  }
  return (
    <a className={`lasha-button lnp-button lasha-button-${variant}`} href={PORTAL_URL} data-portal={flow === "register" ? "register" : "login"}>
      {children}<LashaArrow length={47} />
    </a>
  );
}

// Header controls take the colour of the ground under most of their width: the coloured hero
// panel's text colour over the panel, white over the render (16 October 2026 audits: in the
// afternoon the panel is sage, and white AIXESS, nav and MENU over it read at 2.2:1; at 1920px
// and in Polish some labels sat mostly on the render while their centre said otherwise). Which
// ones overlap depends on width and language.
const OVER_FIELD = ".brand, .desktop-nav > button, .nav-group > button, .time-theme-menu__button, .language-switcher-trigger, .login-button, .menu-toggle";
const overlap = (r, box) => Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
function useHeaderOverField(ref, locale) {
  useLayoutEffect(() => {
    const hero = ref.current;
    const panel = hero?.querySelector(":scope > .lnp-hero-panel");
    if (!panel) return undefined;
    const mark = () => {
      const box = panel.getBoundingClientRect();
      hero.querySelectorAll(`:scope > .site-header :is(${OVER_FIELD})`).forEach((item) => {
        const r = item.getBoundingClientRect();
        const y = r.top + r.height / 2;
        const onPanelRow = y >= box.top && y <= box.bottom;
        item.classList.toggle("is-over-field", r.width > 0 && onPanelRow && overlap(r, box) > r.width / 2);
      });
    };
    mark();
    document.fonts?.ready.then(mark);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(mark);
    observer.observe(hero);
    return () => observer.disconnect();
  }, [ref, locale]);
}

// Phones stack the panel over the render: the render takes the rest of the first screen, so the
// hero fills the screen. CSS needs the panel's height.
function usePanelHeight(ref) {
  useLayoutEffect(() => {
    const hero = ref.current;
    const panel = hero?.querySelector(":scope > .lnp-hero-panel");
    if (!panel) return undefined;
    const mark = () => hero.style.setProperty("--lnp-panel-h", `${panel.offsetHeight}px`);
    mark();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(mark);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [ref]);
}

function SplitHero({ header, eyebrow, title, body, action, media, className }) {
  const ref = useRef(null);
  const { locale } = useLanguage();
  useHeaderOverField(ref, locale);
  usePanelHeight(ref);
  return (
    <section ref={ref} className={`lnp-hero ${className}`}>
      {header}
      {/* The panel ends where the render starts on phones, and with the hero on wider screens. */}
      <div className="lnp-hero-panel">
        <div className="lnp-hero-copy">
          <p className="lasha-eyebrow lnp-eyebrow">{eyebrow}</p>
          <h1 className="lnp-hero-title">{title.map((line) => <span key={line}>{line}</span>)}</h1>
          <p className="lnp-hero-body">{body}</p>
          {action}
        </div>
      </div>
      <div className="lnp-hero-media">
        {media.figma
          ? <ThemedImage figma={media.figma} sizes={media.sizes} decoding="async" fetchPriority="high" />
          : media.family
          ? <ThemedImage family={media.family} defaultWidth={media.defaultWidth} sizes={media.sizes} style={{ "--lnp-position": media.position }} decoding="async" fetchPriority="high" />
          : <img src={image(`${media.src}-${media.width * 2}`)} srcSet={srcSet(media.src, media.width)} sizes={media.sizes} width={media.width} height={media.height} alt="" decoding="async" fetchPriority="high" />}
      </div>
    </section>
  );
}

export function AdvantagePageContent({ header, onOpenModal }) {
  const { locale, network, home, page } = useCopy();
  const care = ADVANTAGE_SERVICES_COPY[locale] || ADVANTAGE_SERVICES_COPY.en;
  // The panel holds the title in the frame's two lines above its line and button.
  const advantageTitleRef = useRef(null);
  useLineFit(advantageTitleRef, { lines: 2 });
  // The eight service titles share one size, small enough for the longest word to stay on screen
  // (Russian С\u00a0ФИНАНСИРОВАНИЕМ at 320px).
  const journeyRef = useRef(null);
  useWordFit(journeyRef, ".lnp-journey-item h3");
  return (
    <div className="lnp lnp-advantage">
      <SplitHero
        className="lnp-hero-advantage"
        header={header}
        eyebrow={home.aboutEyebrow}
        title={network.hero}
        body={network.intro}
        action={<PageButton variant="dark" flow="register" onClick={onOpenModal ? () => onOpenModal("register") : undefined}>{network.request}</PageButton>}
        media={{ figma: "advantage-hero", sizes: "(max-width: 899px) 130vw, 48vw" }}
      />

      <section className="lnp-starting" aria-label={network.startingPointsTitle}>
        {/* Each card has its own line rather than the frame's repeated first line. No numbers or arrow
            rules above the titles (Kemo, 28 October 2026). */}
        {network.startingPoints.map(([title, line]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{line}</p>
          </article>
        ))}
      </section>

      <section className="lnp-advantage-split" aria-labelledby="lnp-advantage-title">
        <ThemedImage className="lnp-advantage-media" figma="advantage-more" sizes="(max-width: 899px) 100vw, 84vw" alt="" loading="lazy" decoding="async" />
        <div className="lnp-advantage-panel">
          <p className="lnp-kicker">{network.advantage[0]}</p>
          <h2 id="lnp-advantage-title" className="lnp-advantage-title" ref={advantageTitleRef}>{splitBeforeLast(network.advantage[1]).map((line) => <span key={line}>{line}</span>)}</h2>
          <p className="lnp-advantage-subtitle">{page.advantageSubtitle}</p>
          <PageButton variant="dark" flow="login">{network.signIn}</PageButton>
        </div>
      </section>

      {/* AiXESS 360° Services (Kemo, 28 October 2026, from his image), in the page's own type and
          colours. It replaces Lasha's shorter 360° row, which said the same thing. */}
      <section className="lnp-care" aria-labelledby="lnp-care-title">
        <div className="lnp-care-head">
          <div>
            <p className="lnp-care-eyebrow">{care.eyebrow}</p>
            <h2 id="lnp-care-title">{care.title.map((line) => <span key={line}>{line}</span>)}</h2>
          </div>
          <div className="lnp-care-copy">
            <p className="lnp-care-subtitle">{care.subtitle}</p>
            <p className="lnp-care-intro">{care.intro}</p>
          </div>
        </div>
        {/* Lasha's octagon (AIXESS ADVANTAGE frame, Figma sync 19 November 2026): the eight services
            clockwise from the top left around "the complete property journey", each with its number,
            the frame's line icon, a rule, its title and line. Below 900px they follow as a list. */}
        <div className="lnp-journey">
          <img className="lnp-journey-octagon" src="/assets/figma/icons/care-journey.svg" width="549" height="296" alt="" aria-hidden="true" />
          <svg className="lnp-journey-lines" viewBox="0 0 1440 716" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {JOURNEY_LINES.map((points) => <polyline key={points} points={points} />)}
          </svg>
          <ol className="lnp-journey-list" ref={journeyRef}>
            {care.items.map(([title, line], index) => (
              <li key={title} className={`lnp-journey-item lnp-journey-item-${index + 1}`}>
                <span className="lnp-journey-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <img className="lnp-journey-icon" src={`/assets/figma/icons/${JOURNEY_ICONS[index]}.svg`} alt="" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

// One Broker Access page (Klem, 22 October 2026: Broker Tools is merged in), in her order: the
// platform hero, who can join, 10% – 100%, from access to commission, the workspace, three steps.
// The frame's "Have the network?" band is gone: its two buttons repeat the hero's.
export function BrokerAccessPageContent({ header, onOpenModal }) {
  const { t } = useLanguage();
  const { locale, network, page } = useCopy();
  // Both commercial headlines take the size the longest word fits at (ПЕРВОНАЧАЛЬНОГО, 31 October 2026).
  const commercialRef = useRef(null);
  useWordFit(commercialRef, "h2");
  // The five step titles share one size, small enough for the longest word to stay whole
  // (ПРИСОЕДИНЯЙТЕСЬ, PRÄSENTIEREN, PREDSTAVITE broke mid-word from 900px, 31 October 2026).
  const stepsRef = useRef(null);
  useWordFit(stepsRef, "h3");
  // The blue panel holds the title in the frame's lines (НЕОБЯЗАТЕЛЬНО was wider than the panel).
  const joinTitle = splitBrokerTitle(network.eligibility[1]);
  const joinTitleRef = useRef(null);
  useLineFit(joinTitleRef, { lines: joinTitle.length });
  // Lasha's list drops the full stop on the first three. CONNECTORS keeps its own line, not the
  // frame's repeat of the sales line (Kemo, 16 October 2026: no repeated text on a page).
  const people = network.people.map(([title, line], index) => [title, index < 3 ? noStop(line) : line]);
  const [lastTitle, lastLine] = network.steps[4];
  const steps = [...network.steps.slice(0, 4).map(([title, line]) => [title, noStop(line)]), [lastTitle, lastLine.split(/(?<=[.!?])\s/)[0].replace(/\.$/, "")]];
  return (
    <div className="lnp lnp-broker">
      <BrokerPlatformHero header={header} eyebrow={t("brokerAccessEyebrow")} onOpenModal={onOpenModal} />

      {/* Lasha's Broker Access hero (panel 657, render 385, list), now the page's second section. */}
      <section className="lnp-join" aria-labelledby="lnp-join-title">
        <div className="lnp-join-panel">
          <p className="lasha-eyebrow lnp-eyebrow">{network.eligibility[0]}</p>
          <h2 id="lnp-join-title" className="lnp-join-title" ref={joinTitleRef}>{joinTitle.map((line) => <span key={line}>{line}</span>)}</h2>
          <p className="lnp-hero-body">{page.brokerIntro}</p>
        </div>
        <div className="lnp-join-media">
          <ThemedImage figma="broker-join" defaultWidth={800} sizes="(max-width: 899px) 100vw, 27vw" alt="" loading="lazy" decoding="async" />
        </div>
        <ol className="lnp-people">
          {people.map(([title, line], index) => (
            <li key={title}>
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{title}</h3><p>{line}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lnp-commercial" aria-labelledby="lnp-commercial-title" ref={commercialRef}>
        <p className="lnp-commercial-eyebrow" id="lnp-commercial-title">{network.commercial[0]}</p>
        <div className="lnp-commercial-down">
          <p className="lnp-figure">10%</p>
          <h2><span>{page.downPayment}</span></h2>
          <p className="lnp-commercial-body">{page.commercialBody}</p>
        </div>
        <div className="lnp-commercial-commission">
          <p className="lnp-figure">100%</p>
          <h2>{page.commissionUnlocked.map((line) => <span key={line}>{line}</span>)}</h2>
        </div>
        <div className="lnp-commercial-frame">
          <ThemedImage className="lnp-commercial-media" figma="broker-commercial" sizes="(max-width: 899px) 100vw, 54vw" alt="" loading="lazy" decoding="async" />
        </div>
      </section>

      <section className="lnp-process" aria-labelledby="lnp-process-title">
        <div className="lnp-process-heading">
          <p className="lnp-process-eyebrow">{sentenceCase(network.process[0], locale)}</p>
          <h2 id="lnp-process-title">{splitAfter(noStop(network.process[1]), 2).map((line) => <span key={line}>{line}</span>)}</h2>
        </div>
        <ol className="lnp-steps" ref={stepsRef}>
          {steps.map(([title, line], index) => (
            <li key={title}>
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <h3><span>{title}</span></h3>
              <p>{line}</p>
            </li>
          ))}
        </ol>
      </section>

      <BrokerWorkspace />
      <BrokerGetStarted onOpenModal={onOpenModal} />
    </div>
  );
}

// The frame's line icons, exported from the file (public/assets/figma/icons), in service order.
const JOURNEY_ICONS = ["care-1-selection", "care-2-financing", "care-3-legal", "care-4-handover", "care-5-management", "care-6-rental", "care-7-accounting", "care-8-resale"];
// The frame's eight 2.5px connectors, in frame pixels from the top of the diagram (y 2114).
const JOURNEY_LINES = ["386,153 466,233", "1029,152 949,232", "466,460 386,540", "949,461 1029,541", "706,152 706,203", "706,489 706,540", "982,348 1033,348", "382,348 433,348"];

// Lasha breaks the Advantage title before its last word: YOUR AIXESS / ADVANTAGE.
function splitBeforeLast(text) {
  const words = text.split(/\s+/);
  return words.length > 1 ? [words.slice(0, -1).join(" "), words.at(-1)] : [text];
}

// "FROM ACCESS TO COMMISSION" → ["FROM ACCESS", "TO COMMISSION"]: break after the first n words.
function splitAfter(text, count) {
  const words = text.split(/\s+/);
  return words.length > count ? [words.slice(0, count).join(" "), words.slice(count).join(" ")] : [text];
}

// "YOU DON'T NEED TO BE A BROKER." → YOU DON'T / NEED TO BE / A BROKER. in English;
// translations split into three balanced lines.
function splitBrokerTitle(text) {
  const words = text.split(/\s+/);
  if (words.length < 3) return [text];
  if (words.join(" ") === "YOU DON'T NEED TO BE A BROKER.") return ["YOU DON’T", "NEED TO BE", "A BROKER."];
  const lines = [[], [], []];
  const total = text.length;
  let used = 0;
  words.forEach((word) => {
    const line = Math.min(2, Math.floor((used / total) * 3));
    lines[line].push(word);
    used += word.length + 1;
  });
  return lines.filter((line) => line.length).map((line) => line.join(" "));
}
