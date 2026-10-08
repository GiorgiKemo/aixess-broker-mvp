import { useEffect, useSyncExternalStore } from "react";

/* Time-of-day colour theme, copied from AIXCO.Global v4 (src/components/v4/TimeTheme.tsx and
   time-theme-boot.ts; Kemo, 8 October 2026). Day 06–14h cobalt, afternoon 14–19h sage,
   night 19–06h graphite, by the visitor's local time. index.html sets data-time-theme before
   paint with the same rules; keep the two in sync. */

export const TIME_THEME_STORAGE_KEY = "aixess-time-theme";
export const TIME_THEMES = ["day", "afternoon", "night"];

export function themeForHour(hour) {
  if (hour >= 6 && hour < 14) return "day";
  if (hour >= 14 && hour < 19) return "afternoon";
  return "night";
}

const listeners = new Set();
let state = null;

function readMode() {
  try {
    const stored = window.localStorage.getItem(TIME_THEME_STORAGE_KEY);
    if (TIME_THEMES.includes(stored)) return stored;
  } catch {
    // Storage can be unavailable; fall back to automatic.
  }
  return "auto";
}

const resolve = (mode) => (mode === "auto" ? themeForHour(new Date().getHours()) : mode);

function getState() {
  if (!state) {
    const mode = readMode();
    state = { mode, theme: resolve(mode) };
  }
  return state;
}

function applyTheme(mode, animate) {
  const root = document.documentElement;
  const theme = resolve(mode);
  const current = getState();
  if (current.mode !== mode || current.theme !== theme) {
    state = { mode, theme };
    listeners.forEach((listener) => listener());
  }
  if (root.dataset.timeTheme === theme && root.dataset.timeThemeMode === mode) return;

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (animate && !reduce && root.dataset.timeTheme !== theme) {
    root.classList.add("time-theme-animating");
    window.setTimeout(() => root.classList.remove("time-theme-animating"), 1000);
  }
  root.dataset.timeTheme = theme;
  root.dataset.timeThemeMode = mode;
}

export function setTimeThemeMode(mode) {
  try {
    if (mode === "auto") window.localStorage.removeItem(TIME_THEME_STORAGE_KEY);
    else window.localStorage.setItem(TIME_THEME_STORAGE_KEY, mode);
  } catch {
    // The choice still applies for this page view.
  }
  applyTheme(mode, true);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTimeTheme() {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Keeps "auto" in step with the clock while the page stays open. */
export function useAutoClock(mode) {
  useEffect(() => {
    const actual = getState().mode;
    applyTheme(actual, false);
    if (actual !== "auto") return undefined;

    const tick = () => applyTheme("auto", true);
    const interval = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);
}

/** Test hook: forget the cached state so the next read starts from storage again. */
export function resetTimeThemeForTests() {
  state = null;
}
