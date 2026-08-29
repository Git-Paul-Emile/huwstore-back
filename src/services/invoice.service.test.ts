import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { invoiceService, invoiceNumber } from "./invoice.service.js";
import type { OrderDto } from "./order.service.js";
import type { SettingDto } from "./setting.service.js";

const shop: SettingDto = {
  shopName: "HUWSTORE",
  phone: "70 966 62 59",
  whatsapp: "221709666259",
  email: "contact@huwstore.sn",
  city: "Dakar",
  country: "Sénégal",
  addressLine: undefined,
  ninea: undefined,
  instagramUrl: undefined,
  facebookUrl: undefined,
  tiktokUrl: undefined,
  announcement: undefined,
};

const order: OrderDto = {
  id: "clx00000000000abcd1234",
  client: "Awa Ndiaye",
  phone: "778124490",
  email: "awa@example.com",
  addressLine: "Sacré-Cœur 3, villa 4521",
  landmark: "En face de la pharmacie",
  city: "Dakar",
  country: "Sénégal",
  deliveryMode: "Domicile",
  items: [{ productId: "p1", variantId: "v1", name: "Tote bag coton", color: "Noir", qty: 2, price: 18000 }],
  subtotal: 36000,
  shippingFee: 2000,
  discount: 3600,
  promoCode: "BIENVENUE10",
  total: 34400,
  pay: "En attente",
  method: "Paiement à la livraison",
  status: "En préparation",
  courier: undefined,
  tracking: undefined,
  note: undefined,
  guest: true,
  date: new Date("2026-08-28T10:00:00.000Z"),
};

describe("invoiceNumber", () => {
  it("dérive un numéro court et lisible de l'identifiant de commande", () => {
    assert.equal(invoiceNumber("clx00000000000abcd1234"), "FA-ABCD1234");
  });
});

describe("invoiceService.build", () => {
  const pdf = invoiceService.build(order, shop);
  const content = pdf.toString("latin1");

  it("produit un PDF non vide", () => {
    assert.ok(pdf.length > 800);
    assert.ok(content.startsWith("%PDF"));
  });

  it("imprime le numéro de facture et le nom de la cliente", () => {
    assert.ok(content.includes("FA-ABCD1234"));
    assert.ok(content.includes("Awa Ndiaye"));
  });

  it("imprime les montants figés de la commande, sans les recalculer", () => {
    // 34 400 FCFA : le total tel qu'il a été enregistré, espace insécable compris.
    assert.match(content, /34.400 FCFA/);
    assert.ok(content.includes("BIENVENUE10"));
  });

  it("affiche « Offerte » plutôt que 0 FCFA quand la livraison est gratuite", () => {
    const free = invoiceService.build({ ...order, shippingFee: 0 }, shop);
    assert.ok(free.toString("latin1").includes("Offerte"));
  });

  it("porte la mention « TVA non applicable » tant qu'aucun NINEA n'est renseigné", () => {
    assert.ok(content.includes("TVA non applicable"));
  });

  it("imprime le NINEA dès qu'il est renseigné dans les paramètres", () => {
    const withNinea = invoiceService.build(order, { ...shop, ninea: "0071234567" }).toString("latin1");
    assert.ok(withNinea.includes("0071234567"));
    assert.ok(!withNinea.includes("TVA non applicable"));
  });

  it("nomme le fichier d'après le numéro de facture", () => {
    assert.equal(invoiceService.fileName(order), "FA-ABCD1234.pdf");
  });
});
