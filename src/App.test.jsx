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

    expect(Array.from(document.querySelectorAll(".desktop-nav button")).filter((button) => !button.closest(".nav-group-menu")).map((button) => button.textContent)).toEqual([
      "AIXESS ADVANTAGE",
      "BROKER ACCESS",
      "PROJECTS",
      "INSIGHTS",
      "CONTACT",
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
    const panelBreakpoints = [...menu.matchAll(/@media \(max-width: (\d+)px\) \{\s*\.mobile-nav\.lasha-menu(?: :is\(\.lasha-menu-projects, \.lasha-menu-project-list\))? \{\s*(?:z-index|margin)/g)].map((m) => m[1]);
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
      expect(within(panel).getAllByRole("button").map((button) => button.textContent)).toEqual(expect.arrayContaining(["AIXESS ADVANTAGE", "BROKER ACCESS", "PROJECTS", "INSIGHTS"]));
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
    expect(hero.getAttribute("src")).toMatch(/^\/assets\/themed\/batumi-coast-night-\d+\.webp$/);
    expect(hero.getAttribute("alt")).toMatch(/^Illustration of Batumi’s Black Sea coast/);
    expect(hero.getAttribute("alt")).not.toMatch(/Reverance/);

    act(() => setTimeThemeMode("day"));
    await waitFor(() => expect(cardPhotos()).toEqual(["dubai-skyline-day", "switzerland-lakeside-day", "coastal-lifestyle-day"]));
    expect(document.querySelector(".lasha-page-hero-media").dataset.themePhoto).toBe("batumi-coast-day");
    expect(document.documentElement.dataset.timeTheme).toBe("day");
  });

  it("gives Broker Access the Figma frame's hero and workspace photos in every theme, not the old marina or Reverance render", () => {
    window.localStorage.setItem("aixess-time-theme", "afternoon");
    resetTimeThemeForTests();
    window.history.replaceState({}, "", "/#broker-access");
    render(<App />);
    expect(document.querySelector(".lasha-page-hero-media").getAttribute("src")).toMatch(/\/assets\/figma\/broker-hero-/);
    const workspace = document.querySelector(".it-workspace-photo");
    expect(workspace.getAttribute("src")).toMatch(/\/assets\/figma\/broker-workspace-/);
    expect(workspace).toHaveAttribute("loading", "lazy");
    expect(document.body.innerHTML).not.toMatch(/marina-towers|reverance-hero-/);
  });

  it("opens Project Reverance on the official two-tower render", () => {
    window.localStorage.setItem("aixess-time-theme", "night");
    resetTimeThemeForTests();
    window.history.replaceState({}, "", "/#residences");
    render(<App />);
    const hero = document.querySelector(".rv-hero-media");
    expect(hero.getAttribute("src")).toMatch(/\/assets\/figma\/reverance-hero-/);
    expect(hero.getAttribute("alt")).toMatch(/Official render of the two Project Reverance towers/);
    expect(screen.getByRole("heading", { name: "PROJECT FACTS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "More Upfront. More Value." })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveAttribute("id", "contact");
  });

  it("lists Contact in the header and the menu and takes either to the contact footer", () => {
    window.history.replaceState({}, "", "/#insights");
    render(<App />);
    const contactButtons = screen.getAllByRole("button", { name: "CONTACT" });
    expect(contactButtons.length).toBe(2);
    expect(document.getElementById("contact")).toBeInTheDocument();
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
    expect(screen.getAllByRole("button", { name: /BECOME A PARTNER/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "BROKER LOGIN" })).toBeInTheDocument();
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
    expect(container.querySelectorAll(".lasha-metrics > div")).toHaveLength(3);
    // The starting-point cards are on Broker Access only (Kemo, 28 October 2026).
    expect(container.querySelector(".lasha-starting article")).toBeNull();
    for (const [, line] of c.startingPoints) expect(screen.queryByText(line)).toBeNull();
  });

  it("shows Reverance as the featured homepage project with working project actions", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    const showcase = container.querySelector("#projects");
    expect(within(showcase).getByRole("heading", { name: "CURRENT PROJECT IN BATUMI" })).toBeInTheDocument();
    expect(within(showcase).getByText("$59K")).toBeInTheDocument();
    expect(within(showcase).getByText("Entry from $59,000")).toBeInTheDocument();
    // No stock figure on the homepage (Kemo, 3 November 2026): EXPLORE over AVAILABLE RESIDENCES.
    const count = document.querySelector(".lasha-access-count");
    expect(count.textContent).toBe("EXPLOREAVAILABLE RESIDENCES");
    expect(screen.queryByText(String(165))).not.toBeInTheDocument();
    expect(showcase.querySelector(".project-upcoming")).not.toBeInTheDocument();
    const thumbs = within(showcase).getAllByRole("button", { name: /Show Reverance image/ });
    fireEvent.click(thumbs[1]);
    expect(thumbs[1]).toHaveAttribute("aria-pressed", "true");
    const explore = within(showcase).getByRole("link", { name: /EXPLORE PROJECT/ });
    expect(explore).toHaveAttribute("href", "#residences");
    fireEvent.click(explore);
    expect(window.location.hash).toBe("#residences");
    expect(screen.getByRole("heading", { name: /two buildings/i })).toBeInTheDocument();
  });

  it("drops the showcase CALCULATOR action, since the site has no public calculator", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    expect(within(container.querySelector("#projects")).queryByRole("button", { name: /CALCULATOR/ })).not.toBeInTheDocument();
  });

  it("opens the Project Reverance page from the homepage Explore investments button, and Back returns home", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    const cta = screen.getByRole("link", { name: /Explore investments/i });
    expect(cta).toHaveAttribute("href", "#residences");
    fireEvent.click(cta);
    expect(window.location.hash).toBe("#residences");
    expect(screen.getByRole("heading", { name: /two buildings/i })).toBeInTheDocument();
    // The homepage explorer no longer shares the route's name.
    expect(document.getElementById("residences")).toBeNull();
    act(() => {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByRole("heading", { name: /two buildings/i })).not.toBeInTheDocument();
  });

  it("shows the Reverance project information without AIXCO's own sections or the Golden Premium list", () => {
    window.history.replaceState({}, "", "/#residences");
    render(<App />);
    expect(screen.queryByRole("navigation", { name: "Project contents" })).not.toBeInTheDocument();
    const opportunity = document.getElementById("opportunity");
    const details = document.getElementById("project-details");
    expect(within(details).getByText("13–14")).toBeInTheDocument();
    expect(within(opportunity).queryByText("A SELECTED ENTRY INTO BATUMI REAL ESTATE")).not.toBeInTheDocument();
    expect(within(details).getByText(/90% potential occupancy/)).toBeInTheDocument();
    expect(within(opportunity).queryByRole("heading", { name: "GOLDEN PREMIUM APARTMENTS" })).not.toBeInTheDocument();
    const payment = document.getElementById("payment");
    for (const stage of ["INITIAL PAYMENT", "DURING CONSTRUCTION", "AT COMPLETION"]) expect(within(payment).getByRole("heading", { name: stage })).toBeInTheDocument();
    expect(within(payment).getByText(/Bank financing may cover this stage/)).toBeInTheDocument();
    // Lasha's frame puts the purchase benefit after Why Batumi (Kemo, 2 November 2026).
    expect(within(document.getElementById("purchase-benefit")).getByRole("heading", { name: "More Upfront. More Value." })).toBeInTheDocument();
    const ownership = document.getElementById("ownership");
    for (const item of ["1% RENTAL INCOME TAX", "0% CAPITAL GAINS TAX AFTER 2 YEARS"]) expect(within(ownership).getByRole("heading", { name: item })).toBeInTheDocument();
    // Facts already shown elsewhere on the page are not repeated (Kemo, 16 October 2026).
    expect(within(ownership).queryByRole("heading", { name: "MINIMUM 60% FINANCING" })).not.toBeInTheDocument();
    expect(within(document.getElementById("residence")).queryByRole("heading", { name: "SELECTED HIGHER FLOORS" })).not.toBeInTheDocument();
    expect(within(document.getElementById("residence")).getAllByRole("button", { name: /^View amenity image/ })).toHaveLength(12);
    const gallery = document.getElementById("gallery");
    const tiles = within(gallery).getAllByRole("button", { name: /^Open image/ });
    expect(tiles).toHaveLength(9);
    expect(within(gallery).getByText("APARTMENT INTERIOR")).toBeInTheDocument();
    fireEvent.click(tiles[0]);
    const dialog = gallery.querySelector("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Next image" }));
    expect(within(dialog).getByText("2 of 9")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(gallery.querySelector("dialog")).toBeNull();
    // AIXCO's own sections stay off AiXESS (Kemo and Klem, 16 October 2026).
    for (const id of ["faq", "why-aixco", "approach"]) expect(document.getElementById(id)).toBeNull();
    for (const name of ["WHAT BUYERS USUALLY ASK.", "ACQUIRE. PARTNER. CREATE VALUE.", "YOUR REVERANCE PROPERTY STARTS HERE."]) expect(screen.queryByRole("heading", { name })).not.toBeInTheDocument();
  });

  it("keeps the project page on a section link", () => {
    window.history.replaceState({}, "", "/#residences/payment");
    render(<App />);
    expect(document.getElementById("payment")).not.toBeNull();
    expect(screen.getByRole("heading", { name: /two buildings/i })).toBeInTheDocument();
  });

  it("opens broker registration form from navbar and routes login to broker portal", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    const registerBtn = screen.getAllByRole("button", { name: "REGISTER" })[0];
    expect(registerBtn).toBeInTheDocument();
    fireEvent.click(registerBtn);

    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByLabelText("FIRST NAME")).toBeInTheDocument();
    expect(within(modal).getByLabelText("SURNAME")).toBeInTheDocument();
    expect(within(modal).getByLabelText("PHONE NUMBER")).toBeInTheDocument();
    expect(within(modal).getByLabelText("EMAIL ADDRESS")).toBeInTheDocument();
    expect(within(modal).getByLabelText("COMPANY (OPTIONAL)")).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "CLOSE" }));

    expect(screen.getAllByRole("link", { name: "LOGIN" })[0]).toHaveAttribute(
      "href",
      "https://portal.aixess.global/",
    );
  });

  it("builds AiXESS Advantage and Broker Access from Lasha's frames word for word", () => {
    window.history.replaceState({}, "", "/#why-aixess");
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "TURN YOURNETWORK INTOOPPORTUNITY." })).toBeInTheDocument();
    expect(screen.getByText("AiXESS expands what you can offer your clients and connections — giving you access to selected international real estate opportunities, professional tools, ready-to-sell materials and direct AIXCO support.")).toBeInTheDocument();
    // Each starting point keeps its own line rather than the frame's repeated first line.
    expect(screen.getAllByText("Expand your offering with selected international real estate opportunities.")).toHaveLength(1);
    expect(screen.getByText("Turn trusted connections into new business opportunities.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "YOUR AIXESSADVANTAGE" })).toBeInTheDocument();
    expect(screen.getByText("International real estate opportunities for your clients and network")).toBeInTheDocument();
    // AiXESS 360° Services (Kemo, 28 October 2026) replaces the shorter 360° row.
    expect(screen.getByRole("heading", { name: "AiXESS360° SERVICES" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).filter((h) => h.closest(".lnp-care"))).toHaveLength(8);
    expect(screen.queryByText("AIXCO SUPPORTS.")).not.toBeInTheDocument();
    const requestAccessButton = screen.getByRole("button", { name: "REQUEST ACCESS" });
    expect(requestAccessButton).toBeInTheDocument();
    fireEvent.click(requestAccessButton);
    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByLabelText("FIRST NAME")).toBeInTheDocument();
    expect(within(modal).getByLabelText("SURNAME")).toBeInTheDocument();
    expect(within(modal).getByLabelText("PHONE NUMBER")).toBeInTheDocument();
    expect(within(modal).getByLabelText("EMAIL ADDRESS")).toBeInTheDocument();
    expect(within(modal).getByLabelText("COMPANY (OPTIONAL)")).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "CLOSE" }));
    expect(screen.getByRole("link", { name: "PARTNER SIGN IN" })).toHaveAttribute("href", "https://portal.aixess.global/");

    fireEvent.click(screen.getAllByRole("button", { name: "BROKER ACCESS" })[0]);
    expect(screen.getByRole("heading", { level: 1, name: "EVERYTHING YOU NEEDTO SELL. ONE\u00a0PLATFORM." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "YOU DON’TNEED TO BEA BROKER." })).toBeInTheDocument();
    expect(screen.getByText("If you have the network and ambition, AiXESS gives you the opportunities, tools and support.")).toBeInTheDocument();
    expect(screen.getByText("ASPIRING PROFESSIONALS")).toBeInTheDocument();
    expect(screen.getByText("Established brokers and agencies")).toBeInTheDocument();
    expect(screen.getByText("Well-connected individuals who can introduce the right people.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "HAVE THE NETWORK?" })).not.toBeInTheDocument();
    expect(screen.getByText("THE COMMERCIAL ADVANTAGE")).toBeInTheDocument();
    expect(screen.getByText("Your client secures the property with this down payment, unlocking your full commission within 72 hours.")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Request AiXESS access")).toBeInTheDocument();
    expect(screen.getByText("Client pays the required down payment")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "LESS ADMINISTRATION. MORE OPPORTUNITY." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "THREE STEPS TO GET STARTED." })).toBeInTheDocument();
    // Klem's order (22 October 2026).
    const order = Array.from(document.querySelectorAll(".lnp-broker h1, .lnp-broker h2, .lnp-commercial-eyebrow")).map((heading) => heading.textContent);
    expect(order).toEqual(["EVERYTHING YOU NEEDTO SELL. ONE\u00a0PLATFORM.", "YOU DON’TNEED TO BEA BROKER.", "THE COMMERCIAL ADVANTAGE", expect.any(String), expect.any(String), "FROM ACCESSTO COMMISSION", "LESS ADMINISTRATION. MORE OPPORTUNITY.", "THREE STEPS TO GET STARTED."]);
  });

  it("submits broker registration request with broker details", async () => {
    let capturedBody = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/leads") && init?.method === "POST") {
        capturedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ saved: true }), { status: 201, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    });

    try {
      window.history.replaceState({}, "", "/#why-aixess");
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "REQUEST ACCESS" }));
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();

      fireEvent.change(within(modal).getByLabelText("FIRST NAME"), { target: { value: "Giorgi" } });
      fireEvent.change(within(modal).getByLabelText("SURNAME"), { target: { value: "Kemo" } });
      fireEvent.change(within(modal).getByLabelText("PHONE NUMBER"), { target: { value: "+995 555 123456" } });
      fireEvent.change(within(modal).getByLabelText("EMAIL ADDRESS"), { target: { value: "broker@aixess.global" } });
      fireEvent.change(within(modal).getByLabelText("COMPANY (OPTIONAL)"), { target: { value: "AiXESS Capital" } });
      fireEvent.click(within(modal).getByRole("checkbox"));

      fireEvent.click(within(modal).getByRole("button", { name: "REQUEST BROKER ACCESS" }));

      await waitFor(() => {
        expect(screen.getByText("REQUEST RECEIVED")).toBeInTheDocument();
        expect(screen.getByText("We’ll be in touch.")).toBeInTheDocument();
      });

      expect(capturedBody).toMatchObject({
        name: "Giorgi Kemo",
        firstName: "Giorgi",
        surname: "Kemo",
        phone: "+995 555 123456",
        email: "broker@aixess.global",
        company: "AiXESS Capital",
        privacyAccepted: true,
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("opens a TRESORA request as a form and sends it with the project and request", async () => {
    let capturedBody = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/api/leads") && init?.method === "POST") {
        capturedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ saved: true, team: true, confirmation: true }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    });
    try {
      if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 });
      window.history.replaceState({}, "", "/#tresora");
      render(<App />);
      const button = document.querySelector("a.tr-button[href^='mailto:']");
      const label = button.textContent;
      fireEvent.click(button);
      const modal = screen.getByRole("dialog");
      expect(within(modal).getByRole("heading", { name: label })).toBeInTheDocument();
      fireEvent.change(within(modal).getByLabelText("FIRST NAME"), { target: { value: "Anna" } });
      fireEvent.change(within(modal).getByLabelText("SURNAME"), { target: { value: "Smith" } });
      fireEvent.change(within(modal).getByLabelText("PHONE NUMBER"), { target: { value: "+44 7700 900123" } });
      fireEvent.change(within(modal).getByLabelText("EMAIL ADDRESS"), { target: { value: "anna@example.com" } });
      fireEvent.change(within(modal).getByLabelText("MESSAGE (OPTIONAL)"), { target: { value: "Two bedrooms, please." } });
      fireEvent.click(within(modal).getByRole("checkbox"));
      fireEvent.click(within(modal).getByRole("button", { name: "SEND REQUEST" }));
      await waitFor(() => expect(screen.getByText(/A confirmation is on its way to anna@example.com/)).toBeInTheDocument());
      expect(capturedBody).toMatchObject({ kind: "enquiry", project: "TRESORA", request: label, requestEn: label, route: "tresora", name: "Anna Smith", message: "Two bedrooms, please.", locale: "en" });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("opens the footer's Write to us as a contact form with a required message", () => {
    window.history.replaceState({}, "", "/#why-aixess");
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /WRITE TO US/ }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByLabelText("MESSAGE")).toBeRequired();
    expect(within(modal).getByLabelText("PHONE NUMBER (OPTIONAL)")).not.toBeRequired();
    expect(within(modal).getByRole("button", { name: "SEND MESSAGE" })).toBeInTheDocument();
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

  it("merges Broker Tools into Broker Access: no menu entry, and old links land on Broker Access", () => {
    window.history.replaceState({}, "", "/#broker-access");
    render(<App />);

    expect(screen.queryByRole("button", { name: "BROKER TOOLS" })).not.toBeInTheDocument();
    expect(window.location.hash).toBe("#broker-access");
    expect(screen.getAllByRole("button", { name: "BROKER ACCESS" }).filter((button) => button.getAttribute("aria-current") === "page")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 1, name: "EVERYTHING YOU NEEDTO SELL. ONE\u00a0PLATFORM." })).toBeInTheDocument();
  });

  it("opens materials request modal, submits contact details, and unlocks downloads", async () => {
    window.localStorage.clear();
    let capturedBody = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/leads") && init?.method === "POST") {
        capturedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ saved: true }), { status: 201, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    });

    try {
      window.history.replaceState({}, "", "/#insights");
      render(<App />);
      const brochures = screen.getByRole("heading", { name: "Project Brochures" }).closest("article");
      fireEvent.click(within(brochures).getByRole("button", { name: /^request/i }));

      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByRole("heading", { name: "Request project materials." })).toBeInTheDocument();

      fireEvent.change(within(modal).getByLabelText("FIRST NAME"), { target: { value: "Elena" } });
      fireEvent.change(within(modal).getByLabelText("SURNAME"), { target: { value: "Rostova" } });
      fireEvent.change(within(modal).getByLabelText("PHONE NUMBER"), { target: { value: "+44 20 7946 0958" } });
      fireEvent.change(within(modal).getByLabelText("EMAIL ADDRESS"), { target: { value: "elena@example.com" } });
      fireEvent.change(within(modal).getByLabelText("COMPANY (OPTIONAL)"), { target: { value: "London Real Estate Ltd" } });
      fireEvent.click(within(modal).getByRole("checkbox"));

      fireEvent.click(within(modal).getByRole("button", { name: "DOWNLOAD PROJECT MATERIALS" }));

      await waitFor(() => {
        expect(screen.getByText("DOWNLOADS UNLOCKED")).toBeInTheDocument();
        expect(screen.getByText("All materials are now unlocked.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "DOWNLOAD BROCHURE (PDF)" })).toHaveAttribute(
          "href",
          "https://www.aixco.global/aixco-global-op2/documents/reverance-brochure-en.pdf"
        );
      });

      expect(capturedBody).toMatchObject({
        name: "Elena Rostova",
        firstName: "Elena",
        surname: "Rostova",
        phone: "+44 20 7946 0958",
        email: "elena@example.com",
        company: "London Real Estate Ltd",
        kind: "materials",
        privacyAccepted: true,
      });

      expect(window.localStorage.getItem("aixess-download-access-v1")).toBe("granted");
    } finally {
      fetchMock.mockRestore();
      window.localStorage.clear();
    }
  });

  it("opens broker registration form from Explore Full Opportunity button on residences page", () => {
    window.history.replaceState({}, "", "/#residences");
    render(<App />);

    const exploreOpportunityBtn = screen.getByRole("button", { name: /EXPLORE THE FULL OPPORTUNITY INSIDE AiXESS/i });
    expect(exploreOpportunityBtn).toBeInTheDocument();
    fireEvent.click(exploreOpportunityBtn);

    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByRole("heading", { name: "Register as a broker." })).toBeInTheDocument();
  });

  it("answers the twelve AIXCO.Global FAQ entries in a native accordion, in source order", () => {
    window.history.replaceState({}, "", "/#insights");
    const { container } = render(<App />);

    const items = Array.from(container.querySelectorAll(".it-faq details"));
    expect(items).toHaveLength(12);
    expect(items.every((item) => !item.open)).toBe(true);
    expect(items.map((item) => item.querySelector("summary").textContent.replace("+", ""))).toEqual(AIXCO_FAQ.en.map(([question]) => question));
    expect(within(items[1]).getByText("The minimum investment amount is $5,900.")).toBeInTheDocument();
  });

  it("drops the Insights hero actions and the closing partner banner", () => {
    window.history.replaceState({}, "", "/#insights");
    const { container } = render(<App />);

    expect(container.querySelector(".lasha-page-hero-copy .button")).not.toBeInTheDocument();
    expect(screen.queryByText("JOIN THE AIXESS BROKER NETWORK.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /EXPLORE INSIGHTS/ })).not.toBeInTheDocument();
  });

  it("describes Broker Network & Team Management as the third broker tool", () => {
    window.history.replaceState({}, "", "/#broker-access");
    const { container } = render(<App />);

    const cards = container.querySelectorAll(".it-feature");
    expect(cards).toHaveLength(6);
    expect(cards[2]).toHaveTextContent("03. BROKER NETWORK & TEAM MANAGEMENT");
    // Text-only trial (14 October 2026): no pictures, sketches, icons or ILLUSTRATION labels.
    cards.forEach((card) => expect(card.querySelector("img, svg, picture")).toBeNull());
    expect(screen.queryByText(/^Illustration$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SMART SALES CALCULATIONS/)).not.toBeInTheDocument();
  });

  it("keeps the calculators and client PDF generator off the public Broker Access page", async () => {
    window.history.replaceState({}, "", "/#broker-access");
    render(<App />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("CREATE CLIENT PDF")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /BECOME A PARTNER/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /REQUEST BROKER ACCESS/ })).toBeInTheDocument();
  });

  it("opens Reverance through Projects and Batumi and closes Projects with Escape", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);

    const toggle = within(container.querySelector(".desktop-nav")).getByRole("button", { name: "PROJECTS" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    fireEvent.click(within(container.querySelector("#nav-group-projects")).getByRole("button", { name: "BATUMI" }));
    fireEvent.click(within(container.querySelector("#nav-market-batumi")).getByRole("button", { name: "Reverance" }));
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
