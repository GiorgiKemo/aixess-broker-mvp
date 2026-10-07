import { useLanguage } from "../i18n.jsx";
import { FittedHeading } from "./FittedHeading.jsx";
import { NETWORK_COPY } from "../network-copy.js";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { HOME_HERO_LINES } from "../project-showcase-copy.js";

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

// Lasha's AIXESS wordmark, traced from the frame's hero logo (139.5 × 52 at 1440px).
export function LashaWordmark({ className }) {
  return (
    <svg className={className} viewBox="69 189 141 54" fill="currentColor" role="img" aria-label="AIXESS">
      <path d="M100.196 215.543C94.5316 218.361 91.7434 220.629 91.7434 220.629L95.3944 241.524L88.8801 241.574L86.1294 224.838C81.4031 229.548 77.7896 235.047 76.3892 241.574L70 241.524L79.0774 190.376L86.1794 190.351C86.1794 190.351 90.6056 214.578 91.1182 217.397C89.1302 218.386 87.6423 219.201 85.6042 220.629C85.1916 218.249 82.6034 204.306 82.6034 204.306L78.4523 227.945C83.8412 222.332 91.9309 217.146 100.196 215.543Z" />
      <path d="M139.756 241.386L133.092 241.574L128.378 225.301L123.777 241.524L117.075 241.449L125.09 215.255L116.588 190.476L123.765 190.338L128.491 205.183L133.017 190.388L139.744 190.413L131.517 214.829L139.756 241.386Z" />
      <path d="M208.712 235.962C208.55 240.91 202.698 242.952 196.784 241.587C194.033 240.948 192.133 238.68 192.058 235.837L191.833 225.865H197.384L197.422 233.958C197.422 235.749 198.397 236.989 199.96 237.102C201.673 237.227 203.023 236.112 203.011 234.158V226.792C202.986 224.337 201.861 221.844 200.36 219.927L194.984 213.025C192.496 209.83 191.458 206.135 191.545 202.089C191.658 197.065 191.558 191.528 196.884 190.363C198.997 189.9 201.248 189.912 203.373 190.363C206.124 190.952 207.962 193.307 208.012 196.163L208.175 205.371L202.911 205.421L202.773 197.88C202.748 196.364 201.56 195.186 200.31 195.136C199.06 195.086 197.522 196.001 197.509 197.566L197.472 204.018C197.472 206.072 198.597 208.077 199.81 209.655L205.512 217.021C207.925 220.14 209.075 223.861 208.95 227.794L208.687 235.949L208.712 235.962Z" />
      <path d="M180.155 241.374C177.617 242.163 175.053 242.113 172.615 241.637C169.889 241.111 167.826 238.868 167.776 236.012L167.564 225.878L173.065 225.853L173.165 234.158C173.19 235.962 174.303 237.102 175.829 237.139C177.354 237.177 178.717 236.187 178.704 234.321L178.679 226.617C178.679 224.299 177.542 221.844 176.141 220.04L170.79 213.112C168.314 209.906 167.201 206.198 167.264 202.114C167.301 199.746 167.339 197.366 167.864 195.124C168.977 190.351 173.966 189.361 178.954 190.338C181.68 190.877 183.656 193.182 183.718 195.988L183.931 205.408L178.617 205.458L178.504 198.03C178.479 196.451 177.517 195.261 176.204 195.136C174.691 194.986 173.24 196.038 173.228 197.817L173.165 203.166C173.14 205.609 174.166 207.876 175.629 209.78L181.48 217.384C185.231 222.257 185.056 229.46 184.418 235.812C184.168 238.267 182.705 240.597 180.18 241.386L180.155 241.374Z" />
      <path d="M158.924 217.334L152.772 217.359V236.826H161.312V241.537L146.396 241.524V190.376L161.225 190.338L161.287 195.474H152.772L152.76 212.386L158.849 212.411L158.924 217.334Z" />
      <path d="M109.286 190.351H102.334V241.549H109.286V190.351Z" />
    </svg>
  );
}

export function HomeHero({ children }) {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const lines = HOME_HERO_LINES[locale] ?? HOME_HERO_LINES.en;

  return (
    <section className="lasha-hero" id="project">
      {children}
      <div className="lasha-hero-frame">
        <img
          className="lasha-hero-media"
          src="/assets/projects/reverance-skyline-1440.webp"
          srcSet="/assets/projects/reverance-skyline-720.webp 720w, /assets/projects/reverance-skyline-1440.webp 1440w, /assets/projects/reverance-skyline-2160.webp 2160w"
          sizes="100vw"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="lasha-hero-copy">
          <FittedHeading as="h1" fillLines maxLineRatio={0.64}>{lines.map((line) => <span key={line}>{line}</span>)}</FittedHeading>
          <p>{copy.heroSubtitle}</p>
          <a className="lasha-hero-cta" href="#projects">{copy.heroCta}<LashaArrow length={24} /></a>
        </div>
      </div>
    </section>
  );
}

// Each inner page opens on its own Reverance render (Kemo, 7 October 2026: not the same image everywhere).
const PAGE_HERO_IMAGES = {
  skyline: { src: "reverance-skyline-1440", srcSet: "reverance-skyline-720 720w, reverance-skyline-1440 1440w, reverance-skyline-2160 2160w", position: "72% 30%" },
  crown: { src: "reverance-hero-1200", srcSet: "reverance-hero-600 600w, reverance-hero-1200 1200w", position: "70% 22%" },
  entrance: { src: "reverance-entrance-1200", srcSet: "reverance-entrance-600 600w, reverance-entrance-1200 1200w", position: "62% 58%" },
  front: { src: "reverance-front-1400", srcSet: "reverance-front-700 700w, reverance-front-1400 1400w", position: "70% 18%" },
  facade: { src: "reverance-facade-1200", srcSet: "reverance-facade-600 600w, reverance-facade-1200 1200w", position: "60% 40%" },
  aerial: { src: "reverance-aerial-1200", srcSet: "reverance-aerial-600 600w, reverance-aerial-1200 1200w", position: "70% 30%" },
};
const projectImage = (name) => `/assets/projects/${name}.webp`;

// Inner pages open with the homepage's language: the site header floating over a
// Reverance render, a blue eyebrow and an oversized headline.
export function LashaPageHero({ header, eyebrow, title, titleAs: Title = "h1", copy, image = "skyline", children }) {
  const lines = Array.isArray(title) ? title : [title];
  const media = PAGE_HERO_IMAGES[image] ?? PAGE_HERO_IMAGES.skyline;
  return (
    <section className="lasha-page-hero">
      {header}
      <img
        className="lasha-page-hero-media"
        src={projectImage(media.src)}
        srcSet={media.srcSet.split(", ").map((entry) => `/assets/projects/${entry.replace(" ", ".webp ")}`).join(", ")}
        sizes="100vw"
        style={{ objectPosition: media.position }}
        alt=""
        decoding="async"
      />
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

export function HomeStartingPoints() {
  const { locale } = useLanguage();
  const network = NETWORK_COPY[locale] || NETWORK_COPY.en;
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  const [lead, accent] = copy.startingTitle;

  return (
    <section className="lasha-starting" aria-labelledby="lasha-starting-title">
      <p className="lasha-eyebrow">{network.introTagline.replace(/\.$/, "")}</p>
      <h2 id="lasha-starting-title"><span>{lead}</span> <span className="lasha-accent">{accent}</span></h2>
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
