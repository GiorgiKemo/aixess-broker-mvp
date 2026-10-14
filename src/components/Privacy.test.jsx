import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { LanguageProvider } from "../i18n.jsx";
import { consentChoice } from "../analytics.js";
import { PrivacyControls } from "./Privacy.jsx";
const styles = readFileSync("src/components/privacy.css", "utf8");

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
function mount() { return render(<LanguageProvider><style>{styles}</style><PrivacyControls page="home" /></LanguageProvider>); }

it("centers the notice along the bottom and keeps short-screen overflow accessible", () => {
  mount();
  const style = getComputedStyle(screen.getByRole("region", { name: "Your privacy, your choice." }));
  expect(style.position).toBe("fixed");
  expect(styles).toMatch(/\.cookie-notice\s*\{[^}]*bottom:\s*max\(16px/);
  expect(style.left).toBe("50%");
  expect(style.transform).toBe("translateX(-50%)");
  expect(style.maxHeight).toBe("calc(100dvh - 32px)");
  expect(style.overflow).toBe("auto");
});

it.each([["Reject analytics", "rejected"], ["Accept analytics", "accepted"]])("preserves %s and reopening settings", (button, choice) => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: button }));
  expect(consentChoice()).toBe(choice);
  expect(screen.queryByRole("region", { name: "Your privacy, your choice." })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
  expect(screen.getByRole("region", { name: "Your privacy, your choice." })).toBeVisible();
});

it("ends the page with AIXCO's contact details and the legal links", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Reject analytics" }));
  const footer = screen.getByRole("contentinfo");
  expect(footer).toHaveAttribute("id", "contact");
  expect(screen.getByRole("heading", { name: /TALK TO/ })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /info@aixco\.global|WRITE TO US/ }).map((link) => link.getAttribute("href"))).toEqual(["mailto:info@aixco.global", "mailto:info@aixco.global"]);
  expect(footer.textContent).toContain("Grüngasse 16");
  expect(footer.textContent).toContain("1050 Wien, Austria");
  expect(footer.textContent).not.toMatch(/\+\d|tel:/);
  const legal = screen.getByRole("navigation", { name: "Site info" });
  expect(legal).toContainElement(screen.getByRole("link", { name: "Privacy & cookies" }));
  expect(legal).toContainElement(screen.getByRole("link", { name: "Admin" }));
});

it("has no footer on the admin dashboard", () => {
  render(<LanguageProvider><PrivacyControls page="admin" /></LanguageProvider>);
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
});
