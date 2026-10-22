import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { DUBAI_PROJECTS_COPY } from "../dubai-projects-copy";

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

  it("builds TRESORA from every supplied section, with the price tied to the currency note", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const copy = DUBAI_PROJECTS_COPY.en.tresora;
    [copy.discover.title, copy.highlights.title, copy.spaces.title, copy.lifestyle.title, /Connected to What Matters/, copy.payment.title, copy.more.title].forEach((title) => {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    });
    copy.spaces.categories.forEach((name) => expect(screen.getByRole("heading", { level: 4, name })).toBeInTheDocument());
    copy.lifestyle.amenities.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
    copy.location.nearby.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());

    const note = document.getElementById("tresora-currency");
    expect(note).toHaveTextContent("All prices are displayed in US Dollars (USD), the primary currency used by AiXESS.");
    const prices = screen.getAllByText((_, element) => element?.tagName === "DD" && element.textContent === "US$182,437*");
    expect(prices).toHaveLength(2);
    prices.forEach((price) => expect(price).toHaveAttribute("aria-describedby", "tresora-currency"));
    expect(screen.getAllByText("Q1 2028", { selector: "dd" })).toHaveLength(2);
    // TRESORA has only its 20% initial payment: no Reverance 10 / 30 / 60 stages or discounts.
    expect(document.querySelector(".dubai-project-page").textContent).not.toMatch(/10%|30%|60%|discount/i);
  });

  it("keeps TRESORA in US dollars in German and Slovenian, where Reverance shows euros", () => {
    window.localStorage.setItem("aixess-language", "de");
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    expect(document.querySelector(".dp-hero-facts").textContent).toContain("182.437 USD");
    expect(document.querySelector(".dubai-project-page").textContent).not.toContain("€");
  });

  it("sends every TRESORA request as an email naming the project, never a dead link", () => {
    window.history.replaceState({}, "", "/#tresora");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const requests = [...page.querySelectorAll("a[href^='mailto:']")].map((link) => mailtoParts(link.href));
    expect(requests.map((request) => request.subject)).toEqual([
      "AiXESS · TRESORA DUBAI: Request availability",
      "AiXESS · TRESORA DUBAI: Request available units",
      "AiXESS · TRESORA DUBAI: Enquire about prices",
      "AiXESS · TRESORA DUBAI: Contact AiXESS",
      "AiXESS · TRESORA DUBAI: Contact AiXESS",
      "AiXESS · TRESORA DUBAI: Request project details",
    ]);
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
    expect(document.activeElement).toHaveTextContent("Designed for Different Lifestyles");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TRESORA");
  });

  it("builds DOWNTOWN ONE from its brief and fact cards, with the 10% kept conditional and no invented price", () => {
    window.history.replaceState({}, "", "/#downtown-one");
    render(<App />);
    const page = document.querySelector(".dubai-project-page");
    const copy = DUBAI_PROJECTS_COPY.en.downtown;
    expect(page.textContent).toContain("Downtown Jebel Ali");
    expect(page.textContent).not.toMatch(/DOWNTOWN DUBAI|Downtown Dubai/);
    expect(page.textContent).not.toMatch(/\$|USD|AED/);

    copy.highlights.items.forEach(([, title, line]) => {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
      expect(screen.getByText(line)).toBeInTheDocument();
    });
    const pct = screen.getByText((_, element) => element?.tagName === "STRONG" && element.textContent === "10%*");
    expect(pct).toHaveAttribute("aria-describedby", "downtown-one-terms");
    expect(document.getElementById("downtown-one-terms")).toHaveTextContent("pending confirmation");

    const amenities = copy.amenities.groups.flatMap(([, items]) => items);
    expect(amenities).toHaveLength(21);
    amenities.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
    copy.location.nearby.forEach(([time, places]) => {
      expect(screen.getByText(time)).toBeInTheDocument();
      expect(screen.getByText(places)).toBeInTheDocument();
    });
    expect(page.textContent).not.toMatch(/_{3,}|Here add pictures/);
    expect(page.querySelectorAll("img")).toHaveLength(0);

    const brochure = mailtoParts(screen.getByRole("link", { name: /Request Brochure/ }).href);
    expect(brochure.subject).toBe("AiXESS · DOWNTOWN ONE DUBAI: Request brochure");
    expect(brochure.body).toContain("Location: Downtown Jebel Ali, Dubai");
    fireEvent.click(screen.getByRole("link", { name: /Explore Residences/ }));
    expect(window.location.hash).toBe("#downtown-one/highlights");
  });

  it("translates both pages completely in every language", () => {
    const shape = (value) => (Array.isArray(value) ? value.map(shape) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : typeof value);
    const english = shape(DUBAI_PROJECTS_COPY.en);
    ["de", "pl", "sl", "ru"].forEach((locale) => {
      expect(shape(DUBAI_PROJECTS_COPY[locale])).toEqual(english);
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
