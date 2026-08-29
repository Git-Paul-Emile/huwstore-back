import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertPromoUsable, computeDiscount, computeShippingFee, promoLabel } from "./pricing.rules.js";
import { AppError } from "../utils/AppError.js";

/** Fabrique un code promo complet à partir de ce qui compte pour le test. */
const promo = (over: Partial<Parameters<typeof assertPromoUsable>[0] & object> = {}) =>
  ({
    id: "p1",
    code: "TEST10",
    type: "POURCENTAGE",
    value: 10,
    minCart: 0,
    used: 0,
    limit: 100,
    end: new Date(Date.now() + 86_400_000),
    active: true,
    ...over,
  }) as NonNullable<Parameters<typeof assertPromoUsable>[0]>;

const dakar = { fee: 2000, freeFrom: 75000 };

describe("computeShippingFee", () => {
  it("facture les frais de la zone sous le seuil de gratuité", () => {
    assert.equal(computeShippingFee(30000, dakar, "Domicile"), 2000);
  });

  it("offre la livraison à partir du seuil, seuil inclus", () => {
    assert.equal(computeShippingFee(75000, dakar, "Domicile"), 0);
    assert.equal(computeShippingFee(80000, dakar, "Domicile"), 0);
  });

  it("ne facture rien pour un retrait en point relais", () => {
    assert.equal(computeShippingFee(10000, dakar, "Point relais"), 0);
  });

  it("ne facture rien quand aucune zone n'est choisie", () => {
    assert.equal(computeShippingFee(10000, null, "Domicile"), 0);
  });
});

describe("computeDiscount", () => {
  it("applique un pourcentage sur le sous-total, jamais sur la livraison", () => {
    assert.equal(computeDiscount({ type: "POURCENTAGE", value: 10 }, 50000, 2000), 5000);
  });

  it("arrondit le pourcentage à l'unité", () => {
    assert.equal(computeDiscount({ type: "POURCENTAGE", value: 10 }, 4555, 0), 456);
  });

  it("applique un montant fixe tel quel", () => {
    assert.equal(computeDiscount({ type: "MONTANT_FIXE", value: 5000 }, 60000, 3000), 5000);
  });

  it("rembourse exactement les frais de port pour une livraison offerte", () => {
    assert.equal(computeDiscount({ type: "LIVRAISON_OFFERTE", value: 0 }, 60000, 3000), 3000);
  });

  it("ne rend jamais le total négatif", () => {
    // Un code de 20 000 FCFA sur un panier de 15 000 + 2 000 de port :
    // la remise est plafonnée à 17 000, donc le total tombe à zéro, pas en dessous.
    assert.equal(computeDiscount({ type: "MONTANT_FIXE", value: 20000 }, 15000, 2000), 17000);
  });

  it("ne produit jamais une remise négative", () => {
    assert.equal(computeDiscount({ type: "MONTANT_FIXE", value: -500 }, 15000, 0), 0);
  });
});

describe("promoLabel", () => {
  it("décrit chaque type de remise", () => {
    assert.equal(promoLabel({ type: "POURCENTAGE", value: 10 }), "-10 %");
    assert.match(promoLabel({ type: "MONTANT_FIXE", value: 5000 }), /^-5\s?000 FCFA$/);
    assert.equal(promoLabel({ type: "LIVRAISON_OFFERTE", value: 0 }), "Livraison offerte");
  });
});

describe("assertPromoUsable", () => {
  it("accepte un code actif, dans les temps et sous son quota", () => {
    assert.equal(assertPromoUsable(promo(), "TEST10", 50000).code, "TEST10");
  });

  it("refuse un code inconnu", () => {
    assert.throws(() => assertPromoUsable(null, "INCONNU", 10000), AppError);
  });

  it("refuse un code désactivé", () => {
    assert.throws(() => assertPromoUsable(promo({ active: false }), "TEST10", 10000), AppError);
  });

  it("refuse un code expiré", () => {
    assert.throws(() => assertPromoUsable(promo({ end: new Date("2020-01-01") }), "TEST10", 10000), AppError);
  });

  it("refuse un code au quota épuisé", () => {
    assert.throws(() => assertPromoUsable(promo({ used: 100, limit: 100 }), "TEST10", 10000), AppError);
  });

  it("refuse un panier sous le minimum exigé", () => {
    assert.throws(
      () => assertPromoUsable(promo({ minCart: 50000 }), "TEST10", 49999),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  });
});
