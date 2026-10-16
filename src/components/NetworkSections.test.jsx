import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../i18n.jsx";
import { NetworkSections, PurchaseBenefit } from "./NetworkSections";

describe("Project Reverance overview", () => {
  it("shows AIXCO's current-project facts instead of the public Golden Premium price grid", () => {
    render(<NetworkSections sections={["opportunity"]} />);

    expect(screen.queryByText(/GOLDEN PREMIUM APARTMENTS/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View apartment/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/REFERENCE LIST PRICE/i)).not.toBeInTheDocument();

    const facts = screen.getByRole("heading", { name: "PROJECT FACTS" }).closest(".project-facts");
    for (const text of ["From €5,000", "100% foreign ownership", "Bank financing min. 60%", "Approx. 12% net", "July 2028"]) {
      expect(within(facts).getByText(text)).toBeInTheDocument();
    }
    expect(within(facts).getByText(/not the purchase price/)).toBeInTheDocument();
    expect(within(facts).getByText(/not a guaranteed return/)).toBeInTheDocument();
    // Entry price and building count are shown once, in the stats above (Kemo, 16 October 2026: no repeated text).
    expect(within(facts).queryByText("From €45,000")).not.toBeInTheDocument();
  });
});

describe("Purchase benefit", () => {
  it("repeats Klem's text and tiers word for word", () => {
    render(<LanguageProvider><PurchaseBenefit /></LanguageProvider>);
    expect(screen.getByText("EXCLUSIVE PURCHASE BENEFIT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "More Upfront. More Value." })).toBeInTheDocument();
    expect(screen.getByText("Increase your initial down payment and unlock exclusive savings on your property purchase.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent.replace(/\s+/g, " ").trim())).toEqual([
      "20%DOWN PAYMENT→1%DISCOUNT",
      "30%DOWN PAYMENT→2%DISCOUNT",
      "40%DOWN PAYMENT→3%DISCOUNT",
    ]);
    expect(screen.getByText("Secure More. Save More.")).toBeInTheDocument();
  });
});
