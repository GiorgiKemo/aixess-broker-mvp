import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeThemeMenu } from "./components/TimeThemeMenu.jsx";
import { TIME_THEME_STORAGE_KEY, resetTimeThemeForTests, themeForHour } from "./timeTheme.js";

const root = document.documentElement;

describe("time-of-day theme (AIXCO.Global v4)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete root.dataset.timeTheme;
    delete root.dataset.timeThemeMode;
    resetTimeThemeForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps the visitor's hour to v4's day, afternoon and night windows", () => {
    expect([5, 6, 13, 14, 18, 19, 23, 0].map(themeForHour)).toEqual([
      "night", "day", "day", "afternoon", "afternoon", "night", "night", "night",
    ]);
  });

  it("uses the same rules and storage key in the pre-paint script", () => {
    const html = readFileSync("index.html", "utf8");
    const script = html.match(/<script>(\(function\(\)\{var m="auto".*?)<\/script>/)?.[1];
    expect(script).toContain(`localStorage.getItem("${TIME_THEME_STORAGE_KEY}")`);
    for (const hour of [0, 5, 6, 13, 14, 18, 19, 23]) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 8, hour, 30));
      delete root.dataset.timeTheme;
      new Function(script)();
      expect(root.dataset.timeTheme, `${hour}h`).toBe(themeForHour(hour));
      expect(root.dataset.timeThemeMode).toBe("auto");
      vi.useRealTimers();
    }
  });

  it("follows the clock in auto mode and remembers a chosen theme", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 8, 15, 0));
    render(<TimeThemeMenu />);
    expect(root.dataset.timeTheme).toBe("afternoon");
    expect(root.dataset.timeThemeMode).toBe("auto");

    fireEvent.click(screen.getByRole("button", { name: "Colour theme: Auto" }));
    act(() => {
      fireEvent.click(screen.getByRole("radio", { name: /Night/ }));
    });
    expect(root.dataset.timeTheme).toBe("night");
    expect(root.dataset.timeThemeMode).toBe("night");
    expect(window.localStorage.getItem(TIME_THEME_STORAGE_KEY)).toBe("night");

    fireEvent.click(screen.getByRole("button", { name: "Colour theme: Night" }));
    act(() => {
      fireEvent.click(screen.getByRole("radio", { name: /Automatic by time of day/ }));
    });
    expect(root.dataset.timeTheme).toBe("afternoon");
    expect(window.localStorage.getItem(TIME_THEME_STORAGE_KEY)).toBeNull();
  });
});
