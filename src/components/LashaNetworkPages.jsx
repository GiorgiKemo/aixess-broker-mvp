import { useLayoutEffect, useRef } from "react";
import { useLanguage } from "../i18n.jsx";
import { LashaArrow } from "./LashaHomeSections.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { LASHA_PAGES_COPY } from "../lasha-pages-copy.js";
import { ADVANTAGE_SERVICES_COPY } from "../advantage-services-copy.js";
import "./lasha-network-pages.css";
import { ThemedImage } from "./ThemedImage.jsx";
import { ArrowsClockwise, ChartBar, Coins, FileText, Gear, HouseLine, Key, UsersThree } from "@phosphor-icons/react";
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

// Request access and partner sign-in open the Workwise broker flows, as the header's Register and Login do.
function PageButton({ variant, flow, children }) {
  const { locale } = useLanguage();
  const href = `https://workw.com/realestate/aixco/${flow === "register" ? "broker-signup" : "broker-login"}?lang=${encodeURIComponent(locale)}`;
  return (
    <a className={`lasha-button lnp-button lasha-button-${variant}`} href={href}>
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
        {media.family
          ? <ThemedImage family={media.family} defaultWidth={media.defaultWidth} sizes={media.sizes} style={{ "--lnp-position": media.position }} decoding="async" fetchPriority="high" />
          : <img src={image(`${media.src}-${media.width * 2}`)} srcSet={srcSet(media.src, media.width)} sizes={media.sizes} width={media.width} height={media.height} alt="" decoding="async" fetchPriority="high" />}
      </div>
    </section>
  );
}

export function AdvantagePageContent({ header }) {
  const { locale, network, home, page } = useCopy();
  const care = ADVANTAGE_SERVICES_COPY[locale] || ADVANTAGE_SERVICES_COPY.en;
  return (
    <div className="lnp lnp-advantage">
      <SplitHero
        className="lnp-hero-advantage"
        header={header}
        eyebrow={home.aboutEyebrow}
        title={network.hero}
        body={network.intro}
        action={<PageButton variant="dark" flow="register">{network.request}</PageButton>}
        media={{ family: "coastal-residence", position: "82% 50%", sizes: "(max-width: 899px) 130vw, 95vw" }}
      />

      <section className="lnp-starting" aria-label={network.startingPointsTitle}>
        {/* As on the homepage, each card has its own line rather than the frame's repeated first line. */}
        {network.startingPoints.map(([title, line], index) => (
          <article key={title}>
            <span className="lnp-rule" aria-hidden="true">
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <LashaArrow length={193} />
            </span>
            <h2>{title}</h2>
            <p>{line}</p>
          </article>
        ))}
      </section>

      <section className="lnp-advantage-split" aria-labelledby="lnp-advantage-title">
        <img className="lnp-advantage-media" src={image("reverance-terrace-1312")} srcSet={srcSet("reverance-terrace", 656)} sizes="(max-width: 899px) 100vw, 46vw" width="656" height="679" alt="" loading="lazy" decoding="async" />
        <div className="lnp-advantage-panel">
          <p className="lnp-kicker">{network.advantage[0]}</p>
          <h2 id="lnp-advantage-title" className="lnp-advantage-title">{splitBeforeLast(network.advantage[1]).map((line) => <span key={line}>{line}</span>)}</h2>
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
        {/* Kemo's round layout: the eight services sit on a ring around a terrace photo, clockwise
            from the top right, with their text outside the ring. Below 1200px the ring carries only
            the photo and badges, and the text follows as a list. */}
        <div className="lnp-care-ring">
          <div className="lnp-care-stage">
            <div className="lnp-care-hub" aria-hidden="true">
              <ThemedImage family="coastal-lifestyle" defaultWidth={800} sizes="(max-width: 1199px) 14rem, 30vw" alt="" loading="lazy" decoding="async" />
            </div>
            {CARE_DOTS.map(([x, y]) => <span key={`${x}${y}`} className="lnp-care-dot" style={{ "--x": x, "--y": y }} aria-hidden="true" />)}
            <ol className="lnp-care-list">
              {care.items.map(([title, line], index) => {
                const Icon = CARE_ICONS[index];
                const [x, y] = ringPoint(-67.5 + index * 45);
                return (
                  <li key={title} className={`${index < 4 ? "is-right" : "is-left"}${[0, 7].includes(index) ? " is-top" : ""}${[3, 4].includes(index) ? " is-bottom" : ""}`} style={{ "--x": x, "--y": y }}>
                    <span className="lnp-care-badge" aria-hidden="true"><Icon weight="light" /></span>
                    <div className="lnp-care-text">
                      <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
                      <h3>{title}</h3>
                      <p>{line}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
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
          <h2 id="lnp-join-title" className="lnp-join-title">{splitBrokerTitle(network.eligibility[1]).map((line) => <span key={line}>{line}</span>)}</h2>
          <p className="lnp-hero-body">{page.brokerIntro}</p>
        </div>
        <div className="lnp-join-media">
          <ThemedImage family="glass-architecture" defaultWidth={800} sizes="(max-width: 899px) 100vw, 27vw" style={{ "--lnp-position": "50% 30%" }} loading="lazy" decoding="async" />
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

      <section className="lnp-commercial" aria-labelledby="lnp-commercial-title">
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
        <img className="lnp-commercial-media" src={image("reverance-tower-1990")} srcSet={srcSet("reverance-tower", 995)} sizes="(max-width: 899px) 100vw, 42vw" width="995" height="589" alt="" loading="lazy" decoding="async" />
      </section>

      <section className="lnp-process" aria-labelledby="lnp-process-title">
        <div className="lnp-process-heading">
          <p className="lnp-process-eyebrow">{sentenceCase(network.process[0], locale)}</p>
          <h2 id="lnp-process-title">{splitAfter(noStop(network.process[1]), 2).map((line) => <span key={line}>{line}</span>)}</h2>
        </div>
        <ol className="lnp-steps">
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

// The 360° ring: one icon per service, in the order of Kemo's image.
const CARE_ICONS = [HouseLine, Coins, FileText, Key, Gear, UsersThree, ChartBar, ArrowsClockwise];
const ringPoint = (degrees) => [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)].map((value) => Number(value.toFixed(4)));
// Small dots on the ring halfway between services.
const CARE_DOTS = Array.from({ length: 8 }, (_, index) => ringPoint(-45 + index * 45));

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
