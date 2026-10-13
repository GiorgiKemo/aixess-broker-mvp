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

  it("crosses every automatic boundary on its own, including midnight, and re-checks when the tab returns", () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date(2026, 9, 8, 13, 59, 30));
    render(<TimeThemeMenu />);
    expect(root.dataset.timeTheme).toBe("day");
    act(() => vi.advanceTimersByTime(60_000));
    expect(root.dataset.timeTheme).toBe("afternoon");

    vi.setSystemTime(new Date(2026, 9, 8, 18, 59, 30));
    act(() => vi.advanceTimersByTime(60_000));
    expect(root.dataset.timeTheme).toBe("night");

    // Midnight rollover stays night; 06:00 the next morning turns day.
    vi.setSystemTime(new Date(2026, 9, 8, 23, 59, 30));
    act(() => vi.advanceTimersByTime(60_000));
    expect(root.dataset.timeTheme).toBe("night");
    vi.setSystemTime(new Date(2026, 9, 9, 5, 59, 30));
    act(() => vi.advanceTimersByTime(60_000));
    expect(root.dataset.timeTheme).toBe("day");

    // A tab left in the background catches up as soon as it is visible again.
    vi.setSystemTime(new Date(2026, 9, 9, 16, 0));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(root.dataset.timeTheme).toBe("afternoon");
  });

  it("keeps a manual choice through time boundaries and reloads, and Auto picks the clock up again", () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date(2026, 9, 8, 13, 59, 30));
    const { unmount } = render(<TimeThemeMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Colour theme: Auto" }));
    act(() => {
      fireEvent.click(screen.getByRole("radio", { name: /Night/ }));
    });
    act(() => vi.advanceTimersByTime(60_000));
    vi.setSystemTime(new Date(2026, 9, 9, 6, 30));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(root.dataset.timeTheme).toBe("night");

    // A reload starts from storage: still night, still manual.
    unmount();
    resetTimeThemeForTests();
    delete root.dataset.timeTheme;
    render(<TimeThemeMenu />);
    expect(root.dataset.timeTheme).toBe("night");
    expect(root.dataset.timeThemeMode).toBe("night");

    fireEvent.click(screen.getByRole("button", { name: "Colour theme: Night" }));
    act(() => {
      fireEvent.click(screen.getByRole("radio", { name: /Automatic by time of day/ }));
    });
    expect(root.dataset.timeTheme).toBe("day");
    expect(root.dataset.timeThemeMode).toBe("auto");
  });
});
