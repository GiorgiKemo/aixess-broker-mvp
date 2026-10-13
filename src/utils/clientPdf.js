import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { CALCULATORS, calculateScenario } from "./calculators.js";
import { CALCULATOR_COPY } from "../calculator-copy.js";
import { CLIENT_PDF_COPY } from "../client-pdf-copy.js";
import { NETWORK_COPY } from "../network-copy.js";
import { CALCULATOR_APARTMENTS } from "../data/calculatorApartments.js";
import { getGoldenPremiumUnit } from "../data/goldenPremiumApartments.js";
import { GOLDEN_PREMIUM_COPY } from "../golden-premium-copy.js";
import bPlans from "../data/reveranceBPlans.json";

const W = 595.28, H = 841.89, M = 44, WIDTH = W - M * 2;
const ink = rgb(.08, .08, .08), muted = rgb(.35, .35, .35), orange = rgb(.75, .3, .02);
const silver = rgb(.94, .94, .94), white = rgb(1, 1, 1);
export const PDF_FONT_FILES = ["latin", "latin-ext", "cyrillic"].flatMap(script =>
  [400, 700].map(weight => `noto-sans-${script}-${weight}-normal.ttf`));

export function formatCalculatorValue(value, kind, locale) {
  if (kind === "ratio") return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}×`;
  return new Intl.NumberFormat(locale, kind === "percent"
    ? { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

async function asset(url, json = false) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("asset");
  return json ? response.json() : response.arrayBuffer();
}

export async function loadClientPdfAssets(unit) {
  const [snapshot, logo, ...fonts] = await Promise.all([
    unit.block === "B" ? Promise.resolve(bPlans) : asset("/data/reverance-a.json", true),
    asset("/brand/aixess-logo-white.png"),
    ...PDF_FONT_FILES.map(file => asset(`/fonts/client-pdf/${file}`)),
  ]);
  const floor = snapshot.floors.find(item => item.number === unit.floor);
  const shape = floor?.shapes.find(item => item.target === unit.code.slice(1));
  if (!floor?.planImage?.startsWith("/assets/reverance-explorer/") || !shape?.points?.length) throw new Error("plan");
  const bitmap = await createImageBitmap(new Blob([await asset(floor.planImage)]));
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("plan");
    return { logo, fonts, plan: await blob.arrayBuffer(), points: shape.points };
  } finally {
    bitmap.close();
  }
}

// Only whitelisted client-facing fields enter the document. No storage or API POST.
export async function generateClientPdf({
  locale, calculatorId, values, apartmentCode, clientName = "", clientAddress = "",
}, { loadAssets = loadClientPdfAssets, now = new Date() } = {}) {
  const copy = CLIENT_PDF_COPY[locale], c = CALCULATOR_COPY[locale];
  const definition = CALCULATORS.find(item => item.id === calculatorId);
  const unit = CALCULATOR_APARTMENTS.find(item => item.code === apartmentCode);
  const goldenPremium = getGoldenPremiumUnit(apartmentCode);
  if (!copy || !definition || !unit || typeof clientName !== "string" || typeof clientAddress !== "string"
    || clientName.length > 100 || clientAddress.length > 300 || !Array.isArray(values)) throw new Error("invalid");
  const outcome = calculateScenario(calculatorId, values);
  if (outcome.error) throw new Error("invalid");
  const index = CALCULATORS.indexOf(definition);
  const title = NETWORK_COPY[locale].calculators[index][0];
  const assets = await loadAssets(unit);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`AiXESS | Reverance ${unit.code} | ${title}`);
  doc.setAuthor("AiXESS");
  doc.setCreationDate(now);
  const fonts = await Promise.all(assets.fonts.map(async (bytes, i) => ({
    pdf: await doc.embedFont(new Uint8Array(bytes), { subset: false }), source: fontkit.create(new Uint8Array(bytes)), bold: i % 2 === 1,
  })));
  const logo = await doc.embedPng(new Uint8Array(assets.logo));
  const plan = await doc.embedPng(new Uint8Array(assets.plan));
  const face = (char, bold) => {
    const font = fonts.find(item => item.bold === bold && item.source.glyphForCodePoint(char.codePointAt(0)).id !== 0);
    if (!font) throw new Error("glyph");
    return font.pdf;
  };
  const width = (text, size, bold = false) => Array.from(text).reduce((sum, char) => sum + face(char, bold).widthOfTextAtSize(char, size), 0);
  function line(page, text, x, top, size = 10, bold = false, color = ink) {
    for (const char of String(text)) {
      const font = face(char, bold);
      page.drawText(char, { x, y: H - top - size, size, font, color });
      x += font.widthOfTextAtSize(char, size);
    }
  }
  function wrap(page, text, x, top, maxWidth = WIDTH, size = 10, bold = false, color = ink) {
    const words = String(text).trim().split(/\s+/);
    let current = "";
    const lines = [];
    for (const word of words) {
      if (current && width(`${current} ${word}`, size, bold) <= maxWidth) { current += ` ${word}`; continue; }
      if (current) { lines.push(current); current = ""; }
      for (const char of word) {
        if (current && width(current + char, size, bold) > maxWidth) { lines.push(current); current = ""; }
        current += char;
      }
    }
    if (current) lines.push(current);
    lines.forEach((text, i) => line(page, text, x, top + i * size * 1.45, size, bold, color));
    return top + lines.length * size * 1.45;
  }
  function rect(page, x, top, w, h, color) { page.drawRectangle({ x, y: H - top - h, width: w, height: h, color }); }
  function header(page, number) {
    rect(page, 0, 0, W, 83, ink);
    const height = 27;
    page.drawImage(logo, { x: M, y: H - 53, width: height * logo.width / logo.height, height });
    line(page, `REVERANCE ${unit.code}`, W - 172, 35, 10, true, white);
    line(page, `AiXESS | ${unit.code}`, M, 805, 8, false, muted);
    line(page, `${number} / 2`, W - M - 25, 805, 8, false, muted);
  }
  const cover = doc.addPage([W, H]);
  header(cover, 1);
  line(cover, copy.illustrative, M, 104, 10, true, orange);
  line(cover, `Project Reverance · ${unit.code}`, M, 128, 25, true);
  line(cover, `${unit.block} · ${copy.floor} ${unit.floor} · ${new Intl.NumberFormat(locale).format(unit.area)} m²`, M, 167, 11);
  if (goldenPremium) line(cover, GOLDEN_PREMIUM_COPY[locale].badge, M, 190, 9, true, rgb(.9, .72, .22));
  let clientTop = 201;
  if (clientName.trim()) clientTop = wrap(cover, clientName, M, clientTop, WIDTH, 10, true) + 6;
  if (clientAddress.trim()) clientTop = wrap(cover, clientAddress, M, clientTop, WIDTH, 9, false, muted);
  const planTop = Math.max(318, clientTop + 18);
  wrap(cover, copy.plan, M, planTop, WIDTH, 10, true);
  const imageBox = { x: M, top: planTop + 43, width: WIDTH, height: 285 };
  const scale = Math.min(imageBox.width / plan.width, imageBox.height / plan.height);
  const pw = plan.width * scale, ph = plan.height * scale;
  const px = M + (WIDTH - pw) / 2, py = H - imageBox.top - (imageBox.height + ph) / 2;
  cover.drawImage(plan, { x: px, y: py, width: pw, height: ph });
  const polygon = assets.points.map((point, i) => `${i ? "L" : "M"} ${point.x * pw / 100} ${point.y * ph / 100}`).join(" ") + " Z";
  cover.drawSvgPath(polygon, { x: px, y: py + ph, color: orange, opacity: .4, borderColor: orange, borderWidth: 1.5 });
  wrap(cover, copy.planNote, M, imageBox.top + imageBox.height + 14, WIDTH, 8.5, false, muted);
  wrap(cover, copy.selectedNote, M, imageBox.top + imageBox.height + 54, WIDTH, 9, false, muted);
  line(cover, `${copy.prepared}: ${new Intl.DateTimeFormat(locale).format(now)}`, M, 773, 8, false, muted);

  const page = doc.addPage([W, H]);
  header(page, 2);
  let top = wrap(page, title, M, 106, WIDTH, 23, true) + 15;
  top = wrap(page, c.disclaimer, M, top, WIDTH, 9, false, muted) + 18;
  line(page, copy.assumptions, M, top, 12, true); top += 25;
  const number = value => new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(Number(value));
  for (let i = 0; i < definition.fields.length; i++) {
    const value = number(values[i]);
    const labelBottom = wrap(page, c.fields[definition.fields[i]], M, top, WIDTH - 195, 9);
    const valueSize = Math.min(11, 185 / Math.max(width(value, 1, true), 1));
    line(page, value, W - M - width(value, valueSize, true), top, valueSize, true);
    top = Math.max(top + 31, labelBottom + 10);
  }
  top += 6;
  rect(page, M, top, WIDTH, 28, ink); line(page, c.result, M + 12, top + 6, 11, true, white); top += 38;
  for (let i = 0; i < outcome.results.length; i++) {
    const value = formatCalculatorValue(outcome.results[i], definition.formats[i], locale);
    const labelBottom = wrap(page, c.outputs[index][i], M, top, WIDTH - 195, 9);
    const valueSize = Math.min(12, 185 / Math.max(width(value, 1, true), 1));
    line(page, value, W - M - width(value, valueSize, true), top, valueSize, true, orange);
    top = Math.max(top + 32, labelBottom + 10);
  }
  top += 12;
  rect(page, M, top, WIDTH, 125, silver);
  wrap(page, c.notes[index], M + 12, top + 13, WIDTH - 24, 9, false, muted);
  wrap(page, c.example, M, Math.max(top + 140, 695), WIDTH, 8.5, false, muted);
  return { bytes: await doc.save(), filename: `aixess-reverance-${unit.code}-${calculatorId}-${locale}.pdf` };
}

export async function downloadClientPdf(options) {
  const { bytes, filename } = await generateClientPdf(options);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.append(link);
  link.click(); link.remove();
  // Give mobile PDF viewers time to consume the download URL.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
