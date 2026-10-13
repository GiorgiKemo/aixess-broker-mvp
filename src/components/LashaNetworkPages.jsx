import { useLanguage } from "../i18n.jsx";
import { FittedHeading } from "./FittedHeading.jsx";
import { LashaArrow } from "./LashaHomeSections.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { LASHA_PAGES_COPY } from "../lasha-pages-copy.js";
import "./lasha-network-pages.css";
import { ThemedImage } from "./ThemedImage.jsx";

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

function SplitHero({ header, eyebrow, title, body, action, media, aside, className }) {
  return (
    <section className={`lnp-hero ${className}`}>
      {header}
      <div className="lnp-hero-panel">
        <p className="lasha-eyebrow lnp-eyebrow">{eyebrow}</p>
        <FittedHeading as="h1" className="lnp-hero-title">{title.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
        <p className="lnp-hero-body">{body}</p>
        {action}
      </div>
      <div className="lnp-hero-media">
        {media.family
          ? <ThemedImage family={media.family} defaultWidth={media.defaultWidth} sizes={media.sizes} style={{ "--lnp-position": media.position }} decoding="async" fetchPriority="high" />
          : <img src={image(`${media.src}-${media.width * 2}`)} srcSet={srcSet(media.src, media.width)} sizes={media.sizes} width={media.width} height={media.height} alt="" decoding="async" fetchPriority="high" />}
      </div>
      {aside}
    </section>
  );
}

export function AdvantagePageContent({ header }) {
  const { network, home, page } = useCopy();
  const [servicesEyebrow, servicesTitle] = network.services;
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
        {/* As on the homepage, Lasha's frame repeats the first card's line under all three titles. */}
        {network.startingPoints.map(([title], index) => (
          <article key={title}>
            <span className="lnp-rule" aria-hidden="true">
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <LashaArrow length={193} />
            </span>
            <h2>{title}</h2>
            <p>{network.startingPoints[0][1]}</p>
          </article>
        ))}
      </section>

      <section className="lnp-advantage-split" aria-labelledby="lnp-advantage-title">
        <img className="lnp-advantage-media" src={image("reverance-terrace-1312")} srcSet={srcSet("reverance-terrace", 656)} sizes="(max-width: 899px) 100vw, 46vw" width="656" height="679" alt="" loading="lazy" decoding="async" />
        <div className="lnp-advantage-panel">
          <p className="lnp-kicker">{network.advantage[0]}</p>
          <FittedHeading id="lnp-advantage-title" className="lnp-advantage-title">{splitBeforeLast(network.advantage[1]).map((line) => <span key={line}>{line}</span>)}</FittedHeading>
          <p className="lnp-advantage-subtitle">{page.advantageSubtitle}</p>
          <PageButton variant="dark" flow="login">{network.signIn}</PageButton>
        </div>
      </section>

      <section className="lnp-services" aria-labelledby="lnp-services-title">
        <p className="lnp-services-figure" aria-hidden="true">360°</p>
        <div className="lnp-services-copy">
          <p className="lnp-services-eyebrow">{servicesEyebrow}</p>
          <FittedHeading id="lnp-services-title">{splitBalanced(noStop(servicesTitle)).map((line) => <span key={line}>{line}</span>)}</FittedHeading>
        </div>
        <div className="lnp-services-claim">
          <FittedHeading as="p">{page.connectSupports.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
        </div>
      </section>
    </div>
  );
}

export function BrokerAccessPageContent({ header }) {
  const { locale, network, home, page } = useCopy();
  const [haveNetwork] = network.network.split(/(?<=\?)\s/);
  // Lasha's list repeats the sales line under CONNECTORS and drops the full stop on the first three.
  const people = network.people.map(([title, line], index) => [title, index === 3 ? network.people[1][1] : index < 3 ? noStop(line) : line]);
  const [lastTitle, lastLine] = network.steps[4];
  const steps = [...network.steps.slice(0, 4).map(([title, line]) => [title, noStop(line)]), [lastTitle, lastLine.split(/(?<=[.!?])\s/)[0].replace(/\.$/, "")]];
  return (
    <div className="lnp lnp-broker">
      <SplitHero
        className="lnp-hero-broker"
        header={header}
        eyebrow={home.aboutEyebrow}
        title={splitBrokerTitle(network.eligibility[1])}
        body={page.brokerIntro}
        media={{ family: "glass-architecture", defaultWidth: 800, position: "50% 30%", sizes: "(max-width: 899px) 100vw, 40vw" }}
        aside={
          <ol className="lnp-people">
            {people.map(([title, line], index) => (
              <li key={title}>
                <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
                <div><h2>{title}</h2><p>{line}</p></div>
              </li>
            ))}
          </ol>
        }
      />

      <section className="lnp-network" aria-labelledby="lnp-network-title">
        <FittedHeading id="lnp-network-title"><span>{haveNetwork}</span></FittedHeading>
        <div className="lnp-network-actions">
          <PageButton variant="primary" flow="register">{network.request}</PageButton>
          <PageButton variant="outline" flow="login">{network.signIn}</PageButton>
        </div>
      </section>

      <section className="lnp-commercial" aria-labelledby="lnp-commercial-title">
        <p className="lnp-commercial-eyebrow" id="lnp-commercial-title">{network.commercial[0]}</p>
        <div className="lnp-commercial-down">
          <p className="lnp-figure">10%</p>
          <FittedHeading><span>{page.downPayment}</span></FittedHeading>
          <p className="lnp-commercial-body">{page.commercialBody}</p>
        </div>
        <div className="lnp-commercial-commission">
          <p className="lnp-figure">100%</p>
          <FittedHeading>{page.commissionUnlocked.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
        </div>
        <img className="lnp-commercial-media" src={image("reverance-tower-1990")} srcSet={srcSet("reverance-tower", 995)} sizes="(max-width: 899px) 100vw, 42vw" width="995" height="589" alt="" loading="lazy" decoding="async" />
      </section>

      <section className="lnp-process" aria-labelledby="lnp-process-title">
        <div className="lnp-process-heading">
          <p className="lnp-process-eyebrow">{sentenceCase(network.process[0], locale)}</p>
          <FittedHeading id="lnp-process-title">{splitAfter(noStop(network.process[1]), 2).map((line) => <span key={line}>{line}</span>)}</FittedHeading>
        </div>
        <ol className="lnp-steps">
          {steps.map(([title, line], index) => (
            <li key={title}>
              <span className="lasha-index">{String(index + 1).padStart(2, "0")}</span>
              <FittedHeading as="h3"><span>{title}</span></FittedHeading>
              <p>{line}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// Lasha breaks the Advantage title before its last word: YOUR AIXESS / ADVANTAGE.
function splitBeforeLast(text) {
  const words = text.split(/\s+/);
  return words.length > 1 ? [words.slice(0, -1).join(" "), words.at(-1)] : [text];
}

// Two lines of about equal length: WE DON'T STOP / AT THE SALE.
function splitBalanced(text) {
  const words = text.split(/\s+/);
  let best = [text];
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const gap = Math.abs(lines[0].length - lines[1].length);
    if (gap < bestGap) { best = lines; bestGap = gap; }
  }
  return best;
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
