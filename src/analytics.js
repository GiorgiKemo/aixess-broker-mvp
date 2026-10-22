export const CONSENT_KEY = "aixess.privacy.v1";
const SESSION_KEY = "aixess.analytics.session.v1";
let queue = [];
let timer;
export function consentChoice() {
  try {
    const choice = JSON.parse(localStorage.getItem(CONSENT_KEY));
    return choice?.expires > Date.now() && ["accepted", "rejected"].includes(choice.value) ? choice.value : null;
  } catch { return null; }
}
export function setConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, expires: Date.now() + 180 * 86400000 })); } catch { /* Storage may be disabled. Tracking stays off. */ }
  if (value !== "accepted") { queue = []; clearTimeout(timer); try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Private browsing. */ } }
  window.dispatchEvent(new Event("aixess:consent"));
}
function sessionId() {
  try {
    let session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!session || session.expires < Date.now()) session = { id: crypto.randomUUID() };
    session.expires = Date.now() + 30 * 60000;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  } catch { return null; }
}
export function flushAnalytics() {
  clearTimeout(timer);
  if (consentChoice() !== "accepted") { queue = []; return; }
  if (!queue.length) return;
  const events = queue.splice(0, 20);
  // Delivery must never delay navigation or affect the model's render loop.
  fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent: true, events }), keepalive: true }).catch(() => {});
}
export function track(type, detail = {}) {
  if (consentChoice() !== "accepted") return;
  // "#tresora/spaces" is a section of the TRESORA page: the page is the part before the slash.
  const page = window.location.hash.slice(1).split(/[?/]/)[0].toLowerCase() || "home";
  if (["admin", "privacy"].includes(page)) return;
  const session = sessionId();
  if (!session) return;
  queue.push({ id: crypto.randomUUID(), session, type, page, locale: document.documentElement.lang || "en", device: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1100 ? "tablet" : "desktop", detail });
  if (queue.length >= 20 || type.startsWith("portal_")) flushAnalytics();
  else { clearTimeout(timer); timer = setTimeout(flushAnalytics, 1000); }
}
export function trackOutboundLink(event) {
  const anchor = event.target.closest?.("a[href]");
  if (!anchor) return;
  const url = new URL(anchor.href, window.location.href);
  if (url.hostname === "workw.com") track(url.pathname.endsWith("broker-login") ? "portal_login_click" : "portal_register_click");
  else if (["mailto:", "tel:"].includes(url.protocol)) track("contact_click", { target: url.protocol === "mailto:" ? "email" : "phone" });
  else if (url.hostname === "aixco.global") track("resource_click", { target: "aixco" });
  else if (/\.pdf$/i.test(url.pathname)) track("resource_click", { target: "brochure" });
}
