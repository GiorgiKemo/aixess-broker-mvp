import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { DUBAI_PROJECTS_COPY } from "../dubai-projects-copy";
import { DUBAI_SOURCES_COPY } from "../dubai-projects-sources-copy";
import {
  DOWNTOWN_MAPS_URL, DOWNTOWN_MIX, DOWNTOWN_PLANS, DOWNTOWN_TOTAL_UNITS, DUBAI_DOCS, TRESORA_FROM_AED, TRESORA_PLAN_4060,
  TRESORA_PLAN_PHPP, TRESORA_PRICES, usdFromAed,
} from "../dubai-projects-data";

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
    expect(menu.getAllByRole("button").map((button) => button.textContent)).toEqual(["Georgia Batumi - Reverance", "Dubai - TRESORA Project", "Dubai - Downtown One"]);
    fireEvent.click(menu.getByRole("button", { name: "Dubai - TRESORA Project" }));
    expect(window.location.hash).toBe("#tresora");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORADUBAI");

    fireEvent.click(screen.getByRole("button", { name: "Show projects" }));
    fireEvent.click(within(document.querySelector(".nav-group-menu")).getByRole("button", { name: "Dubai - Downtown One" }));
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

  it("builds TRESORA from every supplied section and the developer's October price list", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.tresora;
    const extra = DUBAI_SOURCES_COPY.en.tresora;
    [copy.discover.title, copy.highlights.title, copy.spaces.title, extra.prices.title, extra.floors.title, copy.lifestyle.title, /Connected to What Matters/, copy.payment.title, copy.more.title].forEach((title) => {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    });
    copy.spaces.categories.forEach((name) => expect(screen.getByRole("heading", { level: 4, name })).toBeInTheDocument());
    copy.lifestyle.amenities.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
    copy.location.nearby.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());

    // The from price is the lowest studio on the 40/60 plan (AED 763,168 at the dirham's peg), tied to the currency note.
    expect(usdFromAed(TRESORA_FROM_AED)).toBe(207806);
    const note = document.getElementById("tresora-currency");
    expect(note).toHaveTextContent("All prices are displayed in US Dollars (USD), the primary currency used by AiXESS.");
    expect(note).toHaveTextContent("AED 3.6725 to US$1");
    const price = screen.getByText((_, element) => element?.tagName === "DD" && element.textContent === "US$207,806*");
    expect(price).toHaveAttribute("aria-describedby", "tresora-currency");
    expect(page.textContent).not.toMatch(/182,437|70\/30/);

    // One row per category: PHPP is 107% and upfront 85% of the 40/60 price; offices have no PHPP price.
    const rows = [...document.querySelectorAll(".dp-price-table tbody tr")];
    expect(rows).toHaveLength(TRESORA_PRICES.length);
    TRESORA_PRICES.forEach((row) => {
      if (row.phpp !== null) expect(row.phpp).toBeCloseTo(row.plan4060 * 1.07, 2);
      expect(row.upfront).toBeCloseTo(row.plan4060 * 0.85, 2);
    });
    expect(rows[0]).toHaveTextContent(/AED\s763,168/);
    expect(rows[4]).toHaveTextContent(extra.prices.noPrice);
    expect(rows[4].textContent).not.toMatch(/AED\s2,496,849/);

    // Both payment plans add up to 100%.
    expect(TRESORA_PLAN_4060.reduce((sum, [, value]) => sum + value, 0)).toBe(100);
    const phpp = TRESORA_PLAN_PHPP;
    expect(phpp.down + [...phpp.toCompletion, ...phpp.afterCompletion].reduce((sum, [, value]) => sum + value, 0)).toBe(100);
    expect(screen.getByRole("heading", { level: 3, name: extra.plans.title4060 }).closest("article").querySelector("tfoot")).toHaveTextContent("100%");

    // Eight floor plates, each opening whole in the lightbox with a link to the full-size file.
    const plans = document.querySelectorAll("#tresora-floors .dp-plan-image");
    expect(plans).toHaveLength(8);
    fireEvent.click(plans[0]);
    const dialog = document.querySelector("dialog.rp-lightbox");
    expect(dialog).toHaveTextContent(extra.floors.items[2][0]);
    expect(within(dialog).getByRole("link", { name: /Open full-size image/ }).getAttribute("href")).toBe("/assets/dubai/tresora-floor-2-3200.webp");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    const downloads = [...page.querySelectorAll("a[download]")].map((link) => link.getAttribute("href"));
    expect(downloads).toEqual([DUBAI_DOCS.tresoraFloorPlans, DUBAI_DOCS.tresoraPaymentPlan]);
    const images = [...page.parentElement.querySelectorAll("img")].filter((image) => image.closest(".dubai-project-page"));
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => {
      expect(image.getAttribute("src")).toMatch(/^\/assets\/dubai\/tresora-[a-z0-9-]+\.webp$/);
      expect(image.getAttribute("srcset")).not.toMatch(/avif/);
    });
    expect(page.querySelector(".dp-hero-figure img")).toHaveAttribute("loading", "eager");
    expect([...page.querySelectorAll(".dp-page img")].filter((image) => image.getAttribute("loading") !== "lazy").map((image) => image.outerHTML)).toEqual([]);
  });

  it("keeps TRESORA in US dollars and the developer's AED in German and Slovenian, never euros", () => {
    window.localStorage.setItem("aixess-language", "de");
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    expect(document.querySelector(".dp-hero-facts").textContent).toMatch(/207\.806\sUSD/);
    expect(document.querySelector(".dubai-project-page").textContent).not.toContain("€");
  });

  it("adds the brochure renderings at their own size and the WADAN app as the developer describes it", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const gallery = document.getElementById("tresora-gallery");
    const stills = [...document.querySelectorAll(".dp-gallery-still img")];
    expect(stills.map((image) => image.getAttribute("src"))).toEqual(
      ["dusk", "entrance", "lounge", "living", "kitchen", "bedroom", "deck", "gym"].map((name) => `/assets/dubai/tresora-${name}-584.webp`),
    );
    stills.forEach((image) => {
      expect(image.getAttribute("loading")).toBe("lazy");
      expect(image.getAttribute("srcset")).not.toMatch(/avif|png|jpe?g/i);
      expect(image.alt).not.toBe("");
      expect(image.closest("button")).toBeNull();
    });
    expect(gallery).toHaveTextContent("Developer renderings from WADAN's TRESORA brochure");
    const app = document.getElementById("tresora-app");
    expect([...app.querySelectorAll(".dp-list li")].map((item) => item.textContent)).toEqual(["01AI assistance", "02Updates", "03Requests", "04Documents", "05Announcements"]);
    expect(app).toHaveTextContent("not an AiXESS service");
    expect(app.querySelector("a, button")).toBeNull();
  });

  it("sends every TRESORA request as an email naming the project, never a dead link", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const requests = [...page.querySelectorAll("a[href^='mailto:']")].map((link) => mailtoParts(link.href));
    expect(requests.length).toBeGreaterThanOrEqual(10);
    expect(requests.map((request) => request.subject)).toContain("AiXESS · TRESORA DUBAI: Enquire about prices: Penthouse".replace("Penthouse", "Two-Bedroom Penthouse"));
    expect(requests.map((request) => request.subject)).toContain("AiXESS · TRESORA DUBAI: Payment plans");
    requests.forEach((request) => {
      expect(request.to).toBe("info@aixess.global");
      expect(request.subject.startsWith("AiXESS · TRESORA DUBAI: ")).toBe(true);
      expect(request.body).toContain("Project: TRESORA DUBAI\r\nLocation: Jumeirah Village Circle (JVC), Dubai\r\nRequest: ");
    });
    expect(page.textContent).not.toMatch(/\+971|800\s?WADAN/i);
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
    expect(document.activeElement).toHaveTextContent("Designed for Different Lifestyles");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORA");
  });

  it("builds DOWNTOWN ONE from its brief, the launch mix, both payment plans and the ten layouts", () => {
    window.history.replaceState({}, "", "/#downtown-one");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.downtown;
    const extra = DUBAI_SOURCES_COPY.en.downtown;
    expect(page.textContent).toContain("Downtown Jebel Ali");
    expect(page.textContent).not.toMatch(/DOWNTOWN DUBAI|Downtown Dubai|pending confirmation/);

    copy.highlights.items.forEach(([, title, line]) => {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
      expect(screen.getByText(line)).toBeInTheDocument();
    });
    const price = screen.getByText((_, element) => element?.tagName === "DD" && element.textContent === "US$187,611*");
    expect(price).toHaveAttribute("aria-describedby", "downtown-one-mix-note");
    expect(document.getElementById("downtown-one-mix-note")).toHaveTextContent("not a live count");

    expect(DOWNTOWN_MIX.map((row) => [row.units, row.fromAed])).toEqual([[49, 689000], [160, 1039000], [36, 1429000]]);
    expect(DOWNTOWN_TOTAL_UNITS).toBe(245);
    const mix = [...document.querySelectorAll(".dp-mix-table tbody tr")];
    expect(mix.map((row) => row.querySelector("td").textContent)).toEqual(["49", "160", "36"]);
    expect(mix[2]).toHaveTextContent(/AED\s1,429,000/);

    // Both plans add up to 100%: 10 + 5 + 5 + 80 × 1 and 15 + 5 + 5 + 75 × 1.
    DOWNTOWN_PLANS.forEach((plan) => expect(plan.down + plan.month6 + plan.month12 + plan.monthly * plan.months).toBe(100));
    const plans = document.querySelector("#downtown-one-payment .dp-compare");
    expect([...plans.querySelectorAll("thead th")].map((cell) => cell.textContent)).toEqual(["With PDC", "Without PDC"]);
    expect([...plans.querySelectorAll("tfoot td")].map((cell) => cell.textContent)).toEqual(["100%", "100%"]);
    expect(plans).toHaveTextContent("1% × 80");
    expect(plans).toHaveTextContent("1% × 75");

    // Ten layouts with a filter by type.
    const layouts = () => document.querySelectorAll(".dp-plans-layouts .dp-plan");
    expect(layouts()).toHaveLength(10);
    const filter = within(screen.getByRole("group", { name: extra.layouts.filterLabel }));
    [["Studios", 2], ["One-Bedroom", 6], ["Two-Bedroom", 2], ["All", 10]].forEach(([name, count]) => {
      fireEvent.click(filter.getByRole("button", { name }));
      expect(filter.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
      expect(layouts()).toHaveLength(count);
    });

    const amenities = copy.amenities.groups.flatMap(([, items]) => items);
    expect(amenities).toHaveLength(24);
    amenities.forEach((name) => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
    copy.location.nearby.forEach(([time, places]) => {
      expect(screen.getByText(time)).toBeInTheDocument();
      expect(screen.getByText(places)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /Open the location in Google Maps/ })).toHaveAttribute("href", DOWNTOWN_MAPS_URL);
    expect(DOWNTOWN_MAPS_URL).toBe("https://maps.app.goo.gl/5EizrKqnmAapLtEh7");
    expect(page.textContent).not.toMatch(/_{3,}|Here add pictures|\+971/);

    expect(page.querySelectorAll(".dp-gallery img")).toHaveLength(extra.gallery.items.length + extra.amenityGallery.items.length);
    [...page.querySelectorAll("img")].forEach((image) => expect(image.getAttribute("src")).toMatch(/^\/assets\/dubai\/downtown-[a-z0-9-]+\.webp$/));
    const downloads = [...new Set([...page.querySelectorAll("a[download]")].map((link) => link.getAttribute("href")))];
    expect(downloads).toEqual([DUBAI_DOCS.downtownBrochure, DUBAI_DOCS.downtownFactbook]);
    page.querySelectorAll("a[href^='mailto:']").forEach((link) => {
      const request = mailtoParts(link.href);
      expect(request.to).toBe("info@aixess.global");
      expect(request.body).toContain("Location: Downtown Jebel Ali, Dubai");
    });

    fireEvent.click(screen.getByRole("link", { name: /Explore Residences/ }));
    expect(window.location.hash).toBe("#downtown-one/residences");
  });

  it("translates both pages completely in every language", () => {
    const shape = (value) => (Array.isArray(value) ? value.map(shape) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : typeof value);
    const english = shape(DUBAI_PROJECTS_COPY.en);
    ["de", "pl", "sl", "ru"].forEach((locale) => {
      expect(shape(DUBAI_PROJECTS_COPY[locale])).toEqual(english);
      expect(shape(DUBAI_SOURCES_COPY[locale])).toEqual(shape(DUBAI_SOURCES_COPY.en));
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
