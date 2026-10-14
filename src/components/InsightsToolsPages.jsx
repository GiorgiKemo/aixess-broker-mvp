import { BookOpenText, Buildings, ChartBar, ChartLineUp, FilePdf, FolderOpen, TreeStructure, UsersThree } from "@phosphor-icons/react";
import { useLanguage } from "../i18n.jsx";
import { AIXCO_FAQ } from "../aixco-faq-copy.js";
import { INSIGHTS_TOOLS_COPY } from "../insights-tools-copy.js";
import { LashaArrow, LashaPageHero } from "./LashaHomeSections.jsx";
import "./insights-tools.css";
import { ThemedImage } from "./ThemedImage.jsx";

const asset = (path) => `/assets/${path}`;

function useCopy() {
  const { locale } = useLanguage();
  return INSIGHTS_TOOLS_COPY[locale] || INSIGHTS_TOOLS_COPY.en;
}

function SectionHeading({ id, eyebrow, title, copy, children }) {
  return (
    <div className="it-heading">
      <div>
        <p className="it-eyebrow">{eyebrow}</p>
        <h2 id={id}>{(Array.isArray(title) ? title : [title]).map((line) => <span key={line}>{line}</span>)}</h2>
        {copy && <p className="it-lead">{copy}</p>}
      </div>
      {children}
    </div>
  );
}

// Insights, from the left half of Klem's 12 October picture. Only Batumi has approved
// imagery, so the Dubai and Switzerland briefs are typographic until their pictures exist,
// and briefs without a published article say so instead of linking nowhere.
export function InsightsPageContent({ header, onOpenModal }) {
  const { locale } = useLanguage();
  const { insights: c } = useCopy();
  const faqs = AIXCO_FAQ[locale] || AIXCO_FAQ.en;
  const articleMedia = [
    { src: asset("projects/reverance-aerial-600.webp"), srcSet: `${asset("projects/reverance-aerial-600.webp")} 600w, ${asset("projects/reverance-aerial-1200.webp")} 1200w` },
    { family: "dubai-skyline", position: "72% 50%" },
    { family: "switzerland-lakeside", position: "70% 50%" },
  ];
  const resourceMedia = [
    { src: asset("projects/reverance-front-700.webp") },
    { icon: BookOpenText },
    { icon: ChartLineUp },
    { family: "coastal-lifestyle", position: "62% 60%" },
  ];
  // Brochures and the lifestyle guide go through the existing materials request;
  // buyer guides and market reports are not published yet.
  const requestable = [true, false, false, true];

  return (
    <>
      <LashaPageHero header={header} eyebrow={c.eyebrow} title={c.title} image="batumi-coast" imageAlt={c.heroAlt} copy={c.copy} variant="coastal" />
      <main className="page-main it-main">
        <section className="it-section it-ink" id="market-insights" aria-labelledby="it-market-title">
          <SectionHeading id="it-market-title" eyebrow={c.marketEyebrow} title={c.marketTitle} copy={c.marketCopy}>
            <button className="it-text-link" type="button" onClick={() => onOpenModal("login")}>{c.viewAll}<LashaArrow length={24} /></button>
          </SectionHeading>
          <div className="it-cards it-cards-3">
            {c.articles.map(([place, title, body], index) => (
              <article className="it-card" key={title}>
                <CardMedia media={articleMedia[index]} label={place} />
                <div className="it-card-body">
                  <p className="it-card-place">{place}</p>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <p className="it-card-status">{c.comingSoon}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="it-note">{c.viewAllNote}</p>
        </section>

        <section className="it-section it-paper" aria-labelledby="it-library-title">
          <SectionHeading id="it-library-title" eyebrow={c.libraryEyebrow} title={c.libraryTitle} copy={c.libraryCopy} />
          <div className="it-cards it-cards-4">
            {c.resources.map(([title, body], index) => (
              <article className="it-card it-card-light" key={title}>
                <CardMedia media={resourceMedia[index]} />
                <div className="it-card-body">
                  <h3>{title}</h3>
                  <p>{body}</p>
                  {requestable[index] ? (
                    <button className="it-text-link" type="button" onClick={() => onOpenModal("materials")}>{c.request}<LashaArrow length={24} /></button>
                  ) : (
                    <p className="it-card-status">{c.comingSoon}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Paper, not the blue mist band: the page now ends on the neutral contact footer (Klem, 14 October 2026). */}
        <section className="it-section it-paper it-faq-section" aria-labelledby="it-faq-title">
          <SectionHeading id="it-faq-title" eyebrow={c.faqEyebrow} title={c.faqTitle} />
          {/* Two independent columns in source order, so opening an answer never stretches the other column. */}
          <div className="it-faq">
            {[faqs.slice(0, Math.ceil(faqs.length / 2)), faqs.slice(Math.ceil(faqs.length / 2))].map((column, index) => (
              <div className="it-faq-column" key={index}>
                {column.map(([question, answer]) => (
                  <details key={question}>
                    <summary>{question}<span aria-hidden="true">+</span></summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </section>

      </main>
    </>
  );
}

function CardMedia({ media, label }) {
  if (!media) return <div className="it-card-media it-card-media-type" aria-hidden="true"><span>{label}</span></div>;
  if (media.icon) {
    const Icon = media.icon;
    return <div className="it-card-media it-card-media-type it-card-media-icon" aria-hidden="true"><Icon weight="light" /></div>;
  }
  return (
    <div className="it-card-media">
      {media.family ? (
        <ThemedImage family={media.family} defaultWidth={800} sizes="(max-width: 899px) 100vw, 30vw" style={{ objectPosition: media.position }} loading="lazy" decoding="async" />
      ) : (
        <img src={media.src} srcSet={media.srcSet} sizes="(max-width: 899px) 100vw, 30vw" alt="" loading="lazy" decoding="async" />
      )}
    </div>
  );
}

const FEATURE_ICONS = [Buildings, FilePdf, TreeStructure, UsersThree, ChartBar, FolderOpen];

// Previews are approved project imagery or neutral sketches with no figures, names or
// records: the real tools live behind the broker login, not on this public page.
function FeaturePreview({ index, label }) {
  if (index === 0) return <img className="it-preview-photo" src={asset("projects/reverance-front-700.webp")} alt="" loading="lazy" decoding="async" />;
  if (index === 1) return <img className="it-preview-plan" src={asset("reverance-pdf/A1305-plan.webp")} alt="" loading="lazy" decoding="async" />;
  if (index === 5) {
    return (
      <div className="it-preview-files">
        <img src={asset("reverance-pdf/A1305-render.webp")} alt="" loading="lazy" decoding="async" />
        <img src={asset("reverance-pdf/A1407-plan.webp")} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }
  return (
    <div className={`it-preview-sketch it-preview-sketch-${index}`} aria-hidden="true">
      <span className="it-preview-label">{label}</span>
      {index === 2 && <svg className="it-preview-network" viewBox="0 0 200 110" aria-hidden="true"><path d="M100 26 L46 62 M100 26 L100 62 M100 26 L154 62 M46 62 L22 94 M46 62 L70 94 M154 62 L130 94 M154 62 L178 94" /><circle cx="100" cy="26" r="11" /><circle cx="46" cy="62" r="8" /><circle cx="100" cy="62" r="8" /><circle cx="154" cy="62" r="8" />{[22, 70, 130, 178].map((x) => <circle key={x} cx={x} cy="94" r="6" />)}</svg>}
      {index === 3 && <><i /><i /><i /><i /></>}
      {index === 4 && <div className="it-preview-bars">{[38, 52, 46, 64, 72, 88].map((height) => <i key={height} style={{ height: `${height}%` }} />)}</div>}
    </div>
  );
}

// Broker Tools, from the right half of Klem's picture. The working calculators and the
// client PDF offer are broker-only (Klem's voice note, 12 October 2026), so this page only
// describes them and sends brokers to sign in or apply.
export function BrokerToolsPageContent({ header, onOpenModal }) {
  const { tools: c } = useCopy();
  return (
    <>
      <LashaPageHero header={header} eyebrow={c.eyebrow} title={c.title.map((line, index) => (index === c.title.length - 1 ? line.replace(/ (?=\S+$)/, "\u00a0") : line))} image="broker-tools-refined" copy={c.copy} variant="coastal">
        <div className="page-cta-row it-hero-actions">
          <button className="button button-primary" type="button" onClick={() => onOpenModal("register")}>{c.partner}<LashaArrow length={24} /></button>
          <button className="button button-ghost" type="button" onClick={() => onOpenModal("login")}>{c.login}</button>
        </div>
        <p className="it-hero-note">{c.access}</p>
      </LashaPageHero>
      <main className="page-main it-main">
        <section className="it-section it-paper" aria-labelledby="it-workspace-title">
          <div className="it-workspace-intro">
            <SectionHeading id="it-workspace-title" eyebrow={c.workspaceEyebrow} title={c.workspaceTitle} copy={c.workspaceCopy} />
            {/* Giorgi, 13 October 2026: a simple modern building in place of the old Reverance render. */}
            <ThemedImage className="it-workspace-photo" family="workspace-building" defaultWidth={800} sizes="(max-width: 899px) 100vw, 40vw" loading="lazy" decoding="async" />
          </div>
          <ol className="it-features">
            {c.features.map(([title, body], index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <li className="it-feature" key={title}>
                  <Icon className="it-feature-icon" aria-hidden="true" weight="light" />
                  <h3><span className="it-feature-index">{String(index + 1).padStart(2, "0")}.</span> {title}</h3>
                  <p>{body}</p>
                  <div className="it-feature-preview"><FeaturePreview index={index} label={c.previewLabel} /></div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="it-section it-ink it-steps" aria-labelledby="it-steps-title">
          <SectionHeading id="it-steps-title" eyebrow={c.stepsEyebrow} title={c.stepsTitle} />
          <ol className="it-step-list">
            {c.steps.map(([title, body], index) => (
              <li key={title}>
                <span className="lasha-index">{String(index + 1).padStart(2, "0")}.</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <button className="button button-primary" type="button" onClick={() => onOpenModal("register")}>{c.requestAccess}<LashaArrow length={24} /></button>
        </section>
      </main>
    </>
  );
}
