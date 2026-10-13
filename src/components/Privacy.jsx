import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { consentChoice, setConsent } from "../analytics.js";
import { PRIVACY_COPY } from "../privacy-copy.js";
import { LashaPageHero } from "./LashaHomeSections.jsx";
import "./privacy.css";
import { AixessLogo } from "./AixessLogo.jsx";

export function PrivacyControls({ page }) {
  const { locale } = useLanguage(); const copy = PRIVACY_COPY[locale];
  const [open, setOpen] = useState(() => page !== "admin" && !consentChoice());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const footerRef = useRef(null);
  const toggleRef = useRef(null);
  useEffect(() => { if (page !== "admin" && !consentChoice()) setOpen(true); }, [page]);
  useEffect(() => { const sync = () => setOpen(!consentChoice()); window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  useEffect(() => { setDetailsOpen(false); }, [page]);
  useEffect(() => {
    if (!detailsOpen) return undefined;
    const dismiss = (event) => {
      if (event.key === "Escape") {
        setDetailsOpen(false);
        toggleRef.current?.focus();
      }
    };
    const dismissOutside = (event) => {
      if (!footerRef.current?.contains(event.target)) setDetailsOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismissOutside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismissOutside);
    };
  }, [detailsOpen]);
  const choose = (value) => { setConsent(value); setOpen(false); };
  return <>
    <footer className={`privacy-footer ${page === "home" || page === "residences" ? "has-explorer" : ""}`} ref={footerRef}>
      <div className="privacy-footer-panel" id="privacy-footer-panel" hidden={!detailsOpen}>
        <div className="privacy-footer-brand"><AixessLogo className="privacy-footer-logo" /><span>© {new Date().getFullYear()}</span></div>
        <nav aria-label={copy.siteInfo}>
          <a href="#privacy" onClick={() => setDetailsOpen(false)}>{copy.policy}<span aria-hidden="true">↗</span></a>
          <button type="button" onClick={() => { setDetailsOpen(false); setOpen(true); }}>{copy.settings}<span aria-hidden="true">↗</span></button>
          <a href="#admin" onClick={() => setDetailsOpen(false)}>{copy.admin}<span aria-hidden="true">↗</span></a>
        </nav>
      </div>
      <button className="privacy-footer-toggle" type="button" ref={toggleRef} aria-expanded={detailsOpen} aria-controls="privacy-footer-panel" onClick={() => setDetailsOpen((value) => !value)}>
        {copy.siteInfo}<span aria-hidden="true">{detailsOpen ? "×" : "+"}</span>
      </button>
    </footer>
    {open && <section className="cookie-notice" aria-labelledby="cookie-title">
      <h2 id="cookie-title">{copy.title}</h2><p>{copy.copy} <a href="#privacy">{copy.policy}</a></p>
      <div className="cookie-actions"><button type="button" onClick={() => choose("rejected")}>{copy.reject}</button><button type="button" onClick={() => choose("accepted")}>{copy.accept}</button></div>
    </section>}
  </>;
}

export function PrivacyPage({ header }) {
  const { locale } = useLanguage(); const copy = PRIVACY_COPY[locale];
  return (
    <div className="route-page lasha-page privacy-route">
      <LashaPageHero header={header} eyebrow="AIXESS · 04.09.2026" title={copy.policy} />
      <article className="privacy-page lasha-page">{copy.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</article>
    </div>
  );
}
