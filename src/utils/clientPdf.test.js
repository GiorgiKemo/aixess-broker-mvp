import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { CALCULATORS } from "./calculators.js";
import { CALCULATOR_APARTMENTS } from "../data/calculatorApartments.js";
import { getGoldenPremiumUnit } from "../data/goldenPremiumApartments.js";
import { CLIENT_PDF_COPY } from "../client-pdf-copy.js";
import { generateClientPdf, PDF_FONT_FILES } from "./clientPdf.js";

const loadAssets = async () => ({
  fonts: await Promise.all(PDF_FONT_FILES.map(file => readFile(`public/fonts/client-pdf/${file}`))),
  logo: await readFile("public/brand/aixess-logo-white.png"),
  plan: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  points: [{ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 40 }, { x: 20, y: 40 }],
});
const options = { locale: "en", calculatorId: "payment", values: [90000, 10, 30, 60, 24], apartmentCode: "A1401" };

describe("client-facing PDF", () => {
  it.each(Object.keys(CLIENT_PDF_COPY).flatMap(locale => CALCULATORS.map(calc => [locale, calc])))("generates a localized %s %j PDF", async (locale, calc) => {
    const result = await generateClientPdf({ ...options, locale, calculatorId: calc.id, values: calc.defaults, clientName: "Łukasz Müller · Жан", clientAddress: "Šmartinska cesta 12, Ljubljana" }, { loadAssets });
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getTitle()).toContain("AiXESS");
    expect(result.filename).toBe(`aixess-reverance-A1401-${calc.id}-${locale}.pdf`);
  });
  it.each([
    { apartmentCode: "A1308" }, { apartmentCode: "B1306" }, { locale: "xx" }, { clientName: "x".repeat(101) },
    { clientAddress: "x".repeat(301) }, { values: [90000, 10, 30, 50, 24] },
    { values: [90000, 10, 30, 60, ""] },
  ])("rejects invalid details before loading assets: %j", async overrides => {
    await expect(generateClientPdf({ ...options, ...overrides }, { loadAssets: () => { throw Error("must not load"); } })).rejects.toThrow("invalid");
  });
  it("reports unsupported glyphs instead of silently losing client information", async () => {
    await expect(generateClientPdf({ ...options, clientName: "😀" }, { loadAssets })).rejects.toThrow("glyph");
  });
  it("accepts maximum-length Cyrillic client information", async () => {
    const { bytes } = await generateClientPdf({ ...options, locale: "ru", clientName: "Ж".repeat(100), clientAddress: "Ж".repeat(300) }, { loadAssets });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });
  it("includes both lists without premium-label leakage or duplicate units", () => {
    expect(CALCULATOR_APARTMENTS).toHaveLength(158);
    expect(new Set(CALCULATOR_APARTMENTS.map(unit => unit.code)).size).toBe(158);
    expect(CALCULATOR_APARTMENTS.filter(unit => getGoldenPremiumUnit(unit.code))).toHaveLength(5);
    expect(CALCULATOR_APARTMENTS.filter(unit => !getGoldenPremiumUnit(unit.code))).toHaveLength(153);
    expect(CALCULATOR_APARTMENTS.find(unit => unit.code === "A411")).toMatchObject({ block: "A", floor: 4, area: 64.5 });
    expect(CALCULATOR_APARTMENTS.find(unit => unit.code === "B204")).toMatchObject({ block: "B", floor: 2, area: 68.3 });
    expect(CALCULATOR_APARTMENTS.every(unit => !("price" in unit))).toBe(true);
  });
  it.each(["A411", "B204", "B1407"])("exports regular and premium unit %s", async apartmentCode => {
    const { bytes } = await generateClientPdf({ ...options, apartmentCode }, { loadAssets });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });
  it("has complete translated PDF and form labels", () => {
    for (const copy of Object.values(CLIENT_PDF_COPY)) {
      expect(Object.keys(copy)).toEqual(Object.keys(CLIENT_PDF_COPY.en));
      expect(Object.values(copy).every(value => typeof value === "string" && value.trim())).toBe(true);
    }
  });
});
