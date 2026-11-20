import { describe, expect, it } from "vitest";
import snapshot from "../../public/data/reverance-a.json";
import { applyWorkbookInventory, getWorkbookAvailableCount, FINAL_ROWS, OWNED_ROWS } from "./reveranceInventory";
import { REVERANCE_PDF_REFERENCE_CODES } from "./reverancePdfReferences";

function summarize(units) {
  return units.reduce((result, unit) => {
    result[unit.status] = (result[unit.status] || 0) + 1;
    return result;
  }, {});
}

describe("Reverance workbook inventory", () => {
  it("uses the explorer's available inventory for the marketing total", () => {
    const available = applyWorkbookInventory(snapshot).blocks.flatMap(block => block.floors.flatMap(floor => floor.units)).filter(unit => unit.status === "available");
    expect(getWorkbookAvailableCount()).toBe(158);
    expect(getWorkbookAvailableCount()).toBe(available.length);
  });
  it("keeps the supplied workbook rows auditable", () => {
    expect(FINAL_ROWS).toHaveLength(177);
    expect(OWNED_ROWS).toHaveLength(28);
    expect(FINAL_ROWS.every((row) => row[1] === "A" || row[1] === "B")).toBe(true);
  });

  it("builds complete, block-qualified inventory for both towers", () => {
    const next = applyWorkbookInventory(snapshot);
    expect(next.inventoryComplete).toBe(true);
    expect(next.blocks.map(({ id }) => id)).toEqual(["ReveranceA", "ReveranceB"]);

    const [a, b] = next.blocks.map((block) => block.floors.flatMap((floor) => floor.units));
    expect(a).toHaveLength(180);
    expect(b).toHaveLength(180);
    expect(summarize(a)).toEqual({ available: 53, unavailable: 12, sold: 115 });
    expect(summarize(b)).toEqual({ available: 105, reserved: 4, unavailable: 12, sold: 59 });
    expect(b.find(unit => unit.name === "1305")).toMatchObject({ status: "sold", price: null });
    expect(b.find(unit => unit.name === "1306")).toMatchObject({ status: "sold", price: null });
    expect(a.find((unit) => unit.name === "1301")).toMatchObject({ status: "sold", block: "A" });
    expect(b.find((unit) => unit.name === "510")).toMatchObject({ status: "available", price: 56511, bedrooms: 0 });
    expect(b.find((unit) => unit.name === "404")).toMatchObject({ status: "available", price: 98967, totalArea: 68.3 });
    expect(a.find((unit) => unit.name === "412")).toMatchObject({ status: "sold", price: null });
    expect(a.find((unit) => unit.name === "1406")).toMatchObject({
      image2d: "/assets/reverance-pdf/A1406-plan.webp",
      image3d: "/assets/reverance-pdf/A1406-render.webp",
    });
    expect(b.find((unit) => unit.name === "1408")).toMatchObject({
      image2d: "/assets/reverance-pdf/B1408-plan.webp",
      image3d: "/assets/reverance-pdf/B1408-render.webp",
    });
    expect(REVERANCE_PDF_REFERENCE_CODES).toHaveLength(28);
    for (const code of REVERANCE_PDF_REFERENCE_CODES) {
      const block = code[0] === "A" ? a : b;
      const unit = block.find((candidate) => candidate.name === code.slice(1));
      expect(unit, code).toMatchObject({
        image2d: `/assets/reverance-pdf/${code}-plan.webp`,
        image3d: `/assets/reverance-pdf/${code}-render.webp`,
      });
    }
    expect(b.find((unit) => unit.name === "1301")).toMatchObject({ status: "reserved", block: "B", blockId: "ReveranceB", price: 90480 });
    expect(a.find((unit) => unit.name === "1505")).toMatchObject({ status: "available" });
    expect(a.find((unit) => unit.name === "1601")).toMatchObject({ status: "unavailable", price: null });
    expect(a.find((unit) => unit.name === "204")).toMatchObject({ status: "sold" });
    expect(b.find((unit) => unit.name === "204")).toMatchObject({ status: "available", totalArea: 68.3 });
    expect(next.blocks[0].floors[8].shapes[0].points).not.toEqual(next.blocks[1].floors[8].shapes[0].points);
    for (const block of next.blocks) {
      expect(block.floors.every(floor => floor.units.length === 12)).toBe(true);
      expect(new Set(block.floors.flatMap(floor => floor.units.map(unit => unit.id))).size).toBe(180);
    }
  });
});
