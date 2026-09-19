import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderCreateSchema } from "./order.validator.js";

const valide = {
  client: "Awa Ndiaye",
  phone: "77 123 45 67",
  addressLine: "Sacré-Cœur 3, villa 4521",
  city: "Dakar",
  country: "Sénégal",
  method: "Espèces",
  items: [{ variantId: "v1", qty: 1 }],
};

describe("orderCreateSchema", () => {
  it("accepte une commande minimale et applique les valeurs par défaut", () => {
    const parsed = orderCreateSchema.parse(valide);
    assert.equal(parsed.deliveryMode, "Domicile");
    assert.equal(parsed.phone, "771234567");
  });

  it("exige un moyen de paiement", () => {
    const sansMethod: Record<string, unknown> = { ...valide };
    delete sansMethod.method;
    assert.throws(() => orderCreateSchema.parse(sansMethod));
  });

  it("n'exige pas d'adresse e-mail dans le corps : le compte connecté porte déjà le contact", () => {
    assert.doesNotThrow(() => orderCreateSchema.parse(valide));
  });

  it("refuse une commande vide", () => {
    assert.throws(() => orderCreateSchema.parse({ ...valide, items: [] }));
  });

  it("refuse un moyen de paiement non ouvert à la vente", () => {
    // Seuls espèces, Wave et Orange Money sont ouverts : un moyen non listé
    // (carte, virement...) ne doit pas passer la validation.
    assert.throws(() => orderCreateSchema.parse({ ...valide, method: "Carte bancaire" }));
  });

  it("refuse une quantité nulle, négative ou déraisonnable", () => {
    for (const qty of [0, -1, 51]) {
      assert.throws(() => orderCreateSchema.parse({ ...valide, items: [{ variantId: "v1", qty }] }));
    }
  });

  it("n'accepte jamais un montant envoyé par le navigateur", () => {
    const parsed = orderCreateSchema.parse({ ...valide, total: 1 }) as Record<string, unknown>;
    assert.equal(parsed.total, undefined);
  });
});
