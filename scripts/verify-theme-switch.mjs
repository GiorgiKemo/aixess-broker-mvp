// Clicks the real theme switcher (day -> afternoon -> night -> day) on every page and checks that the
// photos on screen change with it, that none is broken, and that the page throws no errors.
// Kemo, 19 November 2026: "do testing before you tell me that its done". Run against a build:
//   npm run build && npx vite preview --port 5180 &   AIXESS_URL=http://127.0.0.1:5180/ node scripts/verify-theme-switch.mjs
import { chromium } from "playwright";

const base = process.env.AIXESS_URL || "http://127.0.0.1:5180/";
// Galleries of interiors and amenities (Reverance, Tresora, Downtown One) are official renders and stay as they are.
const routes = (process.env.QA_ROUTES || "home,why-aixess,broker-access,residences,tresora,downtown-one").split(",");
const browser = await chromium.launch();
const page = await (await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } })).newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));
await page.goto(base);
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("aixess-language", "en");
  localStorage.setItem("aixess.privacy.v1", JSON.stringify({ value: "rejected", expires: Date.now() + 86400000 }));
});
// A visitor scrolls: bring every themed photo into view (lazy ones load only then), then read it.
const photos = async () => {
  const count = await page.locator("img[data-theme-photo]").count();
  const found = [];
  for (let index = 0; index < count; index += 1) {
    const img = page.locator("img[data-theme-photo]").nth(index);
    if (!(await img.isVisible())) continue;
    await img.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    found.push(await img.evaluate((node) => ({ id: node.dataset.themePhoto.replace(/-(day|afternoon|night)$/, ""), file: node.currentSrc.split("/").pop(), ok: node.complete && node.naturalWidth > 0, wide: node.getBoundingClientRect().width > 150 })));
  }
  await page.evaluate(() => scrollTo(0, 0));
  return found.filter((photo) => photo.wide);
};

for (const route of routes) {
  await page.goto(`${base}?theme-switch=${route}#${route}`);
  await page.reload();
  await page.locator("h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const seen = {};
  for (const mode of ["day", "afternoon", "night", "day"]) {
    // Open the menu as a mouse user does: move onto the icon and click it. The menu must be open
    // afterwards (hovering opens it, and the click once closed it again).
    const button = page.locator(".site-header .time-theme-menu__button").first();
    const option = page.locator(`.time-theme-menu__option[data-kind="${mode}"]`).first();
    await page.mouse.move(5, 5);
    await button.hover();
    await page.waitForTimeout(120);
    await button.click();
    await page.waitForTimeout(250);
    if (!(await option.isVisible())) {
      failures.push(`${route}: hover then click on the theme icon left the menu closed`);
      await button.click();
    }
    await option.click();
    await page.waitForTimeout(1800);
    const theme = await page.evaluate(() => document.documentElement.dataset.timeTheme);
    if (theme !== mode) failures.push(`${route}: asked for ${mode}, page is ${theme}`);
    for (const photo of await photos()) {
      if (!photo.ok) failures.push(`${route}: ${photo.id} is broken in ${mode} (${photo.file})`);
      (seen[photo.id] ??= {})[mode] = photo.file;
    }
  }
  const ids = Object.keys(seen);
  if (!ids.length) failures.push(`${route}: no themed photo on screen`);
  for (const id of ids) {
    const files = seen[id];
    if (new Set([files.day, files.afternoon, files.night]).size < 3) failures.push(`${route}: ${id} does not change with the theme (${JSON.stringify(files)})`);
  }
  console.log(`${route}: ${ids.map((id) => `${id} ✓`).join("  ") || "nothing"}`);
}
await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Theme switcher: every themed photo changes day / afternoon / night on every page.");
