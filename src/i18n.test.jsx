import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADMIN_COPY, translateAdmin } from "./admin-copy.js";
import { PRIVACY_COPY } from "./privacy-copy.js";
import { parse } from "@babel/parser";

// Ignore the English fallback when checking completeness: no locale should need it.
const source = readFileSync("src/i18n.jsx", "utf8");
const definitions = source.slice(source.indexOf("const ENGLISH"), source.indexOf("const LanguageContext"));
const { ENGLISH, TRANSLATIONS } = new Function(`${definitions.replaceAll("...ENGLISH,", "")} return { ENGLISH, TRANSLATIONS };`)();
const variables = (text) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();

describe("translation coverage", () => {
  it("does not hardcode visible English in the shipped components", () => {
    for(const file of ["src/App.jsx","src/components/ResidenceExplorer.jsx","src/components/Reverance3D.jsx","src/components/AdminLogin.jsx","src/components/AdminDashboard.jsx"]) {
      const visit = node => {
        if(!node || typeof node!=="object") return;
        if(node.type==="JSXText" && /[A-Za-z]{2}/.test(node.value)) expect(node.value.trim(), file).toBe("Website"); // Hidden anti-spam field.
        for(const [key,value] of Object.entries(node)) if(key!=="loc" && typeof value==="object") Array.isArray(value)?value.forEach(visit):visit(value);
      };
      visit(parse(readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]}));
    }
  });
  it("covers every room type supplied by both building datasets", () => {
    for (const file of ["public/data/reverance-a.json", "src/data/reveranceBPlans.json"]) {
      const data = JSON.parse(readFileSync(file, "utf8"));
      for (const type of new Set(data.floors.flatMap(f=>f.units.flatMap(u=>(u.areas || []).map(a=>a.type))))) {
        expect(ENGLISH[`room_${type}`], type).toBeTruthy();
      }
    }
  });
  it("has complete admin and privacy dictionaries with no missing interpolation", () => {
    expect(new Set(ADMIN_COPY.map(row=>row[0])).size).toBe(ADMIN_COPY.length);
    for (const row of ADMIN_COPY) {
      expect(row).toHaveLength(5);
      for (let i=1;i<5;i++) {
        expect(row[i], row[0]).toBeTruthy();
        if(row[0]!=="Recovery file") expect(variables(row[i]),row[0]).toEqual(variables(row[0]));
      }
    }
    for(const locale of ["de","pl","sl","ru"]) {
      expect(Object.keys(PRIVACY_COPY[locale]).sort()).toEqual(Object.keys(PRIVACY_COPY.en).sort());
      expect(translateAdmin(locale,"Recovery file",{email:"test@example.test",code:"TEST"})).toContain("TEST");
    }
    for(const file of ["src/components/AdminLogin.jsx","src/components/AdminDashboard.jsx"]) {
      const visit=node=>{
        if(!node||typeof node!=="object") return;
        if(node.type==="CallExpression"&&node.callee?.name==="tr"&&node.arguments[0]?.type==="StringLiteral") expect(ADMIN_COPY.some(row=>row[0]===node.arguments[0].value),node.arguments[0].value).toBe(true);
        for(const [key,value] of Object.entries(node)) if(key!=="loc"&&typeof value==="object") Array.isArray(value)?value.forEach(visit):visit(value);
      };
      visit(parse(readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]}));
    }
  });
  it("interpolates the selected building in every model badge", () => {
    for (const labels of [ENGLISH, ...Object.values(TRANSLATIONS)]) {
      expect(variables(labels.officialReconstruction)).toEqual(["block"]);
      expect(labels.officialReconstruction.replace(/\{\{block\}\}/g, "B")).not.toMatch(/[{}]/);
    }
  });
  it("defines every literal label used by the interface", () => {
    for (const file of ["src/App.jsx", "src/components/ResidenceExplorer.jsx", "src/components/Reverance3D.jsx", "src/components/TimeThemeMenu.jsx"]) {
      const code = readFileSync(file, "utf8");
      const keys = [...code.matchAll(/\bt\(\s*"([^"]+)"/g)].map((match) => match[1]);
      expect(keys.filter((key) => !(key in ENGLISH)), file).toEqual([]);
    }
  });

  for (const locale of ["de", "pl", "sl", "ru"]) {
    it(`translates every label and preserves interpolation values in ${locale}`, () => {
      for (const [key, english] of Object.entries(ENGLISH)) {
        expect(TRANSLATIONS[locale][key], `${locale}.${key}`).toBeTruthy();
        expect(variables(TRANSLATIONS[locale][key]), `${locale}.${key}`).toEqual(variables(english));
      }
    });
  }
});
