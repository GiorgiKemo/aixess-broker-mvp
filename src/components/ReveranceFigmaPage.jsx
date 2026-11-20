import { PORTAL_URL } from "../portal.js";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { REVERANCE_PROJECT_COPY } from "../reverance-project-copy.js";
import { REVERANCE_FIGMA_COPY } from "../reverance-figma-copy.js";
import { NETWORK_COPY } from "../network-copy.js";
import { FEATURED_PROJECT } from "../data/projects.js";
import { formatPrice } from "../currency.js";
import { getWorkbookAvailableCount } from "../data/reveranceInventory.js";
import MEDIA from "../data/reverance-figma-media.json";
import GALLERY_SIZES from "../data/project-gallery-sizes.json";
import { FitLines } from "./DubaiProjectPages.jsx";
import { LashaArrow } from "./LashaHomeSections.jsx";
import { Lightbox, useProjectInfoCopy } from "./ReveranceProjectInfo.jsx";
import { useWordFit } from "./useWordFit.js";
import "./reverance-figma.css";
import { ThemedImage } from "./ThemedImage.jsx";

// The Project Reverance page as Lasha drew it: Figma frame "REVERANCE" (file mdoKe84QEOkpDthDFO8pyy,
// node 405:327, 1440 × 10586; Kemo, 2 November 2026: "make reverance page to be exactly as on figma").
// reverance-figma.css sets every block in frame pixels from 900px and restacks it on phones.
// The site's own text stays (Kemo's rule for every Figma copy); REVERANCE_FIGMA_COPY holds the few
// headings the frame adds. Pictures: the hero keeps the themed official render, the amenities keep the
// official renders, and the frame's other pictures are cut from its 2x export
// (public/assets/projects/reverance-figma, /mnt/project-files/figma-REVERANCE@2x.png).

function figmaImage(slug) {
  const meta = MEDIA[slug];
  const url = (width) => `/assets/projects/reverance-figma/${slug}-${width}.webp`;
  return { src: url(meta.widths.at(-1)), srcSet: meta.widths.map((w) => `${url(w)} ${w}w`).join(", "), width: meta.width, height: meta.height };
}

function FigmaPicture({ slug, className, alt = "", sizes }) {
  const image = figmaImage(slug);
  return <img className={className} src={image.src} srcSet={image.srcSet} sizes={sizes} width={image.width} height={image.height} alt={alt} loading="lazy" decoding="async" />;
}

function galleryImage(slug) {
  const meta = GALLERY_SIZES[slug];
  const url = (width) => `/assets/projects/gallery/${slug}-${width}.webp`;
  return { src: url(meta.widths[Math.min(1, meta.widths.length - 1)]), srcSet: meta.widths.map((w) => `${url(w)} ${w}w`).join(", "), width: meta.width, height: meta.height };
}

function Eyebrow({ children, rule }) {
  return <p className="rv-eyebrow" style={{ "--rx": rule }}>{children}</p>;
}

// A title that wraps at Figma's line ends: each sentence on its own line ("BUILT FOR LIVING." /
// "POSITIONED FOR OWNERSHIP."), or before the given phrases when the text contains them.
function Title({ as: Tag = "h2", id, className, text, breaks = [], accentLast = false }) {
  const ref = useRef(null);
  useWordFit(ref);
  let lines = text.split(/(?<=[.!?])\s+(?=\S)/u);
  if (lines.length === 1 && breaks.length) {
    lines = [];
    let rest = text;
    for (const phrase of breaks) {
      const at = rest.indexOf(` ${phrase}`);
      if (at < 0) continue;
      lines.push(rest.slice(0, at));
      rest = rest.slice(at + 1);
    }
    lines.push(rest);
  }
  return (
    <Tag id={id} ref={ref} className={`rv-title ${className ?? ""}`}>
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index ? " " : null}
          <span className={accentLast && index === lines.length - 1 && lines.length > 1 ? "rv-accent" : undefined}>{line}</span>
        </Fragment>
      ))}
    </Tag>
  );
}

// Figma's own line ends inside a sentence: a break before each phrase the text contains (English).
function withBreaks(text, phrases = []) {
  const parts = [];
  let rest = text;
  for (const phrase of phrases) {
    const at = rest.indexOf(` ${phrase}`);
    if (at < 0) continue;
    parts.push(rest.slice(0, at), <br key={phrase} className="rv-break" />);
    rest = rest.slice(at + 1);
  }
  parts.push(rest);
  return parts;
}

function Icon({ name, className }) {
  return <span className={`rv-icon rv-icon-${name}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}

export function ReveranceFigmaHero({ header }) {
  const { t, locale } = useLanguage();
  const heroAlt = (REVERANCE_PROJECT_COPY[locale] || REVERANCE_PROJECT_COPY.en).heroAlt;
  return (
    <section className="lasha-page-hero rv-hero" aria-labelledby="residences-title">
      {header}
      {/* The REVERANCE frame's render (Figma sync, 19 November 2026); afternoon and night show the
          same render's graded versions with the lit windows (reverance-towers), aligned to it. */}
      <ThemedImage className="rv-hero-media" figma="reverance-hero" defaultWidth={2400} sizes="(max-width: 899px) 200vw, 117vw" alt={heroAlt} fetchPriority="high" decoding="async" />
      <div className="rv-frame rv-hero-copy">
        <Eyebrow rule={328}>{t("projectReveranceBatumi")}</Eyebrow>
        <FitLines as="h1" id="residences-title" className="rv-hero-title" lines={[t("oneBuilding"), t("yourNextMove")]} />
        <p className="rv-hero-text">{t("residenceRouteCopy")}</p>
      </div>
    </section>
  );
}

function Opportunity({ onOpenModal }) {
  const { locale } = useLanguage();
  const c = NETWORK_COPY[locale] || NETWORK_COPY.en;
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  const [eyebrow, title, subtitle, lead] = c.opportunity;
  const counts = [
    ["house", number(getWorkbookAvailableCount()), c.facts[1]],
    ["layers", number(15), c.facts[2]],
    ["building", number(2), c.facts[0]],
  ];
  return (
    <section className="rv-paper rv-opportunity" id="opportunity" aria-labelledby="opportunity-title">
      <figure className="rv-opp-figure"><FigmaPicture slug="rv-front" sizes="(max-width: 899px) 100vw, 44vw" /></figure>
      <div className="rv-frame">
        <Eyebrow rule={256}>{eyebrow}</Eyebrow>
        <Title id="opportunity-title" className="rv-opp-title" text={title} />
        <p className="rv-opp-subtitle">{subtitle}</p>
        <p className="rv-opp-lead">{lead}</p>
        <div className="rv-opp-stats">
          <div className="rv-opp-price">
            <p className="rv-opp-price-label"><Icon name="tag" /><span>{c.facts[3]}</span></p>
            <p className="rv-opp-price-value">{formatPrice(FEATURED_PROJECT.startingPrice, locale)}</p>
          </div>
          <dl className="rv-opp-counts">
            {counts.map(([icon, value, label]) => (
              <div key={label}><Icon name={icon} /><dd>{value}</dd><dt>{label}</dt></div>
            ))}
          </dl>
        </div>
        <div className="rv-opp-actions">
          {onOpenModal ? (
            <button type="button" className="rv-button" onClick={() => onOpenModal("register")}>
              <span>{c.inside}</span><LashaArrow length={41} />
            </button>
          ) : (
            <a className="rv-button" href={PORTAL_URL} data-portal="login"><span>{c.inside}</span><LashaArrow length={41} /></a>
          )}
          <p className="rv-opp-terms">{c.terms}</p>
        </div>
      </div>
    </section>
  );
}

const FACT_BREAKS = { 0: ["with just", "and flexible"] };

function ProjectFacts() {
  const { locale } = useLanguage();
  const copy = REVERANCE_PROJECT_COPY[locale] || REVERANCE_PROJECT_COPY.en;
  const fig = REVERANCE_FIGMA_COPY[locale] || REVERANCE_FIGMA_COPY.en;
  // The frame's grid: down payment and rental yield above, ownership and completion below.
  const order = [0, 2, 1, 3];
  return (
    <section className="rv-ink rv-facts" id="project-facts" aria-labelledby="project-facts-title">
      <figure className="rv-facts-figure"><FigmaPicture slug="rv-facts" sizes="(max-width: 899px) 100vw, 34vw" /></figure>
      <div className="rv-frame">
        <Eyebrow rule={216}>{fig.overviewEyebrow}</Eyebrow>
        <Title id="project-facts-title" className="rv-facts-title" text={copy.factsTitle} />
        <p className="rv-facts-lead">{copy.factsLead}</p>
        <dl className="rv-facts-grid">
          {order.map((index, cell) => {
            const [label, value, note] = copy.facts[index];
            return (
              <div key={label} className={`rv-fact rv-fact-${cell + 1}`}>
                <dt>{label}</dt>
                <dd><strong>{value}</strong><span>{withBreaks(note, FACT_BREAKS[index])}</span></dd>
              </div>
            );
          })}
        </dl>
        <div className="rv-facts-notes">
          <p>{copy.factsNote}</p>
          <p>{copy.currencyNote}{copy.eurNote && <> {copy.eurNote}</>}</p>
        </div>
      </div>
    </section>
  );
}

function ProjectDetails() {
  const { locale } = useLanguage();
  const fig = REVERANCE_FIGMA_COPY[locale] || REVERANCE_FIGMA_COPY.en;
  const { opportunity } = useProjectInfoCopy();
  const [availability, location, rental] = opportunity.highlights;
  const rows = [["kpi-building", availability], ["kpi-chart", rental], ["kpi-pin", location]];
  return (
    <section className="rv-band rv-details" id="project-details" aria-labelledby="project-details-title">
      <FigmaPicture slug="rv-kpi" className="rv-details-figure" sizes="(max-width: 899px) 100vw, 53vw" />
      <div className="rv-frame">
        <Eyebrow rule={216}>{fig.detailsEyebrow}</Eyebrow>
        <Title id="project-details-title" className="rv-details-title" text={fig.detailsTitle} />
        <dl className="rv-details-stats">
          {opportunity.stats.map(([value, label]) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
        </dl>
        <dl className="rv-details-rows">
          {rows.map(([icon, [label, text]]) => (
            <div key={label} className={`rv-details-row rv-details-${icon}`}>
              <Icon name={icon} />
              <dt>{label.split(/\s+/).map((word, i) => <span key={word + i}>{word}</span>)}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function WhyReverance() {
  const { residence, gallery } = useProjectInfoCopy();
  const [open, setOpen] = useState(null);
  const triggers = useRef({});
  const openGroup = open && residence.amenities.find(([group]) => group === open.group);
  const items = openGroup ? openGroup[2].map(([slug, caption, alt]) => [caption, slug, alt]) : [];
  const close = () => {
    const key = `${open.group}-${open.index}`;
    setOpen(null);
    window.setTimeout(() => triggers.current[key]?.focus({ preventScroll: true }), 0);
  };
  return (
    <section className="rv-paper rv-residence" id="residence" aria-labelledby="residence-title">
      <div className="rv-frame">
        <Eyebrow rule={216}>{residence.eyebrow}</Eyebrow>
        <Title id="residence-title" className="rv-residence-title" text={residence.title} />
        <h3 className="rv-amenities-title">{residence.amenitiesTitle}</h3>
        <ul className="rv-amenities">
          {residence.amenities.map(([group, , images]) => (
            <li key={group} className="rv-amenity-row">
              <h4 className="rv-visually-hidden">{group}</h4>
              {images.map(([slug, caption], index) => {
                const image = galleryImage(slug);
                return (
                  <figure key={slug} className={`rv-amenity rv-amenity-${index + 1}`}>
                    <button type="button" ref={(node) => { triggers.current[`${group}-${index}`] = node; }} onClick={() => setOpen({ group, index })} aria-label={`${residence.viewAmenity}: ${caption}`}>
                      <img src={image.src} srcSet={image.srcSet} sizes={index ? "(max-width: 899px) 50vw, 34vw" : "(max-width: 899px) 100vw, 55vw"} width={image.width} height={image.height} alt="" loading="lazy" decoding="async" />
                    </button>
                    <figcaption>{caption}</figcaption>
                  </figure>
                );
              })}
            </li>
          ))}
        </ul>
        <p className="rv-note rv-residence-note">{residence.renderNote}</p>
      </div>
      {open && <Lightbox items={items} index={open.index} onStep={(delta) => setOpen((current) => ({ ...current, index: (current.index + delta + items.length) % items.length }))} onClose={close} labels={gallery} />}
    </section>
  );
}

function Payment() {
  const { locale } = useLanguage();
  const fig = REVERANCE_FIGMA_COPY[locale] || REVERANCE_FIGMA_COPY.en;
  const { payment } = useProjectInfoCopy();
  const percent = (value) => new Intl.NumberFormat(locale, { style: "percent" }).format(value / 100);
  return (
    <section className="rv-paper rv-payment" id="payment" aria-labelledby="payment-title">
      <div className="rv-frame">
        <Eyebrow rule={240}>{payment.eyebrow}</Eyebrow>
        <Title id="payment-title" className="rv-payment-title" text={payment.title} />
        <p className="rv-payment-lead">{payment.lead}</p>
        <p className="rv-payment-total">{fig.total}</p>
        <ol className="rv-stages">
          {payment.stages.map(([value, title, body], index) => (
            <li key={title} className={`rv-stage rv-stage-${index + 1}`}>
              <strong>{percent(Number.parseInt(value, 10))}</strong>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <div className="rv-payment-notes">
          <p>{payment.bridge}</p>
          <p>{payment.note}</p>
        </div>
      </div>
    </section>
  );
}

function WhyBatumi() {
  const { locale } = useLanguage();
  const fig = REVERANCE_FIGMA_COPY[locale] || REVERANCE_FIGMA_COPY.en;
  const { batumi } = useProjectInfoCopy();
  const [sold, market, growth, rentYield, foreign] = batumi.stats;
  const listRef = useRef(null);
  useWordFit(listRef);
  return (
    <>
      <section className="rv-band rv-batumi" id="why-batumi" aria-labelledby="why-batumi-title">
        <figure className="rv-batumi-figure"><FigmaPicture slug="rv-batumi" sizes="(max-width: 899px) 100vw, 42vw" /></figure>
        <div className="rv-frame">
          <Eyebrow rule={151}>{batumi.eyebrow}</Eyebrow>
          <h2 className="rv-title rv-batumi-title" id="why-batumi-title" aria-label={batumi.title}>{fig.batumiLead}</h2>
          <ul className="rv-batumi-list" ref={listRef} aria-hidden="true">
            {fig.batumiPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
      </section>
      <section className="rv-mist rv-market" aria-label={batumi.eyebrow}>
        <div className="rv-frame">
          <dl className="rv-market-stats">
            <div className="rv-market-main"><dd>{market[0]}</dd><dt>{market[1]}</dt></div>
            {[sold, growth, rentYield, foreign].map(([value, label], index) => (
              <div key={label} className={`rv-market-cell rv-market-cell-${index + 1}`}><dd>{value}</dd><dt>{label}</dt></div>
            ))}
          </dl>
          <p className="rv-note rv-market-note">{batumi.source} {batumi.note}</p>
        </div>
      </section>
    </>
  );
}

function PurchaseBenefit() {
  const { locale } = useLanguage();
  const copy = REVERANCE_PROJECT_COPY[locale] || REVERANCE_PROJECT_COPY.en;
  const percent = (value) => new Intl.NumberFormat(locale, { style: "percent" }).format(value / 100);
  // The frame's bars: the blue part grows with the down payment.
  const tiers = [[20, 1, 83], [30, 2, 146], [40, 3, 201]];
  return (
    <section className="rv-paper rv-benefit" id="purchase-benefit" aria-labelledby="purchase-benefit-title">
      <div className="rv-frame">
        <div className="rv-benefit-copy">
          <Eyebrow rule={337}>{copy.benefitEyebrow}</Eyebrow>
          <Title id="purchase-benefit-title" className="rv-benefit-title" text={copy.benefitTitle} accentLast />
          <p className="rv-benefit-text">{copy.benefitCopy}</p>
        </div>
        <div className="rv-benefit-side">
          <ul className="rv-tiers">
            {tiers.map(([down, discount, bar]) => (
              <li key={down}>
                <p><strong>{percent(down)}</strong><span>{copy.downPayment}</span></p>
                <span className="rv-tier-bar" style={{ "--bar": bar }} aria-hidden="true" />
                <p><strong>{percent(discount)}</strong><span>{copy.discount}</span></p>
              </li>
            ))}
          </ul>
          <p className="rv-benefit-closing">{copy.benefitClosing}</p>
        </div>
      </div>
    </section>
  );
}

function Ownership() {
  const { ownership } = useProjectInfoCopy();
  return (
    <section className="rv-ink rv-ownership" id="ownership" aria-labelledby="ownership-title">
      <figure className="rv-ownership-figure"><FigmaPicture slug="rv-owner" sizes="(max-width: 899px) 100vw, 43vw" /></figure>
      <div className="rv-frame">
        <Eyebrow rule={269}>{ownership.eyebrow}</Eyebrow>
        <Title id="ownership-title" className="rv-ownership-title" text={ownership.title} breaks={["MARKET", "INTERNATIONAL"]} />
        <ul className="rv-ownership-items">
          {ownership.items.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}
        </ul>
        <p className="rv-note rv-ownership-note">{ownership.note}</p>
      </div>
    </section>
  );
}

// Numbers and one-line headings sit in fixed boxes of the frame (between its hairlines, beside its
// pictures). A translation wider than its box (Russian falls back to the wider AiXESS Head, German
// prices and "Mrd.") is set smaller until it fits; text that fits keeps the frame's size. Each group
// shares one size, so the three payment stages or the market figures stay alike.
const FIT_GROUPS = [
  [".rv-opp-price-value"],
  [".rv-opp-counts dd"],
  [".rv-fact dd strong", false],
  [".rv-details-stats dd"],
  [".rv-stage strong"],
  [".rv-stage h3"],
  [".rv-market-main dd"],
  [".rv-market-cell dd"],
  [".rv-market-main dt"],
  [".rv-batumi-title"],
  [".rv-tiers p:first-child strong"],
  [".rv-tiers p:last-child strong"],
];

function useFitBoxes(ref) {
  const { locale } = useLanguage();
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    let frame = 0;
    const fit = () => {
      FIT_GROUPS.forEach(([selector, shared = true]) => {
        const items = Array.from(root.querySelectorAll(selector));
        items.forEach((item) => item.style.removeProperty("font-size"));
        const ratios = items.map((item) => {
          const available = item.clientWidth;
          const needed = item.scrollWidth;
          return available && needed > available + 0.5 ? (available - 1) / needed : 1;
        });
        const groupRatio = Math.min(1, ...ratios);
        items.forEach((item, index) => {
          const ratio = shared ? groupRatio : ratios[index];
          if (ratio >= 1) return;
          item.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(item).fontSize) * ratio * 100) / 100}px`;
        });
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    let lastWidth = root.clientWidth;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (root.clientWidth === lastWidth) return;
      lastWidth = root.clientWidth;
      schedule();
    });
    observer?.observe(root);
    document.fonts?.ready?.then(schedule);
    document.fonts?.addEventListener?.("loadingdone", schedule);
    window.addEventListener("load", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [ref, locale]);
}

export function ReveranceFigmaSections({ onOpenModal }) {
  const ref = useRef(null);
  useFitBoxes(ref);
  return (
    <div className="rv-sections" ref={ref}>
      <Opportunity onOpenModal={onOpenModal} />
      <ProjectFacts />
      <ProjectDetails />
      <WhyReverance />
      <Payment />
      <WhyBatumi />
      <PurchaseBenefit />
      <Ownership />
    </div>
  );
}
