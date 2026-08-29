import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderCreateSchema } from "./order.validator.js";

const valide = {
  client: "Awa Ndiaye",
  phone: "77 123 45 67",
  addressLine: "Sacré-Cœur 3, villa 4521",
  city: "Dakar",
  country: "Sénégal",
  items: [{ variantId: "v1", qty: 1 }],
};

describe("orderCreateSchema", () => {
  it("accepte une commande minimale et applique les valeurs par défaut", () => {
    const parsed = orderCreateSchema.parse(valide);
    assert.equal(parsed.deliveryMode, "Domicile");
    assert.equal(parsed.method, "Paiement à la livraison");
    assert.equal(parsed.phone, "771234567");
  });

  it("n'exige pas d'adresse e-mail : commander sans compte reste possible", () => {
    assert.doesNotThrow(() => orderCreateSchema.parse(valide));
  });

  it("refuse une commande vide", () => {
    assert.throws(() => orderCreateSchema.parse({ ...valide, items: [] }));
  });

  it("refuse un moyen de paiement non ouvert à la vente", () => {
    // La boutique encaisse uniquement à la livraison : proposer autre chose
    // depuis le navigateur ne doit pas passer la validation.
    assert.throws(() => orderCreateSchema.parse({ ...valide, method: "Wave" }));
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
