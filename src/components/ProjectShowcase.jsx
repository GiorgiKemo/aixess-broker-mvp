import { useRef, useState } from "react";
import { useWordFit } from "./useWordFit.js";
import { LashaArrow, LashaValue, routeLinkClick } from "./LashaHomeSections.jsx";
import { useLanguage } from "../i18n.jsx";
import { LASHA_HOME_COPY } from "../lasha-home-copy.js";
import { PROJECT_SHOWCASE_COPY } from "../project-showcase-copy.js";
import { FEATURED_PROJECT, UPCOMING_PROJECTS } from "../data/projects.js";
import "./project-showcase.css";

export function ProjectShowcase({ onNavigate, upcoming = UPCOMING_PROJECTS }) {
  const { locale } = useLanguage();
  const copy = LASHA_HOME_COPY[locale] || LASHA_HOME_COPY.en;
  // Russian ФИНАНСИРОВАНИЕ lost its last letter to a new line at 900px: the labels shrink together only then.
  const factsRef = useRef(null);
  useWordFit(factsRef, "dt", { words: true });
  const showcase = PROJECT_SHOWCASE_COPY[locale] || PROJECT_SHOWCASE_COPY.en;
  const [active, setActive] = useState(0);
  const project = FEATURED_PROJECT;
  const image = project.gallery[active];

  return (
    <section className="project-showcase" id="projects" aria-labelledby="project-showcase-title">
      <header className="project-showcase-head">
        <p className="lasha-eyebrow">{copy.projectEyebrow}</p>
        <h2 id="project-showcase-title">{copy.projectTitle}</h2>
      </header>

      <div className="project-feature">
        <div className="project-feature-gallery">
          <figure className="project-feature-media">
            <img
              src={image.src}
              srcSet={image.srcSet}
              sizes="(max-width: 899px) 100vw, 46vw"
              alt={showcase.imageAlt}
              loading="lazy"
              decoding="async"
            />
            <a className="project-feature-expand" href={image.src} target="_blank" rel="noreferrer" aria-label={copy.openImage}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" focusable="false">
                <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" />
              </svg>
            </a>
          </figure>
          <div className="project-thumbs" role="group" aria-label={copy.galleryLabel}>
            {project.gallery.map((item, index) => (
              <button
                type="button"
                key={item.thumb}
                className={index === active ? "is-active" : ""}
                aria-pressed={index === active}
                aria-label={copy.galleryImage.replace("{{n}}", String(index + 1))}
                onClick={(event) => {
                  setActive(index);
                  event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" });
                }}
                // A thumbnail reached with Tab scrolls fully into the strip too, focus ring included.
                onFocus={(event) => event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" })}
              >
                <img src={item.thumb} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </div>

        <div className="project-feature-side">
          <dl className="project-facts" ref={factsRef}>
            {copy.projectFacts.map(([value, label]) => (
              <div key={label}><dd><LashaValue value={value} /></dd><dt>{label}</dt></div>
            ))}
          </dl>
          <div className="project-card">
            <h3>{copy.projectName}</h3>
            <p>{copy.projectBody}</p>
            <p className="project-card-meta">{copy.projectMeta}</p>
            <div className="project-card-actions">
              {/* The project page, like Explore investments and the menu (16 October 2026). */}
              <a className="lasha-button lasha-button-primary" href="#residences" onClick={routeLinkClick(onNavigate, "residences")}>
                {copy.exploreProject}<LashaArrow length={26} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="project-upcoming">
          <h3>{showcase.next}</h3>
          <div className="project-upcoming-row">
            {upcoming.map((item) => (
              <article key={item.id}>
                <img src={item.image} alt="" loading="lazy" decoding="async" />
                <p className="project-upcoming-status">{item.location[locale] || item.location.en} · {showcase.comingSoon}</p>
                <h4>{item.name}</h4>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
