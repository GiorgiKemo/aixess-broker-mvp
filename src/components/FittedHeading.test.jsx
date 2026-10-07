import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider, useLanguage } from "../i18n.jsx";
import { FittedHeading } from "./FittedHeading.jsx";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.removeItem("aixess-language");
});

function TranslatedHeading() {
  const { locale, setLocale } = useLanguage();
  return <>
    <FittedHeading as="h1"><span>{locale === "de" ? "A much longer heading" : "Short"}</span></FittedHeading>
    <button onClick={() => setLocale("de")}>Deutsch</button>
  </>;
}

describe("translated heading sizing", () => {
  it("fits the actual text and restores the designed size when more space is available", () => {
    let width = 102;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      return { width: this.textContent.length * Number.parseFloat(this.parentElement.style.fontSize || "100") / 10 };
    });
    window.localStorage.setItem("aixess-language", "en");
    render(<LanguageProvider><style>{"h1 { font-size: 100px; }"}</style><TranslatedHeading /></LanguageProvider>);
    const heading = screen.getByRole("heading");
    expect(heading.style.fontSize).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Deutsch" }));
    expect(Number.parseFloat(heading.style.fontSize)).toBeCloseTo(47.61);

    width = 400;
    fireEvent.resize(window);
    expect(heading.style.fontSize).toBe("");

    width = 102;
    fireEvent.resize(window);
    expect(Number.parseFloat(heading.style.fontSize)).toBeCloseTo(47.61);
  });
});

describe("poster lines", () => {
  function renderPoster(second) {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => 502);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      return { width: this.textContent.length * Number.parseFloat(this.style.fontSize || "100") / 10 };
    });
    render(<LanguageProvider><style>{"h1 { font-size: 100px; }"}</style>
      <FittedHeading as="h1" fillLines maxLineRatio={0.64}><span>AIXESS</span><span>{second}</span></FittedHeading>
    </LanguageProvider>);
    return Array.from(screen.getByRole("heading").children, (line) => Number.parseFloat(line.style.fontSize));
  }

  it("sizes every line to the full width", () => {
    const [first, second] = renderPoster("TO MARKETS");
    expect(first).toBeCloseTo(833.33);
    expect(second).toBeCloseTo(500);
  });

  it("keeps a short later line at most maxLineRatio of the first", () => {
    const [first, second] = renderPoster("DO");
    expect(second).toBeCloseTo(first * 0.64, 1);
  });
});
