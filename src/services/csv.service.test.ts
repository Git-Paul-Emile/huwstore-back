import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv.service.js";

describe("toCsv", () => {
  const columns = [
    { header: "Nom", value: (row: { name: string; total: number }) => row.name },
    { header: "Total", value: (row: { name: string; total: number }) => row.total },
  ];

  it("commence par le BOM UTF-8, sans lequel Excel casse les accents", () => {
    assert.ok(toCsv([], columns).startsWith("﻿"));
  });

  it("sépare les colonnes par un point-virgule (Excel en français)", () => {
    const csv = toCsv([{ name: "Awa", total: 12000 }], columns);
    assert.ok(csv.includes('"Awa";"12000"'));
  });

  it("double les guillemets internes au lieu de casser la cellule", () => {
    const csv = toCsv([{ name: 'Sac "Freedom"', total: 1 }], columns);
    assert.ok(csv.includes('"Sac ""Freedom"""'));
  });

  it("neutralise une cellule qui commence par = (injection de formule Excel)", () => {
    const csv = toCsv([{ name: "=1+1", total: 0 }], columns);
    assert.ok(csv.includes('"\'=1+1"'));
  });

  it("sépare les lignes par un retour chariot Windows", () => {
    const csv = toCsv([{ name: "A", total: 1 }], columns);
    assert.equal(csv.split("\r\n").length, 2);
  });
});
