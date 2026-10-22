import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_KEY, consentChoice, setConsent, track, flushAnalytics } from "./analytics.js";

describe("consent-first analytics", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.location.hash = "home"; vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true })); setConsent("rejected"); });
  afterEach(() => { setConsent("rejected"); vi.unstubAllGlobals(); });
  it("never sends activity or creates a session before consent", () => { track("page_view"); flushAnalytics(); expect(fetch).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(0); });
  it("sends a random session only after opt-in", () => { setConsent("accepted"); track("page_view"); flushAnalytics(); expect(fetch).toHaveBeenCalledOnce(); const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body.consent).toBe(true); expect(body.events[0].type).toBe("page_view"); expect(body.events[0].session).toHaveLength(36); });
  it("withdrawal discards queued events and clears the session", () => { setConsent("accepted"); track("page_view"); setConsent("rejected"); flushAnalytics(); expect(fetch).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(0); });
  it("expired consent requires a new choice", () => { localStorage.setItem(CONSENT_KEY, JSON.stringify({ value: "accepted", expires: 1 })); expect(consentChoice()).toBeNull(); track("page_view"); flushAnalytics(); expect(fetch).not.toHaveBeenCalled(); });
  it("excludes admin activity", () => { setConsent("accepted"); window.location.hash = "admin"; track("page_view"); flushAnalytics(); expect(fetch).not.toHaveBeenCalled(); });
  it("excludes private admin setup links from analytics", () => { setConsent("accepted"); window.location.hash = "admin?setup=private-test-key"; track("page_view"); flushAnalytics(); expect(fetch).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(0); });
  it("reports a section address as its page", () => { setConsent("accepted"); window.location.hash = "tresora/spaces"; track("page_view"); flushAnalytics(); expect(JSON.parse(fetch.mock.calls[0][1].body).events[0].page).toBe("tresora"); });
});
