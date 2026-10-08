import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Globe } from "@phosphor-icons/react";
import { LanguageProvider, LANGUAGE_OPTIONS, useLanguage, localizeFieldValidation, clearFieldValidation } from "./i18n.jsx";
import { FittedHeading } from "./components/FittedHeading.jsx";
import { NetworkSections } from "./components/NetworkSections.jsx";
import { NETWORK_COPY } from "./network-copy.js";
import { ProjectShowcase } from "./components/ProjectShowcase.jsx";
import { HomeAbout, HomeAccess, HomeHero, HomeMetrics, HomeStartingPoints, LashaPageHero } from "./components/LashaHomeSections.jsx";
import { TimeThemeMenu } from "./components/TimeThemeMenu.jsx";
import "./components/lasha-home.css";
import "./components/lasha-pages.css";
import "./components/time-theme.css";
const Calculators = lazy(() => import("./components/Calculators.jsx"));
import { PrivacyControls, PrivacyPage } from "./components/Privacy.jsx";
import { PRIVACY_COPY } from "./privacy-copy.js";
import { track, trackOutboundLink, flushAnalytics } from "./analytics.js";
import { getWorkbookAvailableCount } from "./data/reveranceInventory.js";

const availableResidenceCount = getWorkbookAvailableCount();

const AdminDashboard = lazy(() => import("./components/AdminDashboard.jsx"));

const ResidenceExplorer = lazy(() => import("./components/ResidenceExplorer").then((module) => ({
  default: module.ResidenceExplorer,
})));


const navItems = [
  { key: "why-aixess", labelKey: "aixessAdvantage" },
  { key: "broker-access", labelKey: "brokerAccess" },
  { key: "residences", labelKey: "selectedOpportunities" },
  { key: "insights", labelKey: "insights" },
  { key: "broker-tools", labelKey: "brokerTools" },
];

const routeAliases = { resources: "insights", calculators: "broker-tools" };
const validRoutes = new Set(["home", ...navItems.map(({ key }) => key), "admin", "privacy"]);

const WORKWISE_BROKER_PATHS = {
  login: "/realestate/aixco/broker-login",
  register: "/realestate/aixco/broker-signup",
};

function workwiseBrokerUrl(type, locale = "en") {
  return `https://workw.com${WORKWISE_BROKER_PATHS[type]}?lang=${encodeURIComponent(locale)}`;
}

function routeFromLocation() {
  if (typeof window === "undefined") return "home";
  const requestedRoute = window.location.hash.replace(/^#/, "").split("?")[0].trim().toLowerCase();
  const route = routeAliases[requestedRoute] || requestedRoute;
  return validRoutes.has(route) ? route : "home";
}

function SiteHeader({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal, pageHeader = false }) {
  const { t, locale } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const navigate = (page) => {
    onToggleMenu(false);
    onNavigate(page);
  };

  return (
    <header className={`site-header ${pageHeader ? "page-site-header" : ""}`}>
      <button className="brand" type="button" aria-label={t("homeAria")} onClick={() => navigate("home")}>
        <img src="/assets/aixess-logo-white-cropped.webp" alt="AiXESS" width="2783" height="546" />
      </button>

      <nav className="desktop-nav" aria-label={t("primaryNavigation")}>
        {navItems.map(({ key, labelKey }) => (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {t(labelKey)}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <TimeThemeMenu onOpen={() => setLanguageOpen(false)} />
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <a className="button button-primary register-button" href={workwiseBrokerUrl("register", locale)}>{t("register")}</a>
        <a className="button button-ghost login-button" href={workwiseBrokerUrl("login", locale)}>{t("login")}</a>
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
            <img src="/assets/aixess-logo-white-cropped.webp" alt="AiXESS" width="2783" height="546" />
          </button>
          <button className="menu-toggle" type="button" aria-controls="mobile-navigation" aria-expanded={menuOpen} tabIndex={menuOpen ? 0 : -1} onClick={() => onToggleMenu(false)}>
            {t("close")}
          </button>
        </div>
        {navItems.map(({ key, labelKey }) => (
          <button
            className={currentPage === key ? "is-active" : ""}
            type="button"
            aria-current={currentPage === key ? "page" : undefined}
            key={key}
            onClick={() => navigate(key)}
          >
            {t(labelKey)}
          </button>
        ))}
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <a className="mobile-register" href={workwiseBrokerUrl("register", locale)}>{t("register")}</a>
        <a className="mobile-login" href={workwiseBrokerUrl("login", locale)}>{t("login")}</a>
      </div>,
      document.body)}
    </header>
  );
}

function LanguageSwitcher({ languageOpen, setLanguageOpen }) {
  const { t, locale, setLocale } = useLanguage();
  useEffect(() => {
    if (!languageOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLanguageOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

function Modal({ type, onClose, onSwitch }) {
  const { t, locale } = useLanguage();
  const privacy = PRIVACY_COPY[locale];
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

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
      submit: t("requestMaterials"),
    },
  }[type];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
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
                try {
                  const response = await fetch("/api/leads", {
                    signal: AbortSignal.timeout(15000),
                    method: "POST", headers: { "content-type": "application/json" },
                    body: JSON.stringify({ id: requestId, name: form.get("name"), email: form.get("email"), website: form.get("website"), locale, privacyAccepted: form.get("privacy") === "on" }),
                  });
                  if (!response.ok || !(await response.json()).saved) throw new Error("Not saved");
                  setSubmitted(true);
                  track("lead_submitted");
                } catch { setSubmitError(true); }
                finally { setSubmitting(false); }
              }}
            >
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
              {type === "register" && (
                <label>
                  <span>{t("primaryMarket")}</span>
                  <input name="market" required placeholder={t("cityOrRegion")} />
                </label>
              )}
              {type === "login" && (
                <label>
                  <span>{t("password")}</span>
                  <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
                </label>
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
        ) : (
          <div className="modal-success">
            <p className="modal-eyebrow">{t("requestReceived")}</p>
            <h2>{t("wellBeInTouch")}</h2>
            <p className="modal-copy">
              {t("requestRecordedCopy")}
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

function NetworkPage({ sections, pageTitleKey, heroImage, ...props }) {
  const { locale, t } = useLanguage();
  const c = NETWORK_COPY[locale];
  const title = pageTitleKey ? t(pageTitleKey) : sections[0] === "introduction" ? c.identity : c[sections[0]][0];
  return (
    <div className="route-page lasha-page">
      <LashaPageHero header={<PageHeader {...props} />} eyebrow="AIXESS" title={title} image={heroImage} />
      <NetworkSections sections={sections} onOpenModal={props.onOpenModal} />
    </div>
  );
}

function WhyAixessPage(props) {
  return <NetworkPage {...props} pageTitleKey="aixessAdvantage" heroImage="sunset" sections={["introduction", "why", "advantage", "services", "backing", "closing"]} />;
}

function BrokerAccessPage(props) {
  return <NetworkPage {...props} pageTitleKey="brokerAccess" heroImage="entrance" sections={["eligibility", "commercial", "process", "client", "closing"]} />;
}

const insightDownloads = [
  ["01", "resourceBrochureTitle", "resourceBrochureCopy", "resourceClientsTag"],
  ["02", "resourceMedicalTitle", "resourceMedicalCopy", "resourceGuideTag"],
  ["03", "resourceLeisureTitle", "resourceLeisureCopy", "resourceGuideTag"],
];

function InsightsPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t, locale } = useLanguage();
  return (
    <div className="route-page lasha-page insights-page">
      <LashaPageHero
        header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />}
        eyebrow={t("insightsEyebrow")}
        title={[t("makeMoveClear"), t("nextMoveClear")]}
        image="facade"
        copy={t("resourcesCopy")}
      >
        <div className="page-cta-row">
          <button className="button button-primary" type="button" onClick={() => onOpenModal("materials")}>{t("requestDossier")}</button>
          <a className="text-link" href="mailto:info@aixco.global">{t("emailAixco")} <span aria-hidden="true">↗</span></a>
        </div>
      </LashaPageHero>
      <main className="page-main">
        <section className="page-section resource-section" aria-labelledby="resource-library">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("library")}</p>
            <FittedHeading id="resource-library"><span>{t("everythingOnePlace")}</span><span>{t("place")}</span></FittedHeading>
          </div>
          <div className="resource-grid">
            {insightDownloads.map(([number, titleKey, copyKey, tagKey]) => (
              <article className="resource-card" key={titleKey}>
                <div className="resource-card-top"><span>{number}</span><span>{t(tagKey)}</span></div>
                <h3>{t(titleKey)}</h3>
                <p>{t(copyKey)}</p>
                <button className="resource-link" type="button" onClick={() => onOpenModal("materials")}>{t("requestPdf")} <span aria-hidden="true">↗</span></button>
              </article>
            ))}
          </div>
        </section>

        <section className="page-section faq-section" aria-labelledby="resource-faq">
          <div className="section-heading-row">
            <p className="section-eyebrow">{t("quickAnswers")}</p>
            <FittedHeading id="resource-faq"><span>{t("detailsClientsAsk")}</span><span>{t("clientsAskFirst")}</span></FittedHeading>
          </div>
          <div className="faq-list">
            {[
              [t("minimumInvestmentQuestion"), `${NETWORK_COPY[locale].start}. ${NETWORK_COPY[locale].terms}`],
              [t("foreignersOwnQuestion"), t("foreignersOwnAnswer")],
              [t("reveranceOfferQuestion"), t("reveranceOfferAnswer", { count: availableResidenceCount })],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function BrokerToolsPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  return (
    <div className="route-page lasha-page broker-tools-page">
      <LashaPageHero
        header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />}
        eyebrow="AIXESS"
        title={t("brokerTools")}
        titleAs="p"
        image="aerial"
      />
      <main className="page-main">
        <Suspense fallback={<p role="status">{t("preparingInteractive")}</p>}>
          <Calculators />
        </Suspense>
      </main>
    </div>
  );
}

function ResidencesPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  const [requestedApartment, setRequestedApartment] = useState(null);
  return (
    <div className="route-page lasha-page residences-page">
      <LashaPageHero
        header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />}
        eyebrow={t("projectReveranceBatumi")}
        title={[t("oneBuilding"), t("yourNextMove")]}
        image="front"
        copy={t("residenceRouteCopy")}
      />
      <main className="page-main">
        <NetworkSections sections={["opportunity"]} onSelectApartment={(code) => setRequestedApartment({ code })} />
        <Suspense fallback={<div className="residence-explorer-loader" role="status">{t("preparingInteractive")}</div>}>
          <ResidenceExplorer liveInventoryTitle requestedApartment={requestedApartment} onBrokerAccess={() => onOpenModal("register")} />
        </Suspense>
      </main>
    </div>
  );
}

function HomePage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t } = useLanguage();
  return (
    <div className="lasha-home">
      <HomeHero>
        <SiteHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />
      </HomeHero>

      <HomeMetrics />
      <HomeAbout />
      <ProjectShowcase onNavigate={onNavigate} />

      <Suspense fallback={<div className="residence-explorer-loader" role="status">{t("preparingInteractive")}</div>}>
        <ResidenceExplorer onBrokerAccess={() => onOpenModal("register")} />
      </Suspense>

      <HomeStartingPoints />
      <HomeAccess availableResidences={availableResidenceCount} onOpenModal={onOpenModal} />
    </div>
  );
}

function AppContent() {
  const { locale, t } = useLanguage();
  const [activeModal, setActiveModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(routeFromLocation);

  const openModal = (type) => {
    setMenuOpen(false);
    if (type === "register" || type === "login") {
      track(type === "login" ? "portal_login_click" : "portal_register_click");
      window.location.assign(workwiseBrokerUrl(type, locale));
      return;
    }
    track("materials_open");
    setActiveModal(type);
  };

  const navigatePage = (page) => {
    setMenuOpen(false);
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

  useEffect(() => {
    const syncRoute = () => {
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
    const pageView = () => track("page_view");
    pageView();
    window.addEventListener("aixess:consent", pageView);
    return () => window.removeEventListener("aixess:consent", pageView);
  }, [currentPage]);

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
      {currentPage === "broker-access" && <BrokerAccessPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "insights" && <InsightsPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "broker-tools" && <BrokerToolsPage {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />}
      {currentPage === "privacy" && <PrivacyPage header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu: setMenuOpen, onNavigate: navigatePage, onOpenModal: openModal }} />} />}
      {currentPage === "admin" && <Suspense fallback={<p role="status">{t("loadingAdmin")}</p>}><AdminDashboard /></Suspense>}
      <PrivacyControls page={currentPage} />

      {activeModal && (
        <Modal key={activeModal} type={activeModal} onClose={() => setActiveModal(null)} onSwitch={setActiveModal} />
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
