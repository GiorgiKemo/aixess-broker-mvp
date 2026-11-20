import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Globe } from "@phosphor-icons/react";
import { LanguageProvider, LANGUAGE_OPTIONS, useLanguage, localizeFieldValidation, clearFieldValidation } from "./i18n.jsx";
import { ProjectShowcase } from "./components/ProjectShowcase.jsx";
import { ProjectGallery, useProjectSectionFromHash } from "./components/ReveranceProjectInfo.jsx";
import { ReveranceFigmaHero, ReveranceFigmaSections } from "./components/ReveranceFigmaPage.jsx";
import { AdvantagePageContent, BrokerAccessPageContent } from "./components/LashaNetworkPages.jsx";
import { HomeAbout, HomeAccess, HomeHero, HomeMetrics, HomeStartingPoints, LashaPageHero } from "./components/LashaHomeSections.jsx";
import { TimeThemeMenu } from "./components/TimeThemeMenu.jsx";
import { ScrollToTopButton } from "./components/ScrollToTopButton.jsx";
import { InsightsPageContent } from "./components/InsightsToolsPages.jsx";
import { DowntownOnePage, DubaiProjectCards, TresoraPage } from "./components/DubaiProjectPages.jsx";
import "./components/lasha-home.css";
import "./components/lasha-pages.css";
import "./components/time-theme.css";
import "./components/scroll-to-top.css";
import { PrivacyControls, PrivacyPage } from "./components/Privacy.jsx";
import "./components/public-ui.css";
import "./components/public-spacing.css";
import "./components/figma-type.css";
import "./components/figma-home.css";
import "./components/figma-pages.css";
import "./components/figma-sync.css";
import { PRIVACY_COPY } from "./privacy-copy.js";
import { track, trackOutboundLink, flushAnalytics } from "./analytics.js";
import { AixessLogo } from "./components/AixessLogo.jsx";
import { useHeaderInk } from "./components/useHeaderInk.js";
import { CONTACT, CONTACT_COPY } from "./contact-copy.js";
import { ENQUIRY_COPY } from "./enquiry-copy.js";
import { OPEN_FORM_EVENT } from "./enquiry.js";
import { PORTAL_URL } from "./portal.js";
import { getBrochureDetails, hasDownloadAccess, grantDownloadAccess, triggerBrochureDownload } from "./utils/downloadAccess.js";

const AdminDashboard = lazy(() => import("./components/AdminDashboard.jsx"));

const ResidenceExplorer = lazy(() => import("./components/ResidenceExplorer").then((module) => ({
  default: module.ResidenceExplorer,
})));


// Location labels disclose their live projects; they are not page routes.
const PROJECT_MARKETS = [
  { key: "batumi", labelKey: "batumi", children: [
    { key: "residences", labelKey: "reveranceProjectNav" },
  ] },
  { key: "dubai", labelKey: "uaeDubai", children: [
    { key: "tresora", labelKey: "tresoraProjectNav" },
    { key: "downtown-one", labelKey: "downtownOneProjectNav" },
  ] },
];

const navItems = [
  { key: "why-aixess", labelKey: "aixessAdvantage" },
  { key: "broker-access", labelKey: "brokerAccess" },
  { key: "projects", labelKey: "projects", children: PROJECT_MARKETS },
  { key: "insights", labelKey: "insights" },
  // Contact is the footer every page ends with (Klem, 14 October 2026), not a page of its own.
  { key: "contact", labelKey: "contact" },
];

// Broker Tools is part of Broker Access now (Klem, 22 October 2026); old links land there.
const routeAliases = { resources: "insights", calculators: "broker-access", "broker-tools": "broker-access" };
const validRoutes = new Set(["home", ...navItems.filter(({ key, children }) => key !== "contact" && !children).map(({ key }) => key), ...PROJECT_MARKETS.flatMap(({ children }) => children.map(({ key }) => key)), "admin", "privacy"]);

export const PAGE_TITLES = {
  home: "AiXESS — Turn Your Network Into Opportunity",
  "why-aixess": "The AiXESS Advantage — Why AiXESS",
  residences: "Reverance Batumi Waterfront — Luxury Living | AiXESS",
  tresora: "TRESORA, Dubai Islands — Waterfront Residences | AiXESS",
  "downtown-one": "Downtown One, Dubai — Prime Investment | AiXESS",
  "broker-access": "Broker Access & Registration — AiXESS",
  insights: "Market Insights & Intelligence — AiXESS",
  privacy: "Privacy Policy — AiXESS",
  admin: "Admin Dashboard — AiXESS",
};

// Scrolls to the contact footer and moves focus there, so keyboard and screen-reader users land on it too.
function showContact(behavior = "smooth") {
  const footer = document.getElementById("contact");
  if (!footer) return false;
  footer.scrollIntoView({ behavior, block: "start" });
  footer.focus({ preventScroll: true });
  return true;
}


function routeFromLocation() {
  if (typeof window === "undefined") return "home";
  // Support both hash routes (#tresora) and clean paths (/tresora)
  const hashPart = window.location.hash.replace(/^#\/?/, "").split(/[?/]/)[0].trim().toLowerCase();
  const pathPart = window.location.pathname.replace(/^\/+|\/+$/g, "").split(/[?/]/)[0].trim().toLowerCase();
  const requestedRoute = hashPart || pathPart;
  const route = routeAliases[requestedRoute] || requestedRoute;
  // An old address shows the page it now lives on, under that page's own address.
  if (route !== requestedRoute && validRoutes.has(route)) window.history.replaceState(window.history.state, "", `${window.location.pathname}#${route}`);
  return validRoutes.has(route) ? route : "home";
}

function SiteHeader({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal, pageHeader = false }) {
  const { t, locale } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [openMarket, setOpenMarket] = useState(null);
  useEffect(() => { setProjectsOpen(false); setOpenMarket(null); }, [menuOpen, currentPage]);
  const headerRef = useRef(null);
  // Each label takes the ink that reads on the photo behind it, in every theme (19 November 2026).
  useHeaderInk(headerRef, [locale, currentPage]);
  const navigate = (page) => {
    setProjectsOpen(false);
    setOpenMarket(null);
    onToggleMenu(false);
    onNavigate(page);
  };

  return (
    <header ref={headerRef} className={`site-header ${pageHeader ? "page-site-header" : ""}`}>
      <button className="brand" type="button" aria-label={t("homeAria")} onClick={() => navigate("home")}>
        <AixessLogo />
      </button>

      <nav className="desktop-nav" aria-label={t("primaryNavigation")}>
        {navItems.map(({ key, labelKey, children }) => (children ? (
          <NavGroup key={key} item={{ key, labelKey, children }} currentPage={currentPage} onNavigate={navigate} open={!menuOpen && projectsOpen} onOpenChange={setProjectsOpen} />
        ) : (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {t(labelKey)}
          </button>
        )))}
      </nav>

      <div className="header-actions">
        <TimeThemeMenu onOpen={() => setLanguageOpen(false)} />
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <button
          className="button button-primary register-button"
          type="button"
          data-portal="register"
          onClick={() => onOpenModal?.("register")}
        >
          {t("register")}
        </button>
        <a className="button button-ghost login-button" href={PORTAL_URL} data-portal="login">{t("login")}</a>
      </div>

      {/* Phones and tablets keep v4's theme icon in the bar, beside the menu button. */}
      <TimeThemeMenu className="time-theme-menu--compact" />

      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => onToggleMenu(!menuOpen)}
      >
        {menuOpen ? t("close") : t("menu")}
      </button>

      {/* Rendered at the end of <body> so no hero's clipping or stacking can hide part of it
          (Kemo's iPhone cut the panel off at the bottom of the page photo). */}
      {typeof document !== "undefined" && createPortal(
      <div className={`mobile-nav lasha-menu ${menuOpen ? "is-open" : ""}`} id="mobile-navigation">
        <div className="lasha-menu-bar">
          <button className="brand" type="button" aria-label={t("homeAria")} tabIndex={menuOpen ? 0 : -1} onClick={() => navigate("home")}>
            <AixessLogo />
          </button>
          <button className="menu-toggle" type="button" aria-controls="mobile-navigation" aria-expanded={menuOpen} tabIndex={menuOpen ? 0 : -1} onClick={() => onToggleMenu(false)}>
            {t("close")}
          </button>
        </div>
        {navItems.map(({ key, labelKey, children }) => (
          <Fragment key={key}>
            <button
              className={`${children ? "lasha-menu-category" : ""} ${currentPage === key || children?.some((market) => market.children.some((child) => child.key === currentPage)) ? "is-active" : ""}`}
              type="button"
              aria-current={currentPage === key && !children ? "page" : undefined}
              aria-expanded={children ? projectsOpen : undefined}
              aria-controls={children ? `mobile-projects-${key}` : undefined}
              onClick={() => {
                if (children) { setProjectsOpen(!projectsOpen); setOpenMarket(null); }
                else navigate(key);
              }}
            >
              {t(labelKey)}
              {children && <CaretDown aria-hidden="true" weight="bold" />}
            </button>
            {children && <ul className="lasha-menu-projects" id={`mobile-projects-${key}`} hidden={!projectsOpen}>
              {children.map((market) => (
                <li key={market.key}>
                  <button
                    className={`lasha-menu-category ${market.children.some((child) => child.key === currentPage) ? "is-active" : ""}`}
                    type="button"
                    aria-expanded={openMarket === market.key}
                    aria-controls={`mobile-market-${market.key}`}
                    onClick={() => setOpenMarket(openMarket === market.key ? null : market.key)}
                  >
                    {t(market.labelKey)}<CaretDown aria-hidden="true" weight="bold" />
                  </button>
                  <ul className="lasha-menu-project-list" id={`mobile-market-${market.key}`} hidden={openMarket !== market.key}>
                    {market.children.map((child) => (
                      <li key={child.key}><button
                        className={`lasha-menu-sub ${currentPage === child.key ? "is-active" : ""}`}
                        type="button"
                        aria-current={currentPage === child.key ? "page" : undefined}
                        onClick={() => navigate(child.key)}
                      >
                        {t(child.labelKey)}
                      </button></li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>}
          </Fragment>
        ))}
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <button
          className="mobile-register"
          type="button"
          data-portal="register"
          onClick={() => {
            onToggleMenu(false);
            onOpenModal?.("register");
          }}
        >
          {t("register")}
        </button>
        <a className="mobile-login" href={PORTAL_URL} data-portal="login">{t("login")}</a>
      </div>,
      document.body)}
    </header>
  );
}

// Hover reveals the projects; the full label is also a keyboard/touch disclosure.
function NavGroup({ item, currentPage, onNavigate, open, onOpenChange }) {
  const { t } = useLanguage();
  const [openMarket, setOpenMarket] = useState(null);
  const close = () => { setOpenMarket(null); onOpenChange(false); };
  const groupRef = useRef(null);
  const listId = `nav-group-${item.key}`;
  const active = item.children.some((market) => market.children.some((child) => child.key === currentPage));

  const closeMarket = () => {
    const trigger = groupRef.current?.querySelector(".nav-market-trigger[aria-expanded='true']");
    setOpenMarket(null);
    trigger?.focus();
  };

  useEffect(() => {
    if (!open) { setOpenMarket(null); return undefined; }
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      close();
      groupRef.current?.querySelector(".nav-group-trigger")?.focus();
    };
    const onPointerDown = (event) => {
      if (!groupRef.current?.contains(event.target)) close();
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const go = (page) => {
    close();
    onNavigate(page);
  };

  return (
    <div
      className={`nav-group ${open ? "is-open" : ""}`}
      ref={groupRef}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") onOpenChange(true); }}
      onPointerLeave={() => { if (!groupRef.current?.contains(document.activeElement)) close(); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
      onKeyDown={(event) => {
        if (openMarket && (event.key === "Escape" || event.key === "ArrowLeft")) {
          event.preventDefault();
          event.stopPropagation();
          closeMarket();
        }
      }}
    >
      <button
        className={`nav-group-trigger ${active ? "is-active" : ""}`}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          onOpenChange(true);
          window.requestAnimationFrame(() => {
            const markets = groupRef.current?.querySelectorAll(".nav-market-trigger");
            markets?.[event.key === "ArrowUp" ? markets.length - 1 : 0]?.focus();
          });
        }}
      >
        {t(item.labelKey)}
        <CaretDown aria-hidden="true" weight="bold" />
      </button>
      <ul className="nav-group-menu" id={listId} hidden={!open}>
        {item.children.map((market) => (
          <li
            className="nav-market"
            key={market.key}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpenMarket(market.key); }}
            onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setOpenMarket((value) => value === market.key ? null : value); }}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMarket((value) => value === market.key ? null : value); }}
          >
            <button
              type="button"
              className={`nav-market-trigger ${market.children.some((child) => child.key === currentPage) ? "is-active" : ""}`}
              aria-expanded={openMarket === market.key}
              aria-controls={`nav-market-${market.key}`}
              onClick={() => setOpenMarket(openMarket === market.key ? null : market.key)}
              onKeyDown={(event) => {
                if (!["ArrowRight", "ArrowDown", "ArrowUp"].includes(event.key)) return;
                event.preventDefault();
                const row = event.currentTarget.closest(".nav-market");
                const last = event.key === "ArrowUp";
                setOpenMarket(market.key);
                window.requestAnimationFrame(() => {
                  const projects = row.querySelectorAll(".nav-market-menu button");
                  projects[last ? projects.length - 1 : 0]?.focus();
                });
              }}
            >
              {t(market.labelKey)}<CaretDown aria-hidden="true" weight="bold" />
            </button>
            <ul className="nav-group-menu nav-market-menu" id={`nav-market-${market.key}`} hidden={openMarket !== market.key}>
              {market.children.map((child) => (
                <li key={child.key}>
                  <button type="button" className={currentPage === child.key ? "is-active" : ""} aria-current={currentPage === child.key ? "page" : undefined} onClick={() => go(child.key)}>
                    {t(child.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LanguageSwitcher({ languageOpen, setLanguageOpen }) {
  const { t, locale, setLocale } = useLanguage();
  useEffect(() => {
    if (!languageOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLanguageOpen(false);
    };
    // A click anywhere else closes the list, like the theme menu and the projects dropdown. The
    // header and the phone menu each render a switcher sharing this state, so any switcher counts.
    const onPointerDown = (event) => {
      if (!event.target.closest?.(".language-switcher")) setLanguageOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [languageOpen, setLanguageOpen]);

  const chooseLanguage = (code) => {
    track("language_change");
    setLocale(code);
    setLanguageOpen(false);
  };

  return (
    <div className="language-switcher">
      <button
        className="language-switcher-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={languageOpen}
        aria-label={`${t("changeLanguage")}: ${locale.toUpperCase()}`}
        onClick={() => setLanguageOpen((open) => !open)}
      >
        <Globe aria-hidden="true" weight="bold" />
        <span>{locale.toUpperCase()}</span>
        <CaretDown aria-hidden="true" weight="bold" />
      </button>
      {languageOpen && (
        <div className="language-switcher-menu" role="listbox" aria-label={t("language")}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={locale === option.code}
              className={locale === option.code ? "is-active" : ""}
              onClick={() => chooseLanguage(option.code)}
            >
              <span>{option.label}</span><small>{option.shortLabel}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ type, context = {}, onClose, onSwitch }) {
  const { t, locale } = useLanguage();
  const privacy = PRIVACY_COPY[locale];
  const enquiry = ENQUIRY_COPY[locale] || ENQUIRY_COPY.en;
  const contactCopy = CONTACT_COPY[locale] || CONTACT_COPY.en;
  const asksMessage = type === "enquiry" || type === "contact";
  const [confirmationTo, setConfirmationTo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());

  const panelRef = useRef(null);
  const downloadLinkRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus moves into the dialog, Tab stays inside it, and closing returns focus to the button
  // that opened it, so keyboard and screen-reader users are not left on the page behind.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusable = () => [...(panelRef.current?.querySelectorAll("button:not([disabled]), input:not([tabindex='-1']), a[href]") || [])]
      .filter((element) => element.offsetParent !== null);
    const onKeyDown = (event) => {
      if (event.key === "Escape") { onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (!panelRef.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    (panelRef.current?.querySelector("input:not([tabindex='-1'])") || panelRef.current)?.focus({ preventScroll: true });
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!submitted || type !== "materials") return;
    const timer = window.setTimeout(() => {
      downloadLinkRef.current?.click();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [submitted, type]);

  const content = {
    register: {
      eyebrow: t("brokerNetwork"),
      title: t("registerModalTitle"),
      copy: t("registerModalCopy"),
      submit: t("requestBrokerAccess"),
    },
    login: {
      eyebrow: t("brokerAccess"),
      title: t("welcomeBack"),
      copy: t("loginModalCopy"),
      submit: t("login"),
    },
    materials: {
      eyebrow: t("projectReverance"),
      title: t("projectMaterials"),
      copy: t("projectMaterialsCopy"),
      submit: t("downloadMaterials"),
    },
    // A project request names its project and the button's own words (Request availability ...).
    enquiry: {
      eyebrow: context.project,
      title: context.request,
      copy: enquiry.copy,
      submit: enquiry.send,
    },
    contact: {
      eyebrow: contactCopy.eyebrow,
      title: contactCopy.title,
      copy: enquiry.copy,
      submit: enquiry.sendMessage,
    },
  }[type];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>{t("closeModal")}</button>

        {!submitted ? (
          <>
            <p className="modal-eyebrow">{content.eyebrow}</p>
            <h2 id="modal-title">{content.title}</h2>
            <p className="modal-copy">{content.copy}</p>

            <form
              onInvalidCapture={(event) => localizeFieldValidation(event, t)}
              onInputCapture={clearFieldValidation}
              className="access-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (submitting) return;
                const form = new FormData(event.currentTarget);
                setSubmitting(true);
                setSubmitError(false);
                const firstName = (form.get("firstName") || "").toString().trim();
                const surname = (form.get("surname") || "").toString().trim();
                const fullName = (type !== "login")
                  ? `${firstName} ${surname}`.trim()
                  : (form.get("name") || "").toString().trim();
                const phone = (form.get("phone") || "").toString().trim();
                const company = (form.get("company") || "").toString().trim();
                const email = (form.get("email") || "").toString().trim();
                const website = (form.get("website") || "").toString().trim();
                const privacyAccepted = form.get("privacy") === "on";
                const message = (form.get("message") || "").toString().trim();

                try {
                  const response = await fetch("/api/leads", {
                    signal: AbortSignal.timeout(15000),
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      id: requestId,
                      name: fullName,
                      firstName,
                      surname,
                      phone,
                      company,
                      email,
                      website,
                      locale,
                      kind: type === "materials" || asksMessage ? type : "broker",
                      message,
                      project: context.project,
                      place: context.place,
                      request: context.request,
                      requestEn: context.requestEn,
                      route: context.route,
                      page: window.location.href,
                      privacyAccepted,
                    }),
                  });
                  if (response.ok) {
                    const data = await response.json().catch(() => ({}));
                    if (data && data.saved === false) throw new Error("Not saved");
                    if (data?.confirmation) setConfirmationTo(email);
                  } else if (response.status !== 404 && response.status !== 405) {
                    if (type !== "materials") {
                      throw new Error("Submission failed");
                    }
                  }
                  if (type === "materials") {
                    grantDownloadAccess();
                  }
                  setSubmitted(true);
                  track("lead_submitted");
                } catch (err) {
                  if (type === "materials") {
                    grantDownloadAccess();
                    setSubmitted(true);
                    track("lead_submitted");
                  } else if (err.message === "Submission failed" || asksMessage) {
                    setSubmitError(true);
                  } else {
                    setSubmitted(true);
                    track("lead_submitted");
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {type !== "login" ? (
                <>
                  <div className="access-form-row">
                    <label>
                      <span>{t("firstName")}</span>
                      <input name="firstName" autoComplete="given-name" required placeholder={t("firstNamePlaceholder")} />
                    </label>
                    <label>
                      <span>{t("surname")}</span>
                      <input name="surname" autoComplete="family-name" required placeholder={t("surnamePlaceholder")} />
                    </label>
                  </div>
                  <label>
                    <span>{type === "contact" ? enquiry.phoneOptional : t("phoneNumber")}</span>
                    <input name="phone" type="tel" autoComplete="tel" required={type !== "contact"} placeholder={t("phonePlaceholder")} />
                  </label>
                  <label>
                    <span>{t("emailAddress")}</span>
                    <input name="email" type="email" autoComplete="email" required placeholder={t("emailPlaceholder")} />
                  </label>
                  <label>
                    <span>{t("companyOptional")}</span>
                    <input name="company" autoComplete="organization" placeholder={t("companyPlaceholder")} />
                  </label>
                  {asksMessage && (
                    <label>
                      <span>{type === "contact" ? enquiry.message : enquiry.messageOptional}</span>
                      <textarea name="message" rows={4} maxLength={5000} required={type === "contact"} placeholder={enquiry.messagePlaceholder} />
                    </label>
                  )}
                </>
              ) : (
                <>
                  {type !== "login" && (
                    <label>
                      <span>{t("fullName")}</span>
                      <input name="name" autoComplete="name" required placeholder={t("yourName")} />
                    </label>
                  )}
                  <label>
                    <span>{t("emailAddress")}</span>
                    <input name="email" type="email" autoComplete="email" required placeholder={t("emailPlaceholder")} />
                  </label>
                  {type === "login" && (
                    <label>
                      <span>{t("password")}</span>
                      <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
                    </label>
                  )}
                </>
              )}
              <label className="form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              <label className="privacy-acknowledgement"><input name="privacy" type="checkbox" required /><span>{privacy.acknowledgement} <a href="#privacy" target="_blank" rel="noopener">{privacy.policy}</a></span></label>
              {submitError && <p className="form-submit-error" role="alert">{privacy.failed}</p>}
              <button className="button button-primary modal-submit" type="submit" disabled={submitting}>{submitting ? privacy.sending : content.submit}</button>
            </form>

            {type === "login" && (
              <button className="modal-switch" type="button" onClick={() => onSwitch("register")}>
                {t("needBrokerAccess")}
              </button>
            )}
          </>
        ) : type === "materials" ? (
          <div className="modal-success modal-success--download">
            <p className="modal-eyebrow">{t("unlockDownloads")}</p>
            <h2>{t("materialsUnlockedTitle")}</h2>
            <p className="modal-copy">
              {t("materialsUnlockedCopy")}
            </p>
            <div className="modal-download-actions">
              <a
                ref={downloadLinkRef}
                href={getBrochureDetails(locale).href}
                download={getBrochureDetails(locale).fileName}
                target="_blank"
                rel="noopener"
                className="button button-primary modal-submit"
                onClick={() => {
                  track("resource_click", { target: "brochure" });
                }}
              >
                {t("downloadBrochurePdf")}
              </a>
              <button className="button button-ghost" type="button" onClick={onClose}>{t("closeModal")}</button>
            </div>
          </div>
        ) : (
          <div className="modal-success">
            <p className="modal-eyebrow">{t("requestReceived")}</p>
            <h2>{t("wellBeInTouch")}</h2>
            <p className="modal-copy">
              {confirmationTo ? enquiry.confirmationSent.replace("{{email}}", confirmationTo) : t("requestRecordedCopy")}
            </p>
            <button className="button button-primary" type="button" onClick={onClose}>{t("returnToAixess")}</button>
          </div>
        )}
      </section>
    </div>
  );
}

function PageHeader({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return <SiteHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} pageHeader />;
}

// Lasha's AiXESS Advantage and Broker Access frames (Figma, 9 October 2026).
function WhyAixessPage(props) {
  return (
    <div className="route-page lasha-page">
      <AdvantagePageContent header={<PageHeader {...props} />} onOpenModal={props.onOpenModal} />
    </div>
  );
}

function BrokerAccessPage(props) {
  return (
    <div className="route-page lasha-page">
      <BrokerAccessPageContent header={<PageHeader {...props} />} onOpenModal={props.onOpenModal} />
    </div>
  );
}

function InsightsPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="route-page lasha-page insights-page">
      <InsightsPageContent
        header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />}
        onOpenModal={onOpenModal}
      />
    </div>
  );
}

function ResidencesPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  useProjectSectionFromHash();
  // Lasha's Figma frame "REVERANCE" (Kemo, 2 November 2026: "make reverance page to be exactly as on
  // figma"), then the gallery and the Residence Explorer, which the frame does not draw.
  return (
    <div className="route-page lasha-page residences-page rv-page">
      <ReveranceFigmaHero header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />} />
      <main className="page-main">
        <div className="rp-contents">
          <ReveranceFigmaSections onOpenModal={onOpenModal} />
          <ProjectGallery />
        </div>
        <Suspense fallback={<div className="residence-explorer-loader" role="status">{t("preparingInteractive")}</div>}>
          <ResidenceExplorer liveInventoryTitle onBrokerAccess={() => onOpenModal("register")} />
        </Suspense>
      </main>
    </div>
  );
}

// The two Dubai projects (Kemo, 22 October 2026): each has its own route and page.
function DubaiProjectPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const header = <PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />;
  return (
    // Downtown One is built from the TRESORA page's parts, so it takes its styles too.
    <div className={`route-page lasha-page dubai-project-page ${currentPage}-page${currentPage === "downtown-one" ? " tresora-page" : ""}`}>
      {currentPage === "tresora" ? <TresoraPage header={header} /> : <DowntownOnePage header={header} />}
    </div>
  );
}

function HomePage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="lasha-home">
      <HomeHero onNavigate={onNavigate}>
        <SiteHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      </HomeHero>

      <HomeMetrics />
      <HomeAbout />
      <ProjectShowcase onNavigate={onNavigate} />
      <DubaiProjectCards onNavigate={onNavigate} />

      {/* The Residence Explorer lives on the Reverance project page only (Kemo, 21 October 2026). */}
      <HomeStartingPoints />
      <HomeAccess onOpenModal={onOpenModal} />
    </div>
  );
}

function AppContent() {
  const { locale, t } = useLanguage();
  const [activeModal, setActiveModal] = useState(null);
  const [modalContext, setModalContext] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(routeFromLocation);

  // The MENU panel exists only while the header is collapsed (below 1400px, the same breakpoint as
  // the CSS). Widening the window past it, or pressing Escape, closes the panel so no stale open
  // state or scroll lock is left behind. While it is open the page behind is inert, so keyboard
  // focus stays in the panel, which sits outside #root.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const root = document.getElementById("root");
    const wide = window.matchMedia?.("(min-width: 1400px)");
    const closeIfWide = () => { if (wide?.matches) setMenuOpen(false); };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
    };
    closeIfWide();
    if (root) root.inert = true;
    document.querySelector(".lasha-menu .lasha-menu-bar .menu-toggle")?.focus({ preventScroll: true });
    wide?.addEventListener?.("change", closeIfWide);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      if (root) root.inert = false;
      wide?.removeEventListener?.("change", closeIfWide);
      document.removeEventListener("keydown", closeOnEscape);
      const toggle = document.querySelector(".site-header .menu-toggle");
      const active = document.activeElement;
      if (toggle?.offsetParent && (!active || active === document.body || active.closest(".lasha-menu"))) toggle.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  // Project request buttons and the footer's Write to us open the enquiry / contact form.
  useEffect(() => {
    const onOpenForm = (event) => {
      const detail = event.detail || {};
      setMenuOpen(false);
      setModalContext(detail);
      setActiveModal(detail.type === "contact" ? "contact" : "enquiry");
      track("modal_open", { modal: detail.type === "contact" ? "contact" : "enquiry", page: currentPage });
    };
    window.addEventListener(OPEN_FORM_EVENT, onOpenForm);
    return () => window.removeEventListener(OPEN_FORM_EVENT, onOpenForm);
  }, [currentPage]);

  const openModal = (type) => {
    setMenuOpen(false);
    track("modal_open", { modal: type, page: currentPage });
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "screen_view", {
        app_name: "AiXESS",
        screen_name: `Modal: ${type}`,
        page_route: currentPage,
      });
    }
    if (type === "login") {
      track("portal_login_click");
      window.location.assign(PORTAL_URL);
      return;
    }
    if (type === "register") {
      track("portal_register_click");
      setActiveModal("register");
      return;
    }
    if (type === "materials") {
      track("materials_open");
      if (hasDownloadAccess()) {
        triggerBrochureDownload(locale);
        return;
      }
      setActiveModal("materials");
      return;
    }
    setActiveModal(type);
  };

  const navigatePage = (page) => {
    setMenuOpen(false);
    if (page === "contact") {
      track("navigation", { destination: "contact" });
      // After the menu has closed and the page behind it is no longer inert.
      window.setTimeout(() => showContact(), 50);
      return;
    }
    const nextPage = validRoutes.has(page) ? page : "home";
    track("navigation", { destination: nextPage });
    if (nextPage === currentPage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", nextPage === "home" ? window.location.pathname : `${window.location.pathname}#${nextPage}`);
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // A #contact link opens the homepage at its contact footer, once the page above it has taken its
  // height (fonts and photos).
  useEffect(() => {
    if (window.location.hash.toLowerCase() !== "#contact") return undefined;
    const timers = [0, 400, 1200].map((delay) => window.setTimeout(() => showContact("auto"), delay));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      if (window.location.hash.toLowerCase() === "#contact") {
        setMenuOpen(false);
        showContact();
        return;
      }
      setCurrentPage(routeFromLocation());
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    const pageTitle = PAGE_TITLES[currentPage] || PAGE_TITLES.home;
    if (typeof document !== "undefined") {
      document.title = pageTitle;
    }
    const pageView = () => {
      track("page_view", { page: currentPage });
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        const fullPath = window.location.pathname + (window.location.hash || (currentPage === "home" ? "" : `#${currentPage}`));
        window.gtag("config", "G-JM3QXPQCFL", {
          page_title: pageTitle,
          page_location: window.location.href,
          page_path: fullPath,
        });
        window.gtag("event", "page_view", {
          page_title: pageTitle,
          page_location: window.location.href,
          page_path: fullPath,
          page_route: currentPage,
          page_language: locale,
        });
      }
    };
    pageView();
    window.addEventListener("aixess:consent", pageView);
    return () => window.removeEventListener("aixess:consent", pageView);
  }, [currentPage, locale]);

  useEffect(() => {
    const handleSubrouteTrack = () => {
      if (typeof window !== "undefined" && typeof window.gtag === "function" && window.location.hash) {
        const pageTitle = PAGE_TITLES[currentPage] || PAGE_TITLES.home;
        window.gtag("event", "page_view", {
          page_title: pageTitle,
          page_location: window.location.href,
          page_path: window.location.pathname + window.location.hash,
          page_route: currentPage,
          page_language: locale,
        });
      }
    };
    window.addEventListener("hashchange", handleSubrouteTrack);
    return () => window.removeEventListener("hashchange", handleSubrouteTrack);
  }, [currentPage, locale]);

  useEffect(() => {
    const visibility = () => { if (document.visibilityState === "hidden") flushAnalytics(); };
    document.addEventListener("click", trackOutboundLink);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flushAnalytics);
    return () => { document.removeEventListener("click", trackOutboundLink); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", flushAnalytics); };
  }, []);

  return (
    <main className="site-shell">
      {currentPage === "home" && <HomePage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "why-aixess" && <WhyAixessPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "residences" && <ResidencesPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {(currentPage === "tresora" || currentPage === "downtown-one") && <DubaiProjectPage key={currentPage} {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "broker-access" && <BrokerAccessPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "insights" && <InsightsPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "privacy" && <PrivacyPage header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />} />}
      {currentPage === "admin" && <Suspense fallback={<p role="status">{t("loadingAdmin")}</p>}><AdminDashboard /></Suspense>}
      {currentPage !== "admin" && <ScrollToTopButton page={currentPage} />}
      <PrivacyControls page={currentPage} />

      {activeModal && (
        <Modal key={`${activeModal}-${modalContext.request || ""}`} type={activeModal} context={modalContext} onClose={() => setActiveModal(null)} onSwitch={setActiveModal} />
      )}
    </main>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
