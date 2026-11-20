import { useEffect, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import { consentChoice, setConsent } from "../analytics.js";
import { PRIVACY_COPY } from "../privacy-copy.js";
import { LashaArrow, LashaPageHero } from "./LashaHomeSections.jsx";
import { CONTACT, CONTACT_COPY } from "../contact-copy.js";
import "./privacy.css";
import "./site-footer.css";
import { AixessLogo } from "./AixessLogo.jsx";
import { siteFormClick } from "../enquiry.js";

export function PrivacyControls({ page }) {
  const { locale } = useLanguage(); const copy = PRIVACY_COPY[locale];
  const [open, setOpen] = useState(() => page !== "admin" && !consentChoice());
  useEffect(() => { if (page !== "admin" && !consentChoice()) setOpen(true); }, [page]);
  useEffect(() => { const sync = () => setOpen(!consentChoice()); window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  const choose = (value) => { setConsent(value); setOpen(false); };
  return <>
    {page !== "admin" && <SiteFooter onCookieSettings={() => setOpen(true)} />}
    {open && <section className="cookie-notice" aria-labelledby="cookie-title">
      <h2 id="cookie-title">{copy.title}</h2><p>{copy.copy} <a href="#privacy">{copy.policy}</a></p>
      <div className="cookie-actions"><button type="button" onClick={() => choose("rejected")}>{copy.reject}</button><button type="button" onClick={() => choose("accepted")}>{copy.accept}</button></div>
    </section>}
  </>;
}

// Every public page ends on this neutral footer (Klem, 14 October 2026: the page "can't end with
// blue"; "We need to add also Contact"): AIXCO's verified contact details, then the legal links,
// cookie settings and admin access that the floating Site info disclosure used to hold.
function SiteFooter({ onCookieSettings }) {
  const { locale } = useLanguage();
  const copy = PRIVACY_COPY[locale];
  const contact = CONTACT_COPY[locale] || CONTACT_COPY.en;
  const mailto = `mailto:${CONTACT.email}`;
  return (
    <footer className="site-footer" id="contact" aria-labelledby="site-contact-title" tabIndex={-1}>
      <div className="site-footer-contact">
        <div className="site-footer-intro">
          <p className="lasha-eyebrow">{contact.eyebrow}</p>
          <h2 id="site-contact-title">{contact.title}</h2>
          <p>{contact.copy}</p>
        </div>
        <dl className="site-footer-details">
          <div><dt>{contact.email}</dt><dd><a href={mailto}>{CONTACT.email}</a></dd></div>
          <div><dt>{contact.office}</dt><dd><address>{CONTACT.company}{CONTACT.lines.map((line, index) => <span key={line}><br />{index === CONTACT.lines.length - 1 ? `${line}, ${contact.country}` : line}</span>)}</address></dd></div>
          <div className="site-footer-write"><a className="button button-primary" href={mailto} onClick={siteFormClick({ type: "contact" })} aria-haspopup="dialog">{contact.write}<LashaArrow length={24} /></a></div>
        </dl>
      </div>
      <div className="site-footer-legal">
        <div className="site-footer-brand"><AixessLogo className="site-footer-logo" /><span>© {new Date().getFullYear()}</span></div>
        <nav aria-label={copy.siteInfo}>
          <a href="#privacy">{copy.policy}</a>
          <button type="button" onClick={onCookieSettings}>{copy.settings}</button>
          <a href="#admin">{copy.admin}</a>
        </nav>
      </div>
    </footer>
  );
}

// The skyline render's sky is pale left of its tower, so header labels there turn ink by day and
// in the afternoon (see useHeaderOnLightSky).
const PRIVACY_LIGHT_SKY = { themes: "day afternoon", ranges: [[0, 0.55]] };

export function PrivacyPage({ header }) {
  const { locale } = useLanguage(); const copy = PRIVACY_COPY[locale];
  return (
    <div className="route-page lasha-page privacy-route">
      <LashaPageHero header={header} eyebrow="AIXESS · 04.09.2026" title={copy.policy} lightSky={PRIVACY_LIGHT_SKY} />
      <article className="privacy-page lasha-page">{copy.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</article>
    </div>
  );
}
