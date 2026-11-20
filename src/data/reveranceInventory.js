// Canonical inventory imported from "Reverance1_Living_Inventory_AiXESS_updated_november_full_list.xlsx"
// (Kemo, 3 November 2026; 205 apartments, prices in USD). The workbook is kept as a source artifact;
// this small, deterministic module lets the visitor site render the same data without a network dependency.
// Regular rows: [apartment, block, floor, area m², status, price USD, bedrooms (0 = studio, from the Type column)].
import bPlans from './reveranceBPlans.json' with { type: 'json' };
import { getGoldenPremiumUnit } from './goldenPremiumApartments.js';
import { getReverancePdfReference } from './reverancePdfReferences.js';

const FINAL_ROWS = [
  [411, "A", 4, 64.5, "Available", 93460, 2],
  [502, "A", 5, 53, "Available", 85489, 1], [511, "A", 5, 68.2, "Available", 98822, 2],
  [602, "A", 6, 53, "Available", 92326, 1], [603, "A", 6, 65.9, "Available", 103199, 2], [604, "A", 6, 61.6, "Available", 96466, 2], [611, "A", 6, 68.2, "Available", 106801, 2], [612, "A", 6, 59.1, "Available", 92551, 2],
  [701, "A", 7, 46.4, "Available", 80829, 1], [702, "A", 7, 53, "Available", 92326, 1], [703, "A", 7, 65.9, "Available", 103199, 2], [704, "A", 7, 61.6, "Available", 96466, 2], [706, "A", 7, 32.7, "Available", 57846, 0], [707, "A", 7, 33.2, "Available", 58731, 0], [708, "A", 7, 33.6, "Available", 59438, 0], [709, "A", 7, 34.1, "Available", 60323, 0], [710, "A", 7, 34.5, "Available", 61030, 0], [711, "A", 7, 68.2, "Available", 106801, 2], [712, "A", 7, 59.1, "Available", 92551, 2],
  [802, "A", 8, 53, "Available", 92326, 1], [806, "A", 8, 32.7, "Available", 57846, 0], [807, "A", 8, 33.2, "Available", 58731, 0], [808, "A", 8, 33.6, "Available", 59438, 0], [809, "A", 8, 34.1, "Available", 60323, 0], [810, "A", 8, 34.5, "Available", 61030, 0], [811, "A", 8, 68.2, "Available", 106801, 2], [812, "A", 8, 59.1, "Available", 92551, 2],
  [901, "A", 9, 46.4, "Available", 80829, 1], [902, "A", 9, 53, "Available", 92326, 1], [903, "A", 9, 65.9, "Available", 103199, 2], [904, "A", 9, 68.3, "Available", 106958, 2], [912, "A", 9, 59.1, "Available", 92551, 2],
  [1001, "A", 10, 46.4, "Available", 84866, 1], [1002, "A", 10, 53, "Available", 96937, 1], [1003, "A", 10, 65.9, "Available", 108340, 2], [1004, "A", 10, 68.3, "Available", 112285, 2], [1011, "A", 10, 61.5, "Available", 101106, 2], [1012, "A", 10, 59.1, "Available", 97160, 2],
  [1102, "A", 11, 53, "Available", 96937, 1], [1103, "A", 11, 65.9, "Available", 108340, 2], [1112, "A", 11, 59.1, "Available", 97160, 2],
  [1202, "A", 12, 53, "Available", 96937, 1], [1203, "A", 12, 65.9, "Available", 108340, 2], [1212, "A", 12, 59.1, "Available", 97160, 2],
  [1302, "A", 13, 53, "Available", 96937, 1], [1303, "A", 13, 65.9, "Available", 108340, 2], [1312, "A", 13, 59.1, "Available", 97160, 2],
  [1505, "A", 15, 32.4, "Available", 63180, 0], [1506, "A", 15, 32.3, "Available", 62985, 0], [1507, "A", 15, 32.4, "Available", 63180, 0], [1511, "A", 15, 64.8, "Available", 111780, 2], [1512, "A", 15, 59.1, "Available", 101948, 2],
  [1601, "A", 16, 46.4, "NFS", 89088, 1], [1602, "A", 16, 53, "NFS", 101760, 1], [1603, "A", 16, 65.9, "NFS", 113678, 2], [1604, "A", 16, 62, "NFS", 106950, 2], [1605, "A", 16, 32.4, "NFS", 63180, 0], [1606, "A", 16, 32.3, "NFS", 62985, 0], [1607, "A", 16, 32.4, "NFS", 63180, 0], [1608, "A", 16, 32.3, "NFS", 62985, 0], [1609, "A", 16, 32.4, "NFS", 63180, 0], [1610, "A", 16, 32.3, "NFS", 62985, 0], [1611, "A", 16, 64.8, "NFS", 111780, 2], [1612, "A", 16, 59.1, "NFS", 101948, 2],
  [204, "B", 2, 68.3, "Available", 98967, 2],
  [311, "B", 3, 64.5, "Available", 93460, 2],
  [403, "B", 4, 65.9, "Available", 95489, 2], [404, "B", 4, 68.3, "Available", 98967, 2], [411, "B", 4, 64.5, "Available", 93460, 2], [412, "B", 4, 59.1, "Available", 85636, 2],
  [504, "B", 5, 61.6, "Available", 89258, 2], [510, "B", 5, 34.5, "Available", 56511, 0], [511, "B", 5, 68.2, "Available", 98822, 2], [512, "B", 5, 59.1, "Available", 85636, 2],
  [602, "B", 6, 53, "Available", 92326, 1], [603, "B", 6, 65.9, "Available", 103199, 2], [604, "B", 6, 61.6, "Available", 96466, 2], [610, "B", 6, 34.5, "Available", 61030, 0], [611, "B", 6, 68.2, "Available", 106801, 2], [612, "B", 6, 59.1, "Available", 92551, 2],
  [702, "B", 7, 53, "Available", 92326, 1], [703, "B", 7, 65.9, "Available", 103199, 2], [704, "B", 7, 61.6, "Available", 96466, 2], [705, "B", 7, 32.3, "Available", 57139, 0], [706, "B", 7, 32.7, "Available", 57846, 0], [707, "B", 7, 33.2, "Available", 58731, 0], [708, "B", 7, 33.6, "Available", 59438, 0], [709, "B", 7, 34.1, "Available", 60323, 0], [710, "B", 7, 34.5, "Available", 61030, 0], [711, "B", 7, 68.2, "Available", 106801, 2], [712, "B", 7, 59.1, "Available", 92551, 2],
  [801, "B", 8, 46.4, "Available", 80829, 1], [802, "B", 8, 53, "Available", 92326, 1], [803, "B", 8, 65.9, "Available", 103199, 2], [804, "B", 8, 61.6, "Available", 96466, 2], [805, "B", 8, 32.3, "Available", 57139, 0], [806, "B", 8, 32.7, "Available", 57846, 0], [807, "B", 8, 33.2, "Available", 58731, 0], [808, "B", 8, 33.6, "Available", 59438, 0], [809, "B", 8, 34.1, "Available", 60323, 0], [810, "B", 8, 34.5, "Available", 61030, 0], [811, "B", 8, 68.2, "Available", 106801, 2], [812, "B", 8, 59.1, "Available", 92551, 2],
  [901, "B", 9, 46.4, "Available", 80829, 1], [902, "B", 9, 53, "Available", 92326, 1], [903, "B", 9, 65.9, "Available", 103199, 2], [904, "B", 9, 68.3, "Available", 106958, 2], [905, "B", 9, 34.6, "Available", 61207, 0], [906, "B", 9, 34.1, "Available", 60323, 0], [907, "B", 9, 33.7, "Available", 59615, 0], [908, "B", 9, 33.1, "Available", 58554, 0], [911, "B", 9, 61.5, "Available", 96309, 2], [912, "B", 9, 59.1, "Available", 92551, 2],
  [1001, "B", 10, 46.4, "Available", 84866, 1], [1002, "B", 10, 53, "Available", 96937, 1], [1003, "B", 10, 65.9, "Available", 108340, 2], [1004, "B", 10, 68.3, "Available", 112285, 2], [1005, "B", 10, 34.6, "Available", 64287, 0], [1006, "B", 10, 34.1, "Available", 63358, 0], [1007, "B", 10, 33.7, "Available", 62615, 0], [1008, "B", 10, 33.1, "Available", 61500, 0], [1009, "B", 10, 32.8, "Available", 60942, 0], [1010, "B", 10, 32.2, "Available", 59828, 0], [1011, "B", 10, 61.5, "Available", 101106, 2], [1012, "B", 10, 59.1, "Available", 97160, 2],
  [1101, "B", 11, 46.4, "Available", 84866, 1], [1102, "B", 11, 53, "Available", 96937, 1], [1103, "B", 11, 65.9, "Available", 108340, 2], [1104, "B", 11, 68.3, "Available", 112285, 2], [1105, "B", 11, 34.6, "Available", 64287, 0], [1106, "B", 11, 34.1, "Available", 63358, 0], [1107, "B", 11, 33.7, "Available", 62615, 0], [1108, "B", 11, 33.1, "Available", 61500, 0], [1109, "B", 11, 32.8, "Available", 60942, 0], [1110, "B", 11, 32.2, "Available", 59828, 0], [1111, "B", 11, 61.5, "Available", 101106, 2], [1112, "B", 11, 59.1, "Available", 97160, 2],
  [1202, "B", 12, 53, "Available", 96937, 1], [1203, "B", 12, 65.9, "Available", 108340, 2], [1204, "B", 12, 68.3, "Available", 112285, 2], [1205, "B", 12, 34.6, "Available", 64287, 0], [1211, "B", 12, 61.5, "Available", 101106, 2], [1212, "B", 12, 59.1, "Available", 97160, 2],
  [1302, "B", 13, 53, "Available", 96937, 1], [1303, "B", 13, 65.9, "Available", 108340, 2], [1304, "B", 13, 62, "Available", 101928, 2], [1311, "B", 13, 64.8, "Available", 106531, 2], [1312, "B", 13, 59.1, "Available", 97160, 2],
  [1402, "B", 14, 53, "Available", 96937, 1], [1403, "B", 14, 65.9, "Available", 108340, 2], [1404, "B", 14, 62, "Available", 101928, 2], [1411, "B", 14, 64.8, "Available", 106531, 2], [1412, "B", 14, 59.1, "Available", 97160, 2],
  [1501, "B", 15, 46.4, "Available", 89088, 1], [1502, "B", 15, 53, "Available", 101760, 1], [1503, "B", 15, 65.9, "Available", 113678, 2], [1504, "B", 15, 62, "Available", 106950, 2], [1505, "B", 15, 32.4, "Available", 63180, 0], [1506, "B", 15, 32.3, "Available", 62985, 0], [1507, "B", 15, 32.4, "Available", 63180, 0], [1508, "B", 15, 32.3, "Available", 62985, 0], [1509, "B", 15, 32.4, "Available", 63180, 0], [1510, "B", 15, 32.3, "Available", 62985, 0], [1511, "B", 15, 64.8, "Available", 111780, 2], [1512, "B", 15, 59.1, "Available", 101948, 2],
  [1601, "B", 16, 46.4, "NFS", 89088, 1], [1602, "B", 16, 53, "NFS", 101760, 1], [1603, "B", 16, 65.9, "NFS", 113678, 2], [1604, "B", 16, 62, "NFS", 106950, 2], [1605, "B", 16, 32.4, "NFS", 63180, 0], [1606, "B", 16, 32.3, "NFS", 62985, 0], [1607, "B", 16, 32.4, "NFS", 63180, 0], [1608, "B", 16, 32.3, "NFS", 62985, 0], [1609, "B", 16, 32.4, "NFS", 63180, 0], [1610, "B", 16, 32.3, "NFS", 62985, 0], [1611, "B", 16, 64.8, "NFS", 111780, 2], [1612, "B", 16, 59.1, "NFS", 101948, 2],
];

const OWNED_ROWS = [
  [13, "A", "1301", 46.4, "Sold"], [13, "A", "1305", 32.4, "Sold"], [13, "A", "1306", 32.3, "Sold"], [13, "A", "1307", 32.4, "Sold"], [13, "A", "1308", 32.3, "Sold"], [13, "A", "1309", 32.4, "Sold"], [13, "A", "1310", 32.3, "Sold"],
  [14, "A", "1401", 46.4, "Available"], [14, "A", "1405", 32.4, "Sold"], [14, "A", "1406", 34.1, "Sold"], [14, "A", "1407", 32.4, "Sold"], [14, "A", "1408", 32.3, "Sold"], [14, "A", "1409", 32.4, "Sold"], [14, "A", "1410", 32.3, "Sold"],
  [13, "B", "1301", 46.4, "Reserved"], [13, "B", "1305", 32.4, "Sold"], [13, "B", "1306", 32.3, "Sold"], [13, "B", "1307", 32.4, "Sold"], [13, "B", "1308", 32.3, "Sold"], [13, "B", "1309", 32.4, "Available"], [13, "B", "1310", 32.3, "Sold"],
  [14, "B", "1401", 46.4, "Reserved"], [14, "B", "1405", 32.4, "Reserved"], [14, "B", "1406", 32.3, "Reserved"], [14, "B", "1407", 32.4, "Available"], [14, "B", "1408", 32.3, "Available"], [14, "B", "1409", 32.4, "Available"], [14, "B", "1410", 32.3, "Sold"],
];

const BLOCK_IDS = Object.freeze({ A: "ReveranceA", B: "ReveranceB" });
const BLOCK_NAMES = Object.freeze({ A: "A Block", B: "B Block" });

function normalizeWorkbookStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "available" || value === "reserved" || value === "sold") return value;
  // NFS (not for sale) is intentionally distinct from sold.
  return "unavailable";
}

const EMPTY_PLAN_META = { rooms: null, bedrooms: null, areas: [], image2d: null, image3d: null, price: null };

function canonicalRows() {
  const rows = new Map();
  for (const [id, block, floor, area, status, price, bedrooms] of FINAL_ROWS) {
    rows.set(`${block}:${floor}:${id}`, { block, floor, name: String(id), area, status, price, bedrooms });
  }
  for (const [floor, block, name, area, status] of OWNED_ROWS) {
    rows.set(`${block}:${floor}:${name}`, { block, floor, name, area, status });
  }
  // Golden Premium rows take their status, area and price from goldenPremiumApartments.js.
  return [...rows.values()].map(row => {
    const premium = getGoldenPremiumUnit(`${row.block}${row.name}`);
    return premium ? { ...row, status: premium.status, area: premium.area, price: premium.price, bedrooms: premium.bedrooms } : row;
  });
}

export function getWorkbookAvailableCount() {
  return canonicalRows().filter(row => normalizeWorkbookStatus(row.status) === "available").length;
}

function makeUnit(row, base) {
  // A similar area is not proof of the same apartment plan or bedroom count.
  const meta = base && (row.area == null || Math.abs(base.totalArea - row.area) < 0.05)
    ? base : EMPTY_PLAN_META;
  const pdfReference = getReverancePdfReference(`${row.block}${row.name}`);
  const status = normalizeWorkbookStatus(row.status);
  return {
    ...meta,
    ...(pdfReference || {}),
    id: row.block === "A" && base?.id !== undefined ? base.id : `${row.block}-${row.name}`,
    name: row.name,
    status,
    // The workbook's USD list price, shown only while the apartment can still be bought.
    price: (status === "available" || status === "reserved") && row.price ? row.price : null,
    floor: row.floor,
    // Official plan data wins; the workbook's type fills apartments without plan metadata.
    bedrooms: meta.bedrooms ?? row.bedrooms ?? null,
    totalArea: row.area == null ? base?.totalArea ?? null : Number(row.area),
    block: row.block,
    blockId: BLOCK_IDS[row.block],
    sourceStatus: row.status,
    goldenPremium: getGoldenPremiumUnit(`${row.block}${row.name}`),
  };
}

function cloneFloor(floor, block, units) {
  return {
    ...floor,
    id: `${block}-${floor.number}`,
    units,
    shapes: (floor.shapes || []).map((shape) => ({
      ...shape,
      id: `${block}-${shape.id}`,
    })),
  };
}

/**
 * Workbook rows govern sales status; every other mapped apartment is sold,
 * as confirmed by the owner. Each block keeps its own official floor plans.
 */
export function applyWorkbookInventory(snapshot) {
  if (!snapshot?.blockId || !Array.isArray(snapshot.floors)) return snapshot;

  const rows = new Map(canonicalRows().map(row => [`${row.block}:${row.name}`, row]));
  const buildFloors = (source, block) => source.map(floor => {
    const metadata = new Map((floor.units || []).map(unit => [String(unit.name), unit]));
    const names = new Set((floor.shapes || []).map(shape => String(shape.target)));
    for (const row of rows.values()) if (row.block === block && row.floor === floor.number) names.add(row.name);
    const units = [...names].map(name => makeUnit(
      rows.get(`${block}:${name}`) || { block, name, floor: floor.number, area: null, status: 'Sold' },
      metadata.get(name),
    )).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return cloneFloor(floor, block, units);
  });
  const aFloors = buildFloors(snapshot.floors, 'A');
  const bFloors = buildFloors(bPlans.floors, 'B');

  const blocks = [
    { id: BLOCK_IDS.A, code: "A", name: BLOCK_NAMES.A, floors: aFloors },
    { id: BLOCK_IDS.B, code: "B", name: BLOCK_NAMES.B, floors: bFloors },
  ];
  return {
    ...snapshot,
    blockName: "A + B Blocks",
    floors: aFloors,
    blocks,
    inventorySource: "Reverance1_Living_Inventory_AiXESS_updated_november_full_list.xlsx",
    inventoryComplete: true,
  };
}

export { BLOCK_IDS, BLOCK_NAMES, FINAL_ROWS, OWNED_ROWS, normalizeWorkbookStatus };
