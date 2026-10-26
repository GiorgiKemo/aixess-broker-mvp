import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { DUBAI_PROJECTS_COPY } from "../dubai-projects-copy";
import { DUBAI_IMAGES_COPY } from "../dubai-projects-images-copy";

beforeEach(() => {
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  window.localStorage.removeItem("aixess-language");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

const mailtoParts = (href) => {
  const url = new URL(href);
  return { to: url.pathname, subject: url.searchParams.get("subject"), body: url.searchParams.get("body") };
};

describe("Dubai projects: TRESORA and DOWNTOWN ONE", () => {
  it("lists both projects under Selected Opportunities, each opening its own page", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    const toggle = screen.getByRole("button", { name: "Show projects" });

    fireEvent.click(toggle);
    const menu = within(container.querySelector(".nav-group-menu"));
    expect(menu.getAllByRole("button").map((button) => button.textContent)).toEqual(["Batumi – Reverance Project", "Tresora Project", "Downtown One Project"]);
    expect([...container.querySelectorAll(".nav-group-menu > li")].map((item) => item.textContent)).toEqual(["Georgia", "Batumi – Reverance Project", "Dubai", "Tresora Project", "Downtown One Project"]);
    fireEvent.click(menu.getByRole("button", { name: "Tresora Project" }));
    expect(window.location.hash).toBe("#tresora");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORADUBAI");

    fireEvent.click(screen.getByRole("button", { name: "Show projects" }));
    fireEvent.click(within(document.querySelector(".nav-group-menu")).getByRole("button", { name: "Downtown One Project" }));
    expect(window.location.hash).toBe("#downtown-one");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DOWNTOWN ONEDUBAI");
    expect(document.querySelector(".dp-page").textContent).not.toContain("TRESORA");
  });

  it("shows two distinct homepage cards that open the two project pages, and Back returns home", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    const listing = within(document.getElementById("dubai-projects"));
    const links = listing.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["#tresora", "#downtown-one"]);
    expect(listing.getByRole("heading", { name: "TRESORA Project" })).toBeInTheDocument();
    expect(listing.getByRole("heading", { name: "DOWNTOWN ONE DUBAI" })).toBeInTheDocument();

    fireEvent.click(links[1]);
    expect(window.location.hash).toBe("#downtown-one");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DOWNTOWN ONE");
    act(() => {
      window.history.back();
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(document.getElementById("dubai-projects")).not.toBeNull();
  });

  it("opens each page from its shareable address, including a section address", () => {
    window.history.replaceState({}, "", "/#downtown-one/highlights");
    const { unmount } = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DOWNTOWN ONE");
    expect(window.location.hash).toBe("#downtown-one/highlights");
    unmount();

    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORA");
    // The section ids never equal a route, so a section can never be mistaken for a page.
    ["tresora", "downtown-one", "residences", "home", "projects"].forEach((route) => expect(document.querySelectorAll(`.dubai-project-page [id='${route}']`)).toHaveLength(0));
  });

  // Every string the copy holds for a page, so the rendered text can be checked against the briefs only.
  const strings = (value) => (typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
  const visibleTexts = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (text && !walker.currentNode.parentElement.closest(".site-header")) texts.push(text);
    }
    return texts;
  };

  ["tresora", "downtown-one"].forEach((route) => {
    it(`shows only the brief's own words on ${route}, with no asterisk or extra label`, () => {
      ["en", "de", "pl", "sl", "ru"].forEach((locale) => {
        window.localStorage.setItem("aixess-language", locale);
        window.history.replaceState({}, "", `/#${route}`);
        const { unmount } = render(<App />);
        const copy = DUBAI_PROJECTS_COPY[locale][route === "tresora" ? "tresora" : "downtown"];
        const allowed = new Set(strings(copy));
        const page = document.querySelector(".dubai-project-page");
        const hero = page.querySelector(".dp-hero");
        const texts = [...visibleTexts(hero), ...visibleTexts(page.querySelector(".dp-page"))];
        expect(texts.filter((text) => !allowed.has(text))).toEqual([]);
        expect(page.textContent).not.toContain("*");
        expect(page.querySelectorAll("figcaption, table, a[download], dialog")).toHaveLength(0);
        unmount();
      });
    });
  });

  it("builds TRESORA in the brief's order: hero facts, highlights, spaces, amenities, location, payment, more", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.tresora;
    expect([...page.querySelectorAll(".dp-page h2")].map((title) => title.textContent)).toEqual([
      copy.discover.title, copy.highlights.title, copy.spaces.title, copy.lifestyle.title, copy.location.title, copy.payment.title, copy.more.title,
    ]);
    expect([...page.querySelectorAll(".dp-hero-facts dd")].map((value) => value.textContent)).toEqual(["20%", "Q1 2028"]);
    expect(page.textContent).not.toMatch(/182[.,\s\u00a0]?437/);
    expect(copy.spaces.categories).toHaveLength(6);
    expect(copy.lifestyle.amenities).toHaveLength(8);
    expect(page.textContent).not.toMatch(/Penthouse|Sauna|WADAN|AED|Floor plans|Gallery|Resident app\b/);
    expect(document.getElementById("tresora-currency")).toHaveTextContent(`${copy.currency.title}${copy.currency.text}`);

    const images = [...page.querySelectorAll("img")];
    expect(images.length).toBe(DUBAI_IMAGES_COPY.en.tresora.gallery.length + 4);
    images.forEach((image) => {
      expect(image.getAttribute("src")).toMatch(/^\/assets\/dubai\/tresora-[a-z0-9-]+\.webp$/);
      expect(image.alt).not.toBe("");
      expect(image.closest("button")).toBeNull();
    });
    expect(page.querySelector(".dp-hero-figure img")).toHaveAttribute("loading", "eager");
    expect([...page.querySelectorAll(".dp-page img")].filter((image) => image.getAttribute("loading") !== "lazy")).toEqual([]);
  });

  it("sends every TRESORA request as an email naming the project, never a dead link", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const requests = [...page.querySelectorAll("a[href^='mailto:']")].map((link) => mailtoParts(link.href));
    expect(requests.map((request) => request.subject)).toEqual([
      "Request Availability", "Request Available Units", "Enquire About Prices", "Contact AiXESS", "Contact AiXESS", "Request Project Details",
    ].map((request) => `AiXESS · TRESORA DUBAI: ${request}`));
    requests.forEach((request) => {
      expect(request.to).toBe("info@aixess.global");
      expect(request.body).toContain("Project: TRESORA DUBAI\r\nLocation: Jumeirah Village Circle (JVC), Dubai\r\nRequest: ");
    });
    expect([...page.querySelectorAll("a")].filter((link) => ["#", ""].includes(link.getAttribute("href")))).toHaveLength(0);
    const map = screen.getByRole("link", { name: /Explore the Location/ });
    expect(map).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Jumeirah%20Village%20Circle%2C%20Dubai");
    expect(map).toHaveAttribute("target", "_blank");
  });

  it("takes Explore Residences to TRESORA's property categories without leaving the page", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /Explore Residences/ }));
    expect(window.location.hash).toBe("#tresora/spaces");
    expect(document.activeElement).toHaveTextContent(DUBAI_PROJECTS_COPY.en.tresora.spaces.title);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORA");
  });

  it("builds DOWNTOWN ONE in the brief's order with its six highlight cards and the pictures", () => {
    window.history.replaceState({}, "", "/#downtown-one");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.downtown;
    expect([...page.querySelectorAll(".dp-page h2")].map((title) => title.textContent)).toEqual([
      copy.highlights.title, copy.amenities.title, copy.location.title, copy.more.title,
    ]);
    expect([...page.querySelectorAll(".dp-cards strong")].map((value) => value.textContent)).toEqual(["20 Floors", "10%", "December 2029", "AI-Powered", "Metro & Road", "20+ Amenities"]);
    expect(copy.amenities.groups.flatMap(([, items]) => items)).toHaveLength(21);
    expect(page.textContent).not.toMatch(/DOWNTOWN DUBAI|SAMANA|AED|PDC|Shallow Pool|Cigar Lounge|Outdoor Shower|Here add pictures|_{3,}/);
    expect(screen.getByText("Dubai Metro and Aster Cedars Hospital — approximately 5–10 minutes")).toBeInTheDocument();
    expect(page.querySelectorAll(".dp-gallery img")).toHaveLength(DUBAI_IMAGES_COPY.en.downtown.gallery.length);
    [...page.querySelectorAll("img")].forEach((image) => expect(image.getAttribute("src")).toMatch(/^\/assets\/dubai\/downtown-[a-z0-9-]+\.webp$/));
    expect([...page.querySelectorAll("a[href^='mailto:']")].map((link) => mailtoParts(link.href).subject)).toEqual(
      ["Request Availability", "Request Brochure", "Contact AiXESS"].map((request) => `AiXESS · DOWNTOWN ONE DUBAI: ${request}`),
    );
    page.querySelectorAll("a[href^='mailto:']").forEach((link) => expect(mailtoParts(link.href).body).toContain("Location: Downtown Jebel Ali, Dubai"));

    fireEvent.click(screen.getByRole("link", { name: /Explore Residences/ }));
    expect(window.location.hash).toBe("#downtown-one/highlights");
  });

  it("translates both pages completely in every language", () => {
    const shape = (value) => (Array.isArray(value) ? value.map(shape) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : typeof value);
    const english = shape(DUBAI_PROJECTS_COPY.en);
    ["de", "pl", "sl", "ru"].forEach((locale) => {
      expect(shape(DUBAI_PROJECTS_COPY[locale])).toEqual(english);
      expect(shape(DUBAI_IMAGES_COPY[locale])).toEqual(shape(DUBAI_IMAGES_COPY.en));
      window.localStorage.setItem("aixess-language", locale);
      ["tresora", "downtown-one"].forEach((route) => {
        window.history.replaceState({}, "", `/#${route}`);
        const { unmount } = render(<App />);
        expect(document.querySelector(".dubai-project-page").textContent).not.toMatch(/\{\{|undefined/);
        unmount();
      });
    });
  });
});
