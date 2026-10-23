// Figures, schedules and media for TRESORA and DOWNTOWN ONE from the developers' source packet (Kemo,
// 23 October 2026). Language-free: the words are in dubai-projects-copy.js and
// dubai-projects-sources-copy.js. AED is the developers' source currency and is kept exactly as
// supplied; US dollars are derived from it at the UAE dirham's fixed peg (AED 3.6725 = US$1), never
// relabelled. Nothing here is a live availability feed.
import MEDIA from "./data/dubai-media.json";

export const AED_PER_USD = 3.6725;
export const usdFromAed = (aed) => Math.round(aed / AED_PER_USD);

// TRESORA by WADAN: lowest price per category on the developer's inventory (TRESORA-JVC.pdf p2,
// modified 12 October 2026: 21 residential and 4 office rows). Every 50/50 PHPP price is 107% of
// its 40/60 price and every upfront price 85% (the 15% discount is for 100% upfront only). Offices
// have no PHPP price. Total areas in sq ft, as listed.
export const TRESORA_PRICES = [
  { key: "studio", sizes: [454.03, 461.99], plan4060: 763168, phpp: 816589.76, upfront: 648692.8 },
  { key: "smartStudio", sizes: [458.98, 465.86], plan4060: 789598, phpp: 844869.86, upfront: 671158.3 },
  { key: "twoBedroom", sizes: [1295.22, 1404.36], plan4060: 1673010, phpp: 1790120.7, upfront: 1422058.5 },
  { key: "penthouse", sizes: [2132.22], plan4060: 2275194, phpp: 2434457.58, upfront: 1933914.9 },
  { key: "office", sizes: [1228.16, 1885.73], plan4060: 2333504, phpp: null, upfront: 1983478.4 },
];
// The page's "from" price: the lowest listed studio on the 40/60 plan.
export const TRESORA_FROM_AED = TRESORA_PRICES[0].plan4060;

// Standalone payment plan (Tresora_Payment Plan.pdf, August 2026), which the inventory's price
// columns follow. The older fact-sheet options (50/50 completion, 70/30) are superseded and not shown.
// [when, percent]: when is "booking", "completion", an ISO date (40/60 gives days) or an ISO month.
export const TRESORA_PLAN_4060 = [["booking", 20], ["2026-12-15", 5], ["2027-03-15", 5], ["2027-06-15", 5], ["2027-09-15", 5], ["completion", 60]];
// 50/50 post-handover plan: months only. March 2028 is the completion instalment (completion Q1 2028).
export const TRESORA_PLAN_PHPP = {
  down: 20,
  toCompletion: [["2026-12", 5], ["2027-03", 5], ["2027-06", 5], ["2027-09", 5], ["2027-12", 5], ["2028-03", 5, "completion"]],
  afterCompletion: [["2028-06", 5], ["2028-09", 5], ["2028-12", 5], ["2029-03", 5], ["2029-06", 5], ["2029-09", 5], ["2029-12", 5], ["2030-03", 5], ["2030-06", 2.5], ["2030-09", 2.5], ["2030-12", 2.5], ["2031-03", 2.5]],
};

// SAMANA Downtown One: launch unit mix and starting prices from Kemo's 23 October launch message
// (not printed in the PDFs), and the factbook's two payment plans (Factbook p4).
export const DOWNTOWN_MIX = [
  { key: "studio", units: 49, fromAed: 689000 },
  { key: "oneBedroom", units: 160, fromAed: 1039000 },
  { key: "twoBedroom", units: 36, fromAed: 1429000 },
];
export const DOWNTOWN_TOTAL_UNITS = DOWNTOWN_MIX.reduce((sum, row) => sum + row.units, 0);
// The 5% milestones in months 6 and 12 are paid on top of that month's 1% instalment: 10 + 5 + 5 + 80 = 100.
export const DOWNTOWN_PLANS = [
  { key: "pdc", down: 10, month6: 5, month12: 5, monthly: 1, months: 80 },
  { key: "nonPdc", down: 15, month6: 5, month12: 5, monthly: 1, months: 75 },
];
export const DOWNTOWN_MAPS_URL = "https://maps.app.goo.gl/5EizrKqnmAapLtEh7";

// Brochure pages 31-40: ten layout types, grouped for the filter.
export const DOWNTOWN_LAYOUTS = [
  [31, "studio"], [32, "studio"],
  [33, "oneBedroom"], [34, "oneBedroom"], [35, "oneBedroom"], [36, "oneBedroom"], [37, "oneBedroom"], [38, "oneBedroom"],
  [39, "twoBedroom"], [40, "twoBedroom"],
];
// Floor Plan PDF pages 2-9: the building's floor plates.
export const TRESORA_FLOORS = [2, 3, 4, 5, 6, 7, 8, 9];

export const DUBAI_DOCS = {
  tresoraFloorPlans: "/assets/dubai/docs/tresora-by-wadan-floor-plans.pdf",
  tresoraPaymentPlan: "/assets/dubai/docs/tresora-by-wadan-payment-plan.pdf",
  downtownBrochure: "/assets/dubai/docs/samana-downtown-one-brochure.pdf",
  downtownFactbook: "/assets/dubai/docs/samana-downtown-one-factbook.pdf",
};

export function docBytes(href) {
  return MEDIA[`doc:${href.split("/").pop()}`]?.bytes ?? 0;
}

// Responsive sources for a built image: src is the second-smallest width, full the largest.
export function dubaiImage(slug) {
  const meta = MEDIA[slug];
  if (!meta) throw new Error(`Unknown Dubai image: ${slug}`);
  const url = (width) => `/assets/dubai/${slug}-${width}.webp`;
  return {
    src: url(meta.widths[Math.min(1, meta.widths.length - 1)]),
    srcSet: meta.widths.map((width) => `${url(width)} ${width}w`).join(", "),
    full: url(meta.widths[meta.widths.length - 1]),
    width: meta.width,
    height: meta.height,
  };
}
