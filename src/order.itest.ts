/**
 * Test d'intégration avec base réelle (rules/testing.md).
 *
 * Il vérifie le parcours qui compte : calcul du prix côté serveur, puis
 * enregistrement de la commande AVEC décrément du stock dans la même
 * transaction. C'est le seul endroit où l'on prouve que la transaction tient.
 *
 * Il ne s'exécute QUE si `TEST_DATABASE_URL` est défini - une base jetable,
 * jamais celle de développement. Sans elle, les cas sont ignorés (le script
 * `test:integration` passe quand même au vert).
 *
 *   TEST_DATABASE_URL=postgresql://... npx prisma migrate deploy   # une fois
 *   TEST_DATABASE_URL=postgresql://... pnpm test:integration
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL;
// Doit être posé AVANT le premier import de config/database.ts.
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const maybe = TEST_DB ? describe : describe.skip;

maybe("commande de bout en bout (base réelle)", async () => {
  const { prisma } = await import("./config/database.js");
  const { pricingService } = await import("./services/pricing.service.js");
  const { orderService } = await import("./services/order.service.js");

  const ids = {
    category: `itest-cat-${Date.now()}`,
    product: `itest-prod-${Date.now()}`,
    zone: "",
    variant: "",
    user: "",
  };

  before(async () => {
    const user = await prisma.user.create({
      data: {
        name: "Awa Test",
        phone: `77${Date.now().toString().slice(-7)}`,
        passwordHash: "x",
      },
    });
    ids.user = user.id;
    const category = await prisma.category.create({
      data: { id: ids.category, name: ids.category, slug: ids.category, image: "x", position: 99 },
    });
    const product = await prisma.product.create({
      data: {
        id: ids.product,
        slug: ids.product,
        name: "Sac de test intégration",
        collection: "TEST",
        categoryId: category.id,
        material: "Toile",
        description: "…",
        care: "…",
        price: 10_000,
        variants: {
          create: {
            sku: `ITEST-${Date.now()}`,
            colorName: "Noir",
            colorSlug: "noir",
            hex: "#000",
            stock: { create: { qty: 5, threshold: 1 } },
          },
        },
      },
      include: { variants: true },
    });
    ids.variant = product.variants[0].id;
    const zone = await prisma.deliveryZone.create({
      data: { city: `ITest ${Date.now()}`, country: "Test", fee: 2_000, freeFrom: 50_000, delay: "24 h" },
    });
    ids.zone = zone.id;
  });

  after(async () => {
    await prisma.order.deleteMany({ where: { items: { some: { productId: ids.product } } } });
    await prisma.product.deleteMany({ where: { id: ids.product } });
    await prisma.category.deleteMany({ where: { id: ids.category } });
    await prisma.deliveryZone.deleteMany({ where: { id: ids.zone } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.$disconnect();
  });

  it("le devis fige le prix et ajoute les frais de port sous le seuil", async () => {
    const quote = await pricingService.quote({
      items: [{ variantId: ids.variant, qty: 2 }],
      deliveryZoneId: ids.zone,
      deliveryMode: "Domicile",
    });
    assert.equal(quote.subtotal, 20_000);
    assert.equal(quote.shippingFee, 2_000);
    assert.equal(quote.total, 22_000);
  });

  it("créer la commande décrémente le stock dans la même transaction", async () => {
    const before = await prisma.stock.findUniqueOrThrow({ where: { variantId: ids.variant } });

    await orderService.create(
      {
        client: "Awa Test",
        phone: "771234567",
        addressLine: "Rue du test, villa 1",
        city: "Dakar",
        country: "Sénégal",
        deliveryMode: "Domicile",
        deliveryZoneId: ids.zone,
        method: "Paiement à la livraison",
        items: [{ variantId: ids.variant, qty: 3 }],
      },
      ids.user,
    );

    const after = await prisma.stock.findUniqueOrThrow({ where: { variantId: ids.variant } });
    assert.equal(after.qty, before.qty - 3);

    const moves = await prisma.stockMovement.count({ where: { variantId: ids.variant, type: "VENTE" } });
    assert.ok(moves >= 1);
  });

  it("refuse une commande au-delà du stock, sans rien écrire", async () => {
    const before = await prisma.stock.findUniqueOrThrow({ where: { variantId: ids.variant } });
    await assert.rejects(
      orderService.create(
        {
          client: "Awa Test",
          phone: "771234567",
          addressLine: "Rue du test, villa 1",
          city: "Dakar",
          country: "Sénégal",
          deliveryMode: "Domicile",
          method: "Paiement à la livraison",
          items: [{ variantId: ids.variant, qty: 999 }],
        },
        ids.user,
      ),
    );
    const after = await prisma.stock.findUniqueOrThrow({ where: { variantId: ids.variant } });
    assert.equal(after.qty, before.qty);
  });
});
