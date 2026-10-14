import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Globe } from "@phosphor-icons/react";
import { LanguageProvider, LANGUAGE_OPTIONS, useLanguage, localizeFieldValidation, clearFieldValidation } from "./i18n.jsx";
import { NetworkSections, PurchaseBenefit } from "./components/NetworkSections.jsx";
import { REVERANCE_PROJECT_COPY } from "./reverance-project-copy.js";
import { ProjectShowcase } from "./components/ProjectShowcase.jsx";
import { AdvantagePageContent, BrokerAccessPageContent } from "./components/LashaNetworkPages.jsx";
import { HomeAbout, HomeAccess, HomeHero, HomeMetrics, HomeStartingPoints, LashaPageHero } from "./components/LashaHomeSections.jsx";
import { TimeThemeMenu } from "./components/TimeThemeMenu.jsx";
import { BrokerToolsPageContent, InsightsPageContent } from "./components/InsightsToolsPages.jsx";
import "./components/lasha-home.css";
import "./components/lasha-pages.css";
import "./components/time-theme.css";
import { PrivacyControls, PrivacyPage } from "./components/Privacy.jsx";
import { PRIVACY_COPY } from "./privacy-copy.js";
import { track, trackOutboundLink, flushAnalytics } from "./analytics.js";
import { getWorkbookAvailableCount } from "./data/reveranceInventory.js";
import { AixessLogo } from "./components/AixessLogo.jsx";

const availableResidenceCount = getWorkbookAvailableCount();

const AdminDashboard = lazy(() => import("./components/AdminDashboard.jsx"));

const ResidenceExplorer = lazy(() => import("./components/ResidenceExplorer").then((module) => ({
  default: module.ResidenceExplorer,
})));


// Selected Opportunities lists each live project under it (Klem, 12 October 2026: "there will
// come many more projects"). Add a project here only once it has a real page.
const OPPORTUNITY_PROJECTS = [{ key: "residences", labelKey: "reveranceProjectNav" }];

const navItems = [
  { key: "why-aixess", labelKey: "aixessAdvantage" },
  { key: "broker-access", labelKey: "brokerAccess" },
  { key: "residences", labelKey: "selectedOpportunities", children: OPPORTUNITY_PROJECTS },
  { key: "insights", labelKey: "insights" },
  { key: "broker-tools", labelKey: "brokerTools" },
  // Contact is the footer every page ends with (Klem, 14 October 2026), not a page of its own.
  { key: "contact", labelKey: "contact" },
];

const routeAliases = { resources: "insights", calculators: "broker-tools" };
const validRoutes = new Set(["home", ...navItems.map(({ key }) => key).filter((key) => key !== "contact"), "admin", "privacy"]);

// Scrolls to the contact footer and moves focus there, so keyboard and screen-reader users land on it too.
function showContact(behavior = "smooth") {
  const footer = document.getElementById("contact");
  if (!footer) return false;
  footer.scrollIntoView({ behavior, block: "start" });
  footer.focus({ preventScroll: true });
  return true;
}

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
        <AixessLogo />
      </button>

      <nav className="desktop-nav" aria-label={t("primaryNavigation")}>
        {navItems.map(({ key, labelKey, children }) => (children ? (
          <NavGroup key={key} item={{ key, labelKey, children }} currentPage={currentPage} onNavigate={navigate} />
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
            <AixessLogo />
          </button>
          <button className="menu-toggle" type="button" aria-controls="mobile-navigation" aria-expanded={menuOpen} tabIndex={menuOpen ? 0 : -1} onClick={() => onToggleMenu(false)}>
            {t("close")}
          </button>
        </div>
        {navItems.map(({ key, labelKey, children }) => (
          <Fragment key={key}>
            <button
              className={currentPage === key ? "is-active" : ""}
              type="button"
              aria-current={currentPage === key && !children ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              {t(labelKey)}
            </button>
            {children?.map((child) => (
              <button
                className={`lasha-menu-sub ${currentPage === child.key ? "is-active" : ""}`}
                type="button"
                aria-current={currentPage === child.key ? "page" : undefined}
                key={child.labelKey}
                onClick={() => navigate(child.key)}
              >
                {t(child.labelKey)}
              </button>
            ))}
          </Fragment>
        ))}
        <LanguageSwitcher languageOpen={languageOpen} setLanguageOpen={setLanguageOpen} />
        <a className="mobile-register" href={workwiseBrokerUrl("register", locale)}>{t("register")}</a>
        <a className="mobile-login" href={workwiseBrokerUrl("login", locale)}>{t("login")}</a>
      </div>,
      document.body)}
    </header>
  );
}

// A top-level entry with its projects underneath: the label still opens the category page,
// and the caret (or hovering) shows the project list. Escape and an outside click close it.
function NavGroup({ item, currentPage, onNavigate }) {
  const { t } = useLanguage();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;
  const close = () => { setPinned(false); setHovered(false); };
  const groupRef = useRef(null);
  const listId = `nav-group-${item.key}`;
  const active = currentPage === item.key || item.children.some((child) => child.key === currentPage);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      close();
      groupRef.current?.querySelector(".nav-group-toggle")?.focus();
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setPinned(false); }}
    >
      <button className={active ? "is-active" : ""} type="button" aria-current={currentPage === item.key ? "page" : undefined} onClick={() => go(item.key)}>
        {t(item.labelKey)}
      </button>
      <button
        className="nav-group-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("showProjects")}
        onClick={() => setPinned((value) => (hovered ? true : !value))}
      >
        <CaretDown aria-hidden="true" weight="bold" />
      </button>
      <ul className="nav-group-menu" id={listId} hidden={!open}>
        {item.children.map((child) => (
          <li key={child.labelKey}>
            <button type="button" className={currentPage === child.key ? "is-active" : ""} aria-current={currentPage === child.key ? "page" : undefined} onClick={() => go(child.key)}>
              {t(child.labelKey)}
            </button>
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

// Lasha's AiXESS Advantage and Broker Access frames (Figma, 9 October 2026).
function WhyAixessPage(props) {
  return (
    <div className="route-page lasha-page">
      <AdvantagePageContent header={<PageHeader {...props} />} />
    </div>
  );
}

function BrokerAccessPage(props) {
  return (
    <div className="route-page lasha-page">
      <BrokerAccessPageContent header={<PageHeader {...props} />} />
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

// The public overview only: the calculators and client PDF offers are for signed-in, approved
// brokers (Klem, 12 October 2026), and brokers sign in on Workwise, so this site no longer
// ships them. Calculators.jsx and ClientPdf.jsx stay in the repo for the broker portal.
function BrokerToolsPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  return (
    <div className="route-page lasha-page broker-tools-page">
      <BrokerToolsPageContent
        header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />}
        onOpenModal={onOpenModal}
      />
    </div>
  );
}

function ResidencesPage({ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }) {
  const { t, locale } = useLanguage();
  return (
    <div className="route-page lasha-page residences-page">
      <LashaPageHero
        header={<PageHeader {...{ currentPage, menuOpen, onToggleMenu, onNavigate, onOpenModal }} />}
        eyebrow={t("projectReveranceBatumi")}
        title={[t("oneBuilding"), t("yourNextMove")]}
        image="reverance-towers"
        variant="towers"
        imageAlt={(REVERANCE_PROJECT_COPY[locale] || REVERANCE_PROJECT_COPY.en).heroAlt}
        copy={t("residenceRouteCopy")}
      />
      <main className="page-main">
        <NetworkSections sections={["opportunity"]} />
        <PurchaseBenefit />
        <Suspense fallback={<div className="residence-explorer-loader" role="status">{t("preparingInteractive")}</div>}>
          <ResidenceExplorer liveInventoryTitle onBrokerAccess={() => onOpenModal("register")} />
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

  // A #contact link opens the homepage at its contact footer, once the lazy explorer above it has
  // taken its height.
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
