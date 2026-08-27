/**
 * Seed de la base HUWSTORE.
 *
 *   npm run seed
 *
 * Rôle : écrire en base le catalogue réel décrit dans prisma/catalog.ts,
 * avec ses déclinaisons couleur, sa galerie photo et son stock initial.
 *
 * Le script est IDEMPOTENT (upsert partout) : le relancer met la base à jour
 * sans créer de doublon. Seules la galerie et les jeux de démonstration
 * (bannières, mouvements de stock) sont réécrits à chaque exécution, parce
 * qu'ils n'ont pas de clé naturelle stable.
 *
 * Les URLs des médias viennent de prisma/media.ts : Cloudinary si
 * `npm run media:upload` a déjà tourné, sinon les fichiers locaux du front.
 */
import { PrismaClient, type ProductBadge, type PayMethod, type PayStatus, type OrderStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { categories, products, skuOf, INITIAL_STOCK } from "./catalog.js";
import { productMedia, usingCloudinary } from "./media.js";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Données d'exploitation (zones de livraison) et jeux de démonstration.
// Les clients et commandes ci-dessous sont FICTIFS : ils servent uniquement à
// alimenter le tableau de bord et les statistiques de l'admin.
// ---------------------------------------------------------------------------

const deliveryZones = [
  { city: "Dakar", country: "Sénégal", fee: 2000, freeFrom: 75000, delay: "24 – 48 h", relay: true },
  { city: "Abidjan", country: "Côte d'Ivoire", fee: 3000, freeFrom: 90000, delay: "2 – 4 jours", relay: true },
  { city: "Douala", country: "Cameroun", fee: 3500, freeFrom: 90000, delay: "3 – 5 jours", relay: true },
  { city: "Yaoundé", country: "Cameroun", fee: 4000, freeFrom: 90000, delay: "3 – 5 jours", relay: false },
  { city: "Brazzaville", country: "Congo", fee: 4500, freeFrom: 100000, delay: "4 – 6 jours", relay: false },
  { city: "Cotonou", country: "Bénin", fee: 3500, freeFrom: 90000, delay: "3 – 5 jours", relay: true },
  { city: "Lomé", country: "Togo", fee: 3500, freeFrom: 90000, delay: "3 – 5 jours", relay: false },
  { city: "Bamako", country: "Mali", fee: 4000, freeFrom: 95000, delay: "4 – 6 jours", relay: false },
];

const demoClients = [
  { name: "Awa Ndiaye", phone: "+221778124490", email: "awa.n@mail.com", city: "Dakar", since: "2024-11-03" },
  { name: "Fatou Bamba", phone: "+225074522180", email: "fatou.b@mail.com", city: "Abidjan", since: "2025-02-19" },
  { name: "Marième Sow", phone: "+221763301107", email: "marieme@mail.com", city: "Dakar", since: "2025-01-22" },
  { name: "Grace Mbala", phone: "+237699401233", email: "grace.m@mail.com", city: "Douala", since: "2025-06-08" },
  { name: "Aïcha Traoré", phone: "+223762188400", email: "aicha.t@mail.com", city: "Bamako", since: "2026-08-14" },
  { name: "Nadège Kouassi", phone: "+229975530210", email: "nadege@mail.com", city: "Cotonou", since: "2024-09-30" },
];

const demoOrders = [
  { id: "CMD-2418", client: "Awa Ndiaye", city: "Dakar", country: "Sénégal", items: [{ product: "tote-bag-coton-durable", color: "noir", qty: 1 }], pay: "PAYE" as PayStatus, method: "WAVE" as PayMethod, status: "EN_COURS_DE_LIVRAISON" as OrderStatus, courier: "Livreur interne · Moussa", tracking: "MW-DK-0091", date: "2026-08-22" },
  { id: "CMD-2417", client: "Fatou Bamba", city: "Abidjan", country: "Côte d'Ivoire", items: [{ product: "sac-main-patchwork-pu", color: "bleu", qty: 1 }, { product: "tote-bag-freedom", color: "beige", qty: 1 }], pay: "EN_ATTENTE" as PayStatus, method: "ORANGE_MONEY" as PayMethod, status: "EN_PREPARATION" as OrderStatus, courier: null, tracking: null, date: "2026-08-22" },
  { id: "CMD-2416", client: "Marième Sow", city: "Dakar", country: "Sénégal", items: [{ product: "fourre-tout-oxford", color: "vert", qty: 2 }], pay: "PAYE" as PayStatus, method: "COD" as PayMethod, status: "EXPEDIEE" as OrderStatus, courier: "DHL Express", tracking: "DHL-77120945", date: "2026-08-21" },
  { id: "CMD-2415", client: "Grace Mbala", city: "Douala", country: "Cameroun", items: [{ product: "fourre-tout-toile-epaisse", color: "kaki", qty: 1 }], pay: "PAYE" as PayStatus, method: "WAVE" as PayMethod, status: "LIVREE" as OrderStatus, courier: "Prestataire · Chronopost", tracking: "CH-CM-4402", date: "2026-08-19" },
  { id: "CMD-2414", client: "Aïcha Traoré", city: "Bamako", country: "Mali", items: [{ product: "tote-bag-velours-cotele", color: "noir-marron", qty: 1 }], pay: "ECHOUE" as PayStatus, method: "ORANGE_MONEY" as PayMethod, status: "EN_PREPARATION" as OrderStatus, courier: null, tracking: null, date: "2026-08-19" },
  { id: "CMD-2413", client: "Nadège Kouassi", city: "Cotonou", country: "Bénin", items: [{ product: "tote-bag-coton-durable", color: "beige", qty: 1 }], pay: "PAYE" as PayStatus, method: "CARTE" as PayMethod, status: "RETOURNEE" as OrderStatus, courier: "Prestataire · Chronopost", tracking: "CH-BJ-1180", date: "2026-08-17" },
];

const promos = [
  { code: "BIENVENUE10", type: "POURCENTAGE" as const, value: 10, minCart: 0, used: 0, limit: 1000, end: "2026-12-31", active: true },
  { code: "LIVRAISON0", type: "LIVRAISON_OFFERTE" as const, value: 0, minCart: 50000, used: 0, limit: 500, end: "2026-09-30", active: true },
  { code: "RENTREE5000", type: "MONTANT_FIXE" as const, value: 5000, minCart: 60000, used: 0, limit: 300, end: "2026-09-15", active: false },
];

// ---------------------------------------------------------------------------

/** Première photo disponible pour une clé de média, avec repli sur les visuels communs. */
function firstImage(productSlug: string, key: string): string {
  const media = productMedia(productSlug);
  return media.images[key]?.[0] ?? media.images.generic?.[0] ?? Object.values(media.images).flat()[0];
}

async function seedCatalog() {
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, image: firstImage(category.cover.product, category.cover.key), position: category.position },
      create: {
        name: category.name,
        slug: category.slug,
        image: firstImage(category.cover.product, category.cover.key),
        position: category.position,
      },
    });
    categoryIds.set(category.name, row.id);
  }

  for (const product of products) {
    const media = productMedia(product.slug);
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Catégorie inconnue pour ${product.slug} : ${product.category}`);

    const data = {
      slug: product.slug,
      name: product.name,
      collection: product.collection,
      categoryId,
      material: product.material,
      description: product.description,
      care: product.care,
      price: product.price,
      compareAt: product.compareAt ?? null,
      badge: (product.badge ?? null) as ProductBadge | null,
      videoUrl: media.video,
      closure: product.closure ?? null,
      capacity: product.capacity ?? null,
      widthTopMm: product.widthTopMm ?? null,
      widthBottomMm: product.widthBottomMm ?? null,
      heightMm: product.heightMm ?? null,
      depthMm: product.depthMm ?? null,
      handleDropMm: product.handleDropMm ?? null,
      weightGrams: product.weightGrams ?? null,
      features: product.features,
    };

    await prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: { id: product.id, ...data },
    });

    // La galerie n'a pas de clé naturelle : on la reconstruit intégralement
    // à chaque seed plutôt que de tenter un diff fragile.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });

    for (const [index, variant] of product.variants.entries()) {
      const row = await prisma.productVariant.upsert({
        where: { productId_colorSlug: { productId: product.id, colorSlug: variant.colorSlug } },
        update: {
          sku: skuOf(product.slug, variant.colorSlug),
          colorName: variant.colorName,
          hex: variant.hex,
          hexSecondary: variant.hexSecondary ?? null,
          position: index,
        },
        create: {
          productId: product.id,
          sku: skuOf(product.slug, variant.colorSlug),
          colorName: variant.colorName,
          colorSlug: variant.colorSlug,
          hex: variant.hex,
          hexSecondary: variant.hexSecondary ?? null,
          position: index,
        },
      });

      await prisma.stock.upsert({
        where: { variantId: row.id },
        update: {},
        create: { variantId: row.id, qty: INITIAL_STOCK.qty, threshold: INITIAL_STOCK.threshold },
      });

      const urls = media.images[variant.colorSlug] ?? [];
      await prisma.productImage.createMany({
        data: urls.map((url, position) => ({
          productId: product.id,
          variantId: row.id,
          url,
          alt: `${product.name} — coloris ${variant.colorName}`,
          // Les visuels de variante passent devant les visuels communs.
          position: index * 100 + position,
        })),
      });
    }

    // Visuels communs (packshots, fiche technique) : rattachés au produit seul.
    await prisma.productImage.createMany({
      data: (media.images.generic ?? []).map((url, position) => ({
        productId: product.id,
        variantId: null,
        url,
        alt: `${product.name} — présentation`,
        position: 10_000 + position,
      })),
    });

    // Les variantes retirées du catalogue sont désactivées, jamais supprimées :
    // elles restent référencées par l'historique des commandes.
    await prisma.productVariant.updateMany({
      where: { productId: product.id, colorSlug: { notIn: product.variants.map((v) => v.colorSlug) } },
      data: { active: false },
    });
  }

  // Idem au niveau produit : tout ce qui n'est plus au catalogue sort de la
  // boutique sans casser les commandes passées.
  await prisma.product.updateMany({
    where: { id: { notIn: products.map((p) => p.id) } },
    data: { active: false },
  });
}

async function seedOperations() {
  for (const zone of deliveryZones) {
    await prisma.deliveryZone.upsert({
      where: { city_country: { city: zone.city, country: zone.country } },
      update: zone,
      create: zone,
    });
  }

  for (const promo of promos) {
    await prisma.promo.upsert({
      where: { code: promo.code },
      update: { end: new Date(promo.end), active: promo.active },
      create: { ...promo, end: new Date(promo.end) },
    });
  }
}

async function seedDemo() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { phone: "+221709666259" },
    update: {},
    create: {
      name: "Admin HUWSTORE",
      phone: "+221709666259",
      email: "admin@huwstore.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  const clientIds = new Map<string, string>();
  for (const client of demoClients) {
    const user = await prisma.user.upsert({
      where: { phone: client.phone },
      update: {},
      create: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        city: client.city,
        passwordHash,
        createdAt: new Date(client.since),
      },
    });
    clientIds.set(client.name, user.id);
  }

  const variants = await prisma.productVariant.findMany({ include: { product: { select: { name: true, price: true } } } });
  const variantOf = (productId: string, colorSlug: string) => {
    const found = variants.find((v) => v.productId === productId && v.colorSlug === colorSlug);
    if (!found) throw new Error(`Variante introuvable : ${productId} / ${colorSlug}`);
    return found;
  };

  for (const order of demoOrders) {
    const items = order.items.map((line) => {
      const variant = variantOf(line.product, line.color);
      return {
        productId: line.product,
        variantId: variant.id,
        name: variant.product.name,
        color: variant.colorName,
        qty: line.qty,
        price: variant.product.price,
      };
    });

    await prisma.order.upsert({
      where: { id: order.id },
      update: {},
      create: {
        id: order.id,
        userId: clientIds.get(order.client),
        client: order.client,
        city: order.city,
        country: order.country,
        total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
        pay: order.pay,
        method: order.method,
        status: order.status,
        courier: order.courier,
        tracking: order.tracking,
        createdAt: new Date(order.date),
        items: { create: items },
      },
    });
  }

  // Bannières : réécrites à chaque seed (pas de clé naturelle).
  await prisma.banner.deleteMany();
  await prisma.banner.createMany({
    data: [
      {
        title: "Nouvelle collection — tote bags en toile",
        slot: "HERO",
        target: "TOUTES",
        start: new Date("2026-08-01"),
        end: new Date("2026-12-31"),
        active: true,
        image: firstImage("tote-bag-velours-cotele", "noir-marron"),
      },
      {
        title: "Livraison offerte dès 75 000 FCFA",
        slot: "BANDEAU_PROMO",
        target: "TOUTES",
        start: new Date("2026-08-01"),
        end: new Date("2026-12-31"),
        active: true,
        image: firstImage("fourre-tout-toile-epaisse", "gris"),
      },
      {
        title: "−10 % sur la première commande · BIENVENUE10",
        slot: "POPUP",
        target: "MOBILE",
        start: new Date("2026-08-01"),
        end: new Date("2026-12-31"),
        active: false,
        image: firstImage("sac-main-patchwork-pu", "rose"),
      },
    ],
  });
}

async function main() {
  await seedCatalog();
  await seedOperations();
  await seedDemo();

  const [productCount, variantCount, imageCount] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { active: true } }),
    prisma.productImage.count(),
  ]);

  console.log(`Catalogue : ${productCount} produits, ${variantCount} variantes, ${imageCount} images.`);
  console.log(`Médias    : ${usingCloudinary ? "Cloudinary" : "fichiers locaux (front/public/products)"}.`);
  if (!usingCloudinary) console.log("Astuce    : lancez `npm run media:upload` pour basculer sur Cloudinary.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
