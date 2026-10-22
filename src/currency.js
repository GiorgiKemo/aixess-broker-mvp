// Property amounts are set in US dollars, the official contract currency (Kemo, 20 October 2026).
// English, Polish and Russian show USD; German and Slovenian show euros converted from USD at one
// fixed rate, so updating the rate here updates every page.
// ECB euro reference rate of 19 October 2026: 1 EUR = 1.1225 USD.
export const USD_PER_EUR = 1.1225;
const EUR_LOCALES = new Set(["de", "sl"]);

export const priceCurrency = (locale) => (EUR_LOCALES.has(locale) ? "EUR" : "USD");

// Converted euros are rounded to clean figures: whole hundreds from 1,000, whole euros below.
const toEur = (usd) => {
  const eur = usd / USD_PER_EUR;
  return eur >= 1000 ? Math.round(eur / 100) * 100 : Math.round(eur);
};

const localAmount = (usd, locale) => (priceCurrency(locale) === "EUR" ? toEur(usd) : usd);

// style: "full" ($59,000 / 52.600 €), "k" ($59K / €53K), "compact" ($4.2B / 3,7 Mrd. €).
export function formatPrice(usd, locale, style = "full") {
  const currency = priceCurrency(locale);
  const amount = localAmount(usd, locale);
  if (style === "k") {
    const symbol = currency === "EUR" ? "€" : "$";
    // One decimal below 10K ($5.9K), whole thousands above, so the homepage tiles stay as narrow as €45K was.
    return `${symbol}${new Intl.NumberFormat(locale, { maximumFractionDigits: amount < 10000 ? 1 : 0 }).format(amount / 1000)}K`;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: style === "compact" ? 1 : 0,
    ...(style === "compact" ? { notation: "compact" } : {}),
  }).format(amount);
}

// A price supplied in euros (the Golden Premium workbook): kept as is where euros are shown,
// converted to whole hundreds of dollars elsewhere.
export function formatEurSourcePrice(eur, locale) {
  if (priceCurrency(locale) === "EUR") return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(eur);
  return formatPrice(Math.round((eur * USD_PER_EUR) / 100) * 100, locale);
}

// Copy strings write amounts as {{usd:59000}}, {{usd:59000:k}} or {{usd:4200000000:compact}},
// and the conversion rate as {{rate}}.
const TOKEN = /\{\{usd:([\d.e+]+)(?::(k|compact))?\}\}/g;
export const localizePrices = (text, locale) => text
  .replace(TOKEN, (_, usd, style) => formatPrice(Number(usd), locale, style || "full"))
  .replace(/\{\{rate\}\}/g, () => new Intl.NumberFormat(locale, { minimumFractionDigits: 4 }).format(USD_PER_EUR));

// Applies localizePrices to every string of a { en, de, pl, sl, ru } copy object.
export function withPrices(copy) {
  const walk = (value, locale) => {
    if (typeof value === "string") return localizePrices(value, locale);
    if (Array.isArray(value)) return value.map((item) => walk(item, locale));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item, locale)]));
    return value;
  };
  return Object.fromEntries(Object.entries(copy).map(([locale, value]) => [locale, walk(value, locale)]));
}

// A project priced only in US dollars in every language (TRESORA's brief: "All prices are displayed in
// US Dollars (USD)"), so German and Slovenian keep dollars here instead of converting to euros.
export function formatUsdOnly(usd, locale) {
  const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(usd);
  return locale === "en" ? `US$${amount}` : `${amount} USD`;
}
