// Renders the PNG images the AiXESS emails use (email clients don't show inline SVG):
// the white wordmark and the button arrow, at 3x for sharp phone screens.
// Run: node scripts/build-email-assets.mjs
import { chromium } from "playwright";
import { AIXESS_WORDMARK } from "../src/brand/aixess-wordmark.js";

const { width, height, paths } = AIXESS_WORDMARK;
const logo = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="${fill}" style="overflow:visible">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
// LashaArrow at length 38: a hairline with a small chevron.
const arrow = (stroke) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 8" width="38" height="8" fill="none" stroke="${stroke}" stroke-width="1"><path d="M0 4H37.4"/><path d="M34.2 0.8L37.4 4L34.2 7.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const jobs = [
  { file: "aixess-logo-white.png", svg: logo("#ffffff"), w: 120 },
  { file: "arrow-white.png", svg: arrow("#ffffff"), w: 38 },
];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const job of jobs) {
  const ratio = job.svg.includes("viewBox=\"0 0 38") ? 8 / 38 : height / width;
  const h = Math.round(job.w * ratio);
  const page = await browser.newPage({ viewport: { width: job.w, height: h }, deviceScaleFactor: 3 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${job.svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${job.w}" height="${h}"`)}</body></html>`);
  await page.screenshot({ path: `public/email/${job.file}`, omitBackground: true, clip: { x: 0, y: 0, width: job.w, height: h } });
  await page.close();
  console.log(job.file, job.w, h);
}
await browser.close();
