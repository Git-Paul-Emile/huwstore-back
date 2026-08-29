import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPdfDocument, measureText } from "./pdf.js";

describe("measureText", () => {
  it("mesure une largeur proportionnelle à la taille de police", () => {
    assert.equal(measureText("HUWSTORE", 20), measureText("HUWSTORE", 10) * 2);
  });

  it("donne une largeur nulle à une chaîne vide", () => {
    assert.equal(measureText("", 12), 0);
  });

  it("compte le gras plus large que le maigre pour un même texte", () => {
    assert.ok(measureText("Total à régler", 10, "bold") > measureText("Total à régler", 10));
  });

  it("attribue une largeur aux caractères accentués (sinon l'alignement dérive)", () => {
    assert.ok(measureText("é", 10) > 0);
  });
});

describe("createPdfDocument", () => {
  it("produit un fichier PDF valide, en-tête et fin de fichier compris", () => {
    const pdf = createPdfDocument().text("Facture", 40, 60).build();
    const content = pdf.toString("latin1");

    assert.ok(content.startsWith("%PDF-1.4"));
    assert.ok(content.trimEnd().endsWith("%%EOF"));
    assert.ok(content.includes("/Type /Catalog"));
    assert.ok(content.includes("(Facture) Tj"));
  });

  it("échappe les parenthèses, qui délimitent les chaînes en PDF", () => {
    const content = createPdfDocument().text("Sac (noir)", 10, 10).build().toString("latin1");
    assert.ok(content.includes("(Sac \\(noir\\)) Tj"));
  });

  it("déclare une table xref cohérente avec le nombre d'objets", () => {
    const content = createPdfDocument().text("x", 10, 10).build().toString("latin1");
    assert.ok(content.includes("xref\n0 7"));
    assert.ok(content.includes("/Size 7"));
  });

  it("coupe un paragraphe et renvoie l'ordonnée de la ligne suivante", () => {
    const doc = createPdfDocument();
    const y = doc.paragraph("mot ".repeat(40).trim(), 40, 100, 200, { size: 9 });
    assert.ok(y > 100, "le curseur doit descendre après plusieurs lignes");
  });
});
