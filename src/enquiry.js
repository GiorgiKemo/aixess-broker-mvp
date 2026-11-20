// Site forms that answer by email: a project request (Request availability, Request project details …)
// or the footer's Write to us. Any component can open the form; App shows it in the access dialog.
export const OPEN_FORM_EVENT = "aixess:open-form";

export function openSiteForm(detail) {
  window.dispatchEvent(new CustomEvent(OPEN_FORM_EVENT, { detail }));
}

// A click that should open the form instead of following the link's mailto fallback.
export function siteFormClick(detail) {
  return (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openSiteForm(typeof detail === "function" ? detail() : detail);
  };
}
