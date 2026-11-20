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
  it("lists both projects under Projects and UAE / Dubai, each opening its own page", () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(<App />);
    const toggle = within(container.querySelector(".desktop-nav")).getByRole("button", { name: "PROJECTS" });

    fireEvent.click(toggle);
    fireEvent.click(within(container.querySelector("#nav-group-projects")).getByRole("button", { name: "UAE / DUBAI" }));
    const menu = within(container.querySelector("#nav-market-dubai"));
    expect(menu.getAllByRole("button").map((button) => button.textContent)).toEqual(["Tresora", "Downtown One"]);
    fireEvent.click(menu.getByRole("button", { name: "Tresora" }));
    expect(window.location.hash).toBe("#tresora");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORA DUBAI");

    fireEvent.click(within(document.querySelector(".desktop-nav")).getByRole("button", { name: "PROJECTS" }));
    fireEvent.click(within(document.querySelector("#nav-group-projects")).getByRole("button", { name: "UAE / DUBAI" }));
    fireEvent.click(within(document.querySelector("#nav-market-dubai")).getByRole("button", { name: "Downtown One" }));
    expect(window.location.hash).toBe("#downtown-one");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DOWNTOWN ONE DUBAI");
    expect(document.querySelector(".dt-page").textContent).not.toContain("TRESORA");
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

  // Every string in the approved page copy, including TRESORA's supplied price and furnishing photos.
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
    it(`shows only the approved copy on ${route}, with no asterisk or extra label`, () => {
      ["en", "de", "pl", "sl", "ru"].forEach((locale) => {
        window.localStorage.setItem("aixess-language", locale);
        window.history.replaceState({}, "", `/#${route}`);
        const { unmount } = render(<App />);
        const copy = DUBAI_PROJECTS_COPY[locale][route === "tresora" ? "tresora" : "downtown"];
        const allowed = new Set(strings(copy));
        const page = document.querySelector(".dubai-project-page");
        if (route === "tresora") {
          // The Figma layout sets some titles over two lines (and drops their full stops), so each piece only has to come from the copy.
          const pieces = [...allowed, copy.hero.title.join(" ")].join("\n").replace(/US\$/g, "US $");
          const texts = [...visibleTexts(page.querySelector(".tr-hero")), ...visibleTexts(page.querySelector(".tr-page"))].filter((text) => !/^0[1-8]$/.test(text));
          expect(texts.filter((text) => !pieces.includes(text.replace(/\.$/, "")))).toEqual([]);
          expect(page.querySelectorAll("table, a[download], dialog")).toHaveLength(0);
        } else {
          // Figma's layout joins a highlight's figure and line with a dash, lists the nearby places with middle
          // dots and drops "approximately"; every piece still comes from the copy.
          const pieces = strings(copy).join("\n");
          const texts = [...visibleTexts(page.querySelector(".dt-hero")), ...visibleTexts(page.querySelector(".dt-page"))];
          expect(texts.flatMap((text) => text.split(/ – | · /)).filter((text) => !pieces.includes(text))).toEqual([]);
          expect(page.querySelectorAll("table, a[download], dialog")).toHaveLength(0);
        }
        expect(page.textContent).not.toContain("*");
        unmount();
      });
    });
  });

  it("builds TRESORA in the Figma order, with its spaces, inclusions and amenities and only its starting price", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.tresora;
    const flat = (text) => text.replace(/\s+/g, " ").trim();
    expect(flat(page.querySelector("h1").textContent)).toBe(`${copy.hero.title.join(" ")} ${copy.hero.subtitle}`);
    expect([...page.querySelectorAll(".tr-page h2")].map((title) => title.id)).toEqual([
      "tresora-discover-title", "tresora-highlights-title", "tresora-spaces-title", "tresora-included-title", "tresora-lifestyle-title", "tresora-location-title", "tresora-payment-title", "tresora-more-title",
    ]);
    expect([...page.querySelectorAll(".tr-facts dd")].map((value) => value.textContent)).toEqual(copy.highlights.items.map(([value]) => value));
    expect([...page.querySelectorAll(".tr-categories li")].map((item) => item.textContent)).toEqual(copy.spaces.categories);
    expect([...page.querySelectorAll(".tr-included-list dt")].map((item) => item.textContent)).toEqual(copy.included.items.map(([title]) => title));
    expect([...page.querySelectorAll(".tr-amenity-name")].map((item) => item.textContent)).toEqual(copy.lifestyle.amenities);
    expect(page.querySelectorAll(".tr-gallery-group")).toHaveLength(4);
    // Prices: "$176,000 / Starting from" in the highlights band (Kemo, 3 November 2026), and the frame's two
    // figures beside the property categories (Kemo, 13 November 2026): starting price and price per m².
    // No rent and no currency note.
    const facts = page.querySelector(".tr-facts");
    expect([...facts.querySelectorAll("dd")].at(-1).textContent).toBe("$176,000");
    expect([...facts.querySelectorAll("dt")].at(-1).textContent).toBe("Starting from");
    expect([...page.querySelectorAll(".tr-prices dt")].map((label) => label.textContent)).toEqual(["Starting price", "Price per m²"]);
    expect([...page.querySelectorAll(".tr-prices dd")].map((value) => value.textContent)).toEqual(["US $176,635", "US $4,115"]);
    expect(page.textContent.match(/\$/g)).toHaveLength(3);
    expect(page.textContent).not.toMatch(/\brent\b|yearly|AED(?=[\s\d])|EUR/i);
    expect(page.textContent).not.toContain(copy.currency.text);
    expect(page.textContent).not.toMatch(/Penthouse|Sauna|WADAN|Floor plans|Resident app\b/);

    const images = [...page.querySelectorAll("img")];
    expect(images.length).toBe(4 + 2 + 12);
    images.forEach((image) => {
      // TRESORA's renders, or their relit versions for the current theme (19 November 2026).
      expect(image.getAttribute("src")).toMatch(/^\/assets\/(dubai\/tresora-fig-[a-z0-9-]+|figma\/tresora-fig-[a-z]+-(day|afternoon|night)-\d+)\.webp$/);
      expect(image.closest("button")).toBeNull();
    });
    [...page.querySelectorAll(".tr-slant img, .tr-gallery img, .tr-map img")].forEach((image) => expect(image.alt).not.toBe(""));
    expect(page.querySelector(".tr-hero img")).toHaveAttribute("loading", "eager");
    expect([...page.querySelectorAll(".tr-page img")].filter((image) => image.getAttribute("loading") !== "lazy")).toEqual([]);
  });

  it("sends every TRESORA request as an email naming the project, never a dead link", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const requests = [...page.querySelectorAll("a[href^='mailto:']")].map((link) => mailtoParts(link.href));
    expect(requests.map((request) => request.subject)).toEqual([
      "Request Availability", "Request Availability", "Contact AiXESS", "Request Project Details",
    ].map((request) => `AiXESS · TRESORA DUBAI: ${request}`));
    requests.forEach((request) => {
      expect(request.to).toBe("info@aixess.global");
      expect(request.body).toContain("Project: TRESORA DUBAI\r\nLocation: Jumeirah Village Circle (JVC), Dubai\r\nRequest: ");
    });
    expect([...page.querySelectorAll("a")].filter((link) => ["#", ""].includes(link.getAttribute("href")))).toHaveLength(0);
  });

  it("takes Explore Residences to TRESORA's property categories, then on to the gallery, without leaving the page", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const [heroExplore, spacesExplore] = screen.getAllByRole("link", { name: /Explore Residences/ });
    fireEvent.click(heroExplore);
    expect(window.location.hash).toBe("#tresora/spaces");
    expect(document.activeElement.textContent.replace(/\s+/g, " ").trim()).toBe(DUBAI_PROJECTS_COPY.en.tresora.spaces.title);
    fireEvent.click(spacesExplore);
    expect(window.location.hash).toBe("#tresora/gallery");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORA");
  });

  it("builds DOWNTOWN ONE as the Figma frame, with its highlights, amenities, nearby places and gallery", () => {
    window.history.replaceState({}, "", "/#downtown-one");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.downtown;
    expect(page).toHaveClass("tresora-page");
    expect([...page.querySelectorAll(".dt-page h2")].map((title) => title.textContent.replace(/\s+/g, " ").trim())).toEqual([
      "Project Highlights", "A Lifestyle Designed Around Every Moment", "Downtown Jebel Ali A Location That Keeps You Moving", "Resident Amenities", copy.more.title,
    ]);
    expect([...page.querySelectorAll(".dt-facts dt")].map((title) => title.textContent)).toEqual([
      "Contemporary Residential Tower", "Strategic Connectivity", "Lifestyle Experiences", "Smart Home Living", "Initial Down Payment", "Anticipated Completion",
    ]);
    expect(page.querySelector(".dt-facts dd").textContent).toBe("20 Floors – Plus three podium floors, ground floor and basement");
    expect([...page.querySelectorAll(".dt-amenity li")]).toHaveLength(21);
    expect([...page.querySelectorAll(".dt-nearby dt")].map((time) => time.textContent)).toEqual(["5–10 minutes", "10–15 minutes", "15–20 minutes"]);
    expect(page.querySelector(".dt-nearby dd").textContent).toBe("Dubai Metro · Aster Cedars Hospital");
    expect([...page.querySelectorAll(".dt-gallery figcaption")].map((caption) => caption.textContent)).toEqual(["Pools & Relaxation", "Wellness & Fitness", "Exterior", "Interior"]);
    expect(page.querySelectorAll(".dt-gallery img")).toHaveLength(12);
    expect(page.textContent).not.toMatch(/DOWNTOWN DUBAI|SAMANA|TRESORA|WADAN|AED(?=[\s\d])|PDC|Here add pictures|_{3,}/);
    [...page.querySelectorAll("img")].forEach((image) => {
      // The developer's renders, or the hero's and entertainment deck's relit versions for the theme.
      expect(image.getAttribute("src")).toMatch(/^\/assets\/(dubai\/downtown-[a-z0-9-]+|figma\/downtown-fig-(hero|ent)-(day|afternoon|night)-\d+)\.webp$/);
    });
    [...page.querySelectorAll(".dt-crop img")].forEach((image) => expect(image.alt).not.toBe(""));
    expect(page.querySelector(".dt-hero img")).toHaveAttribute("loading", "eager");
    expect([...page.querySelectorAll("a[href^='mailto:']")].map((link) => mailtoParts(link.href).subject)).toEqual(
      ["Request Availability"].map((request) => `AiXESS · DOWNTOWN ONE DUBAI: ${request}`),
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
