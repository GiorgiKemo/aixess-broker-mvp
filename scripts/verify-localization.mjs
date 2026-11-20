import { chromium, webkit } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.AIXESS_URL || "http://127.0.0.1:5180/";
const output = process.env.QA_OUTPUT || "output/playwright/localization";
await mkdir(output, { recursive: true });
const locales = (process.env.QA_LOCALES || "en,de,pl,sl,ru").split(",");
const sizes = process.env.QA_SIZES
  ? process.env.QA_SIZES.split(",").map((size) => size.split("x").map(Number))
  : [[320, 740], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080], [844, 390]];
const routes = (process.env.QA_ROUTES || "home,why-aixess,broker-access,insights,broker-tools,residences").split(",");
const browser = await (process.env.QA_BROWSER === "webkit" ? webkit : chromium).launch({ headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => { errors.push(error.message); console.error("PAGE ERROR:", error.stack); });
const results = [];

function inspectLayout() {
  const issues = [];
  const viewport = { width: innerWidth, height: innerHeight };
  const visible = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    && !el.closest('[aria-hidden="true"], [inert], .project-ticker');
  const describe = (el) => `${el.tagName.toLowerCase()}.${String(el.className).replaceAll(" ", ".")}`;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.textContent.trim() || !visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.bottom < 0 || rect.top > viewport.height || !rect.width) continue;
      let clipped = rect.left < -1.5 || rect.right > viewport.width + 1.5;
      let ancestor = el;
      while (ancestor && !clipped) {
        const style = getComputedStyle(ancestor);
        if (/hidden|clip/.test(style.overflowX)) {
          const box = ancestor.getBoundingClientRect();
          clipped = rect.left < box.left - 1.5 || rect.right > box.right + 1.5;
        }
        ancestor = ancestor.parentElement;
      }
      if (clipped) {
        issues.push({ type: "clipped-text", element: describe(el), text: node.textContent.trim(), left: rect.left, right: rect.right });
        break;
      }
    }
  }
  for (const heading of document.querySelectorAll("[data-fitted-heading]")) {
    if (!visible(heading)) continue;
    const box = heading.getBoundingClientRect();
    for (const line of heading.children) {
      if (line.getBoundingClientRect().right > box.right + 1) issues.push({ type: "headline-overflow", text: line.textContent });
    }
  }
  const headerParts = [...document.querySelectorAll(".site-header > .brand, .site-header > .desktop-nav, .site-header > .header-actions")].filter(visible);
  for (let i = 1; i < headerParts.length; i++) {
    if (headerParts[i - 1].getBoundingClientRect().right > headerParts[i].getBoundingClientRect().left + 1) issues.push({ type: "header-overlap" });
  }
  return { lang: document.documentElement.lang, ...viewport, issues };
}

try {
  await page.goto(base);
  for (const locale of locales) {
    await page.evaluate((language) => {
      localStorage.setItem("aixess-language", language);
      localStorage.setItem("aixess.privacy.v1", JSON.stringify({ value: "rejected", expires: Date.now() + 86400000 }));
    }, locale);
    await page.reload();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      for (const route of routes) {
        await page.goto(`${base}?layout-qa=${locale}-${width}-${route}#${route}`);
        await page.locator("h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);
        const result = await page.evaluate(inspectLayout);
        if (result.lang !== locale) throw new Error(`Expected ${locale}, got ${result.lang}`);
        results.push({ locale, route, ...result });
        // Scan the rest of each route too; clipping is often below the headline.
        const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = height; y < scrollHeight; y += Math.max(height - 100, 200)) {
          await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
          await page.waitForTimeout(35);
          const scan = await page.evaluate(inspectLayout);
          results.push({ locale, route, scrollY: y, ...scan });
        }
        // The Residence Explorer lives on the Reverance page only (21 October 2026).
        if (route === "residences") {
          await page.locator(".residence-filter-controls").waitFor({ state: "attached" });
        }
        if (route === "residences") {
          await page.locator('.residence-filter-controls select option:not([value="all"])').first().waitFor({ state: "attached", timeout: 120000 });
        }
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: `${output}/${locale}-${width}x${height}-${route}.png`, fullPage: route !== "home" && route !== "residences" });
        if (process.env.QA_INTERACTIONS === "1" && route === "insights") {
          await page.locator(".page-cta-row button").click();
          await page.locator(".modal-panel").waitFor();
          results.push({ locale, route, state: "materials-form", ...await page.evaluate(inspectLayout) });
          await page.screenshot({ path: `${output}/${locale}-${width}x${height}-materials-form.png` });
          await page.locator(".modal-submit").scrollIntoViewIfNeeded();
          results.push({ locale, route, state: "materials-submit", ...await page.evaluate(inspectLayout) });
          await page.locator(".modal-close").click();
          for (const question of await page.locator(".faq-list summary").all()) await question.click();
          await page.locator(".faq-list").scrollIntoViewIfNeeded();
          results.push({ locale, route, state: "faq-expanded", ...await page.evaluate(inspectLayout) });
        }
        if (process.env.QA_INTERACTIONS === "1" && route === "residences") {
          const capture = async (state) => {
            await page.waitForTimeout(120);
            results.push({ locale, route, state, ...await page.evaluate(inspectLayout) });
            await page.screenshot({ path: `${output}/${locale}-${width}x${height}-${state}.png` });
          };
          const menu = page.locator(".menu-toggle");
          if (await menu.isVisible()) {
            await menu.click();
            await page.locator(".mobile-nav .language-switcher-trigger").click();
            await capture("language-menu");
            await menu.click();
          }
          await page.locator(".residence-explorer").waitFor();
          await page.evaluate(() => {
            const section = document.querySelector(".residence-explorer");
            scrollTo({ top: section.offsetTop + (section.offsetHeight - innerHeight) * 0.99, behavior: "instant" });
          });
          await page.locator('.building-map[data-load-state="ready"]').waitFor({ timeout: 120000 });
          await capture("explorer");
          const dock = page.locator(".mobile-residence-dock");
          if (await dock.isVisible()) {
            await dock.click();
            await page.locator(".mobile-sheet-tools button").click();
            await capture("mobile-filters");
            await page.locator(".mobile-drawer-close").click();
          }
          await page.locator('.model-floor-rail button[data-floor="11"]').click();
          await page.locator(".floor-modal").waitFor();
          await capture("floor-plan");
          await page.locator(".floor-navigation-trigger").click();
          await capture("floor-menu");
          await page.keyboard.press("Escape");
          await page.locator('.unit-hotspot[aria-label*="1111"]').click();
          await page.locator(".unit-detail").waitFor();
          await page.locator(".unit-preview-button").scrollIntoViewIfNeeded();
          await capture("unit-detail");
          await page.locator(".unit-preview-button").click();
          await capture("plan-lightbox");
          await page.locator(".floor-plan-lightbox-close").click();
          await page.locator(".floor-modal-close").click();
        }
        console.log(`${locale} ${width}x${height} ${route}: ${results.filter((r) => r.locale === locale && r.width === width && r.height === height && r.route === route).reduce((sum, r) => sum + r.issues.length, 0)} issues`);
      }
    }
  }
} finally {
  await writeFile(`${output}/partial-report.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}

const source = await readFile("src/i18n.jsx", "utf8");
const catalogSource = source.slice(source.indexOf("const ENGLISH"), source.indexOf("const LanguageContext"));
const catalogs = new Function(`${catalogSource.replaceAll("...ENGLISH,", "")} return { ENGLISH, TRANSLATIONS };`)();
const missing = Object.fromEntries(locales.filter((l) => l !== "en").map((locale) => [locale, Object.keys(catalogs.ENGLISH).filter((key) => !(key in catalogs.TRANSLATIONS[locale]))]));
const failures = results.filter((result) => result.issues.length);
await writeFile(`${output}/report.json`, JSON.stringify({ results, errors, missing }, null, 2));
console.log(JSON.stringify({ screens: results.length, failures: failures.length, errors: [...new Set(errors)], missing }, null, 2));
process.exitCode = failures.length || errors.length || Object.values(missing).some((keys) => keys.length) ? 1 : 0;
