import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { resetTimeThemeForTests, setTimeThemeMode } from "./timeTheme";
import { NETWORK_COPY } from "./network-copy";
import { HOME_HERO_LINES } from "./project-showcase-copy";
import { LASHA_HOME_COPY } from "./lasha-home-copy";
import { AIXCO_FAQ } from "./aixco-faq-copy";

beforeEach(() => {
  window.history.replaceState({}, "", "/#why-aixess");
  window.scrollTo = () => {};
  window.localStorage.removeItem("aixess-language");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("AIXESS navigation pages", () => {
  it("keeps the primary menu in the approved order", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(Array.from(document.querySelectorAll(".desktop-nav button:not(.nav-group-toggle)")).filter((button) => !button.closest(".nav-group-menu")).map((button) => button.textContent)).toEqual([
      "AIXESS ADVANTAGE",
      "BROKER ACCESS",
      "SELECTED OPPORTUNITIES",
      "INSIGHTS",
      "BROKER TOOLS",
    ]);
  });

  it("draws Lasha's vector wordmark as the home link on every header", () => {
    window.history.replaceState({}, "", "/#insights");
    render(<App />);
    const logos = document.querySelectorAll(".brand svg[role='img'][aria-label='AiXESS']");
    expect(logos.length).toBeGreaterThanOrEqual(1);
    logos.forEach((logo) => {
      expect(logo.getAttribute("viewBox")).toBe("0 0 1136.2 359");
      expect(logo.querySelectorAll("path")).toHaveLength(6);
    });
    expect(document.querySelector("img[src*='aixess-logo']")).toBeNull();
  });

  it("styles the open MENU panel at every width where the header collapses to MENU", async () => {
    // Klem, 13 October: in a part-width desktop window MENU opened an unstyled black panel with
    // dark labels, because the header collapsed below 1400px but the panel styles began at 1220px.
    const { readFile } = await import("node:fs/promises");
    const header = await readFile("src/styles.css", "utf8");
    const menu = await readFile("src/components/lasha-pages.css", "utf8");
    const collapse = header.match(/@media \(max-width: (\d+)px\) \{[^@]*?\.desktop-nav,\s*\.header-actions \{ display: none; \}/);
    expect(collapse).not.toBeNull();
    // The panel's own styles (ink ground, paper labels) and the Reverance sub-entry, not the
    // narrower phone refinements.
    const panelBreakpoints = [...menu.matchAll(/@media \(max-width: (\d+)px\) \{\s*\.mobile-nav\.lasha-menu(?: > button\.lasha-menu-sub)? \{\s*(?:z-index|min-height)/g)].map((m) => m[1]);
    expect(panelBreakpoints).toHaveLength(2);
    panelBreakpoints.forEach((width) => expect(width).toBe(collapse[1]));
  });

  it("closes the MENU panel with Escape or when the window widens past the collapsed header", () => {
    const listeners = new Set();
    const query = { matches: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
    const original = window.matchMedia;
    window.matchMedia = (media) => (media === "(min-width: 1400px)" ? query : original(media));
    try {
      window.history.replaceState({}, "", "/#insights");
      render(<App />);
      const panel = document.getElementById("mobile-navigation");
      const toggle = document.querySelector(".site-header .menu-toggle");
      fireEvent.click(toggle);
      expect(panel).toHaveClass("is-open");
      expect(within(panel).getAllByRole("button").map((button) => button.textContent)).toEqual(expect.arrayContaining(["AIXESS ADVANTAGE", "BROKER ACCESS", "SELECTED OPPORTUNITIES", "Georgia Batumi - Reverance", "INSIGHTS", "BROKER TOOLS"]));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(panel).not.toHaveClass("is-open");

      fireEvent.click(toggle);
      expect(panel).toHaveClass("is-open");
      query.matches = true;
      act(() => listeners.forEach((fn) => fn()));
      expect(panel).not.toHaveClass("is-open");
      expect(listeners.size).toBe(0);
    } finally {
      window.matchMedia = original;
    }
  });

  it("shows each brand photo in the version for the current theme, and swaps them all when the theme changes", async () => {
    window.localStorage.setItem("aixess-time-theme", "night");
    resetTimeThemeForTests();
    window.history.replaceState({}, "", "/#insights");
    render(<App />);
    const cardPhotos = () => Array.from(document.querySelectorAll(".it-card-media img[data-theme-photo]")).map((img) => img.dataset.themePhoto);
    expect(cardPhotos()).toEqual(["dubai-skyline-night", "switzerland-lakeside-night", "coastal-lifestyle-night"]);
    const hero = document.querySelector(".lasha-page-hero-media");
    expect(hero.getAttribute("src")).toMatch(/^\/assets\/themed\/coastal-city-night-\d+\.webp$/);

    act(() => setTimeThemeMode("day"));
    await waitFor(() => expect(cardPhotos()).toEqual(["dubai-skyline-day", "switzerland-lakeside-day", "coastal-lifestyle-day"]));
    expect(document.querySelector(".lasha-page-hero-media").dataset.themePhoto).toBe("coastal-city-day");
    expect(document.documentElement.dataset.timeTheme).toBe("day");
  });

  it("gives Broker Tools the calm waterfront hero and the modern workspace building, not the old marina or Reverance render", () => {
    window.localStorage.setItem("aixess-time-theme", "afternoon");
    resetTimeThemeForTests();
    window.history.replaceState({}, "", "/#broker-tools");
    render(<App />);
    expect(document.querySelector(".lasha-page-hero-media").dataset.themePhoto).toBe("calm-waterfront-afternoon");
    const workspace = document.querySelector(".it-workspace-photo");
    expect(workspace.dataset.themePhoto).toBe("workspace-building-afternoon");
    expect(workspace).toHaveAttribute("loading", "lazy");
    expect(document.body.innerHTML).not.toMatch(/marina-towers|reverance-hero-/);
  });

  it("puts the newer first-page brief on the homepage while retaining the existing structure", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AIXESSTO MARKET");
    expect(container.querySelector(".lasha-hero-copy")).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(screen.getByText(LASHA_HOME_COPY.en.heroSubtitle.replace(/\s+/g, " "))).toBeInTheDocument();
    expect(screen.getByText(LASHA_HOME_COPY.en.aboutBody)).toBeInTheDocument();
    expect(screen.getByText(NETWORK_COPY.en.introTagline.replace(/\.$/, ""))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DIFFERENT STARTING POINTS. ONE PLATFORM TO MOVE FORWARD" })).toBeInTheDocument();
    expect(container.querySelector(".lasha-access")).toBeInTheDocument();
    expect(container.querySelector(".project-ticker")).not.toBeInTheDocument();
    expect(container.querySelector("[data-content-section]")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "BROKER ACCESS" })[0]);
    expect(container.querySelector(".lnp-broker")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "REQUEST ACCESS" })[0]).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-signup?lang=en");
    expect(screen.getAllByRole("link", { name: "PARTNER SIGN IN" })[0]).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-login?lang=en");
    fireEvent.click(screen.getAllByRole("button", { name: "INSIGHTS" })[0]);
    expect(screen.getAllByRole("button", { name: /^REQUEST/ })).toHaveLength(2);
  });

  it.each(Object.keys(NETWORK_COPY))("renders the complete first-page brief in %s", (locale) => {
    window.history.replaceState({}, "", "/");
    localStorage.setItem("aixess-language", locale);
    const { container } = render(<App />);
    const c = NETWORK_COPY[locale];
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HOME_HERO_LINES[locale].join(""));
    const l = LASHA_HOME_COPY[locale];
    expect(screen.getByRole("heading", { name: l.projectTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: l.aboutTitle.join("") })).toBeInTheDocument();
    expect(screen.getByText(l.heroSubtitle.replace(/\s+/g, " "))).toBeInTheDocument();
    expect(container.querySelectorAll(".lasha-starting-grid article")).toHaveLength(3);
    expect(container.querySelectorAll(".lasha-metrics > div")).toHaveLength(3);
    for (const [title] of c.startingPoints) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    // Lasha's frame repeats the first card's line under all three starting points.
    expect(screen.getAllByText(c.startingPoints[0][1])).toHaveLength(3);
  });

  it("shows Reverance as the featured homepage project with working project actions", () => {
    window.history.replaceState({}, "", "/");
    const scrollIntoView = vi.fn();
    const explorer = document.createElement("section");
    explorer.id = "residences";
    explorer.scrollIntoView = scrollIntoView;
    document.body.appendChild(explorer);
    const { container } = render(<App />);
    const showcase = container.querySelector("#projects");
    expect(within(showcase).getByRole("heading", { name: "CURRENT PROJECT IN BATUMI" })).toBeInTheDocument();
    expect(within(showcase).getByText("€45K")).toBeInTheDocument();
    expect(within(showcase).getByText("Entry from €45,000")).toBeInTheDocument();
    expect(screen.getByText(String(163))).toBeInTheDocument();
    expect(showcase.querySelector(".project-upcoming")).not.toBeInTheDocument();
    const thumbs = within(showcase).getAllByRole("button", { name: /Show Reverance image/ });
    fireEvent.click(thumbs[1]);
    expect(thumbs[1]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(showcase).getByRole("button", { name: /EXPLORE PROJECT/ }));
    expect(scrollIntoView).toHaveBeenCalled();
    fireEvent.click(within(showcase).getByRole("button", { name: /CALCULATOR/ }));
    expect(screen.getAllByRole("button", { name: "BROKER TOOLS" }).filter((button) => button.getAttribute("aria-current") === "page").length).toBeGreaterThan(0);
    explorer.remove();
  });

  it("routes broker login and registration to the matching Workwise flows", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getAllByRole("link", { name: "REGISTER" })[0]).toHaveAttribute(
      "href",
      "https://workw.com/realestate/aixco/broker-signup?lang=en",
    );
    expect(screen.getAllByRole("link", { name: "LOGIN" })[0]).toHaveAttribute(
      "href",
      "https://workw.com/realestate/aixco/broker-login?lang=en",
    );
  });

  it("builds AiXESS Advantage and Broker Access from Lasha's frames word for word", () => {
    window.history.replaceState({}, "", "/#why-aixess");
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "TURN YOURNETWORK INTOOPPORTUNITY." })).toBeInTheDocument();
    expect(screen.getByText("AiXESS expands what you can offer your clients and connections — giving you access to selected international real estate opportunities, professional tools, ready-to-sell materials and direct AIXCO support.")).toBeInTheDocument();
    expect(screen.getAllByText("Expand your offering with selected international real estate opportunities.")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "YOUR AIXESSADVANTAGE" })).toBeInTheDocument();
    expect(screen.getByText("International real estate opportunities for your clients and network")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "WE DON'T STOPAT THE SALE" })).toBeInTheDocument();
    expect(screen.getByText("AIXCO SUPPORTS.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "REQUEST ACCESS" })).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-signup?lang=en");
    expect(screen.getByRole("link", { name: "PARTNER SIGN IN" })).toHaveAttribute("href", "https://workw.com/realestate/aixco/broker-login?lang=en");

    fireEvent.click(screen.getAllByRole("button", { name: "BROKER ACCESS" })[0]);
    expect(screen.getByRole("heading", { level: 1, name: "YOU DON’TNEED TO BEA BROKER." })).toBeInTheDocument();
    expect(screen.getByText("If you have the network and ambition, AiXESS gives you the opportunities, tools and support.")).toBeInTheDocument();
    expect(screen.getByText("ASPIRING PROFESSIONALS")).toBeInTheDocument();
    expect(screen.getByText("Established brokers and agencies")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "HAVE THE NETWORK?" })).toBeInTheDocument();
    expect(screen.getByText("THE COMMERCIAL ADVANTAGE")).toBeInTheDocument();
    expect(screen.getByText("Your client secures the property with just 10% down payment, unlocking your full commission within 72 hours.")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Request AiXESS access")).toBeInTheDocument();
    expect(screen.getByText("Client pays the required 10%")).toBeInTheDocument();
  });

  it("renders the selected page from its shareable hash route", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "YOUR AIXESSADVANTAGE" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "AIXESS ADVANTAGE" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
  });

  it("navigates between pages without a full reload", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "INSIGHTS" })[0]);

    expect(window.location.hash).toBe("#insights");
    expect(screen.getByRole("heading", { level: 1, name: "THE KNOWLEDGEBEHIND EVERYOPPORTUNITY." })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "INSIGHTS" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
  });

  it("exposes broker tools directly in the desktop and mobile navigation", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getAllByRole("button", { name: "BROKER TOOLS" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "BROKER TOOLS" })[0]);
    expect(window.location.hash).toBe("#broker-tools");
    expect(screen.getByRole("heading", { level: 1, name: "EVERYTHING YOU NEEDTO SELL. ONE PLATFORM." })).toBeInTheDocument();
  });

  it("keeps resource CTAs connected to the working materials request dialog", () => {
    window.history.replaceState({}, "", "/#insights");
    render(<App />);

    const brochures = screen.getByRole("heading", { name: "Project Brochures" }).closest("article");
    fireEvent.click(within(brochures).getByRole("button", { name: /^request/i }));

    expect(screen.getByRole("dialog", { name: /request project materials/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /request project materials/i })).toBeInTheDocument();
  });

  it("answers the twelve AIXCO.Global FAQ entries in a native accordion, in source order", () => {
    window.history.replaceState({}, "", "/#insights");
    const { container } = render(<App />);

    const items = Array.from(container.querySelectorAll(".it-faq details"));
    expect(items).toHaveLength(12);
    expect(items.every((item) => !item.open)).toBe(true);
    expect(items.map((item) => item.querySelector("summary").textContent.replace("+", ""))).toEqual(AIXCO_FAQ.en.map(([question]) => question));
    expect(within(items[1]).getByText("The minimum investment amount is €5,000.")).toBeInTheDocument();
  });

  it("drops the Insights hero actions and the closing partner banner", () => {
    window.history.replaceState({}, "", "/#insights");
    const { container } = render(<App />);

    expect(container.querySelector(".lasha-page-hero-copy .button")).not.toBeInTheDocument();
    expect(screen.queryByText("JOIN THE AIXESS BROKER NETWORK.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /EXPLORE INSIGHTS/ })).not.toBeInTheDocument();
  });

  it("describes Broker Network & Team Management as the third broker tool", () => {
    window.history.replaceState({}, "", "/#broker-tools");
    const { container } = render(<App />);

    const cards = container.querySelectorAll(".it-feature");
    expect(cards).toHaveLength(6);
    expect(cards[2]).toHaveTextContent("03. BROKER NETWORK & TEAM MANAGEMENT");
    expect(screen.queryByText(/SMART SALES CALCULATIONS/)).not.toBeInTheDocument();
  });

  it("keeps the calculators and client PDF generator off the public Broker Tools page", async () => {
    window.history.replaceState({}, "", "/#broker-tools");
    render(<App />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("CREATE CLIENT PDF")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /BECOME A PARTNER/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /REQUEST BROKER ACCESS/ })).toBeInTheDocument();
  });

  it("opens Georgia Batumi - Reverance from the Selected Opportunities menu and closes it with Escape", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);

    const toggle = screen.getByRole("button", { name: "Show projects" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    fireEvent.click(within(container.querySelector(".nav-group-menu")).getByRole("button", { name: "Georgia Batumi - Reverance" }));
    expect(window.location.hash).toBe("#residences");
    expect(screen.getByRole("heading", { name: /two buildings/i })).toBeInTheDocument();
  });

  it("renders the admin route through its lazy boundary without throwing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/admin/session")) {
        return new Response(JSON.stringify({ error: "Sign in" }), { status: 401, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ setupAvailable: false }), { status: 200, headers: { "content-type": "application/json" } });
    });

    try {
      window.history.replaceState({}, "", "/#admin");
      render(<App />);
      expect(await screen.findByRole("heading", { name: "Welcome back." })).toBeInTheDocument();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("exposes the residence explorer as a dedicated destination", () => {
    window.history.replaceState({}, "", "/#residences");
    render(<App />);

    expect(screen.getByRole("heading", { name: /two buildings/i })).toBeInTheDocument();
    expect(screen.getByText(/official 3d reconstruction/i)).toBeInTheDocument();
  });

  it("switches the complete interface language and persists the selection", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: /change language: en/i })[0]);
    fireEvent.click(screen.getAllByRole("option", { name: /Deutsch/i })[0]);

    expect(document.documentElement.lang).toBe("de");
    expect(window.localStorage.getItem("aixess-language")).toBe("de");
    expect(screen.getAllByRole("button", { name: "AIXESS-VORTEIL" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "IHRAIXESS-VORTEIL" })).toBeInTheDocument();
  });
});
