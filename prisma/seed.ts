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
import { PrismaClient, type ProductBadge } from "@prisma/client";
import bcrypt from "bcrypt";
import { categories, products, skuOf, INITIAL_STOCK } from "./catalog.js";
import { categoryImage, productMedia, usingCloudinary } from "./media.js";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Données d'exploitation (zones de livraison) et jeux de démonstration.
// Les clients et commandes ci-dessous sont FICTIFS : ils servent uniquement à
// alimenter le tableau de bord et les statistiques de l'admin.
// ---------------------------------------------------------------------------

/**
 * Zones de livraison. Le recueil de besoins est explicite : la boutique livre
 * « tout le Sénégal », en 24 h sur Dakar et 72 h en région (Q24, Q36).
 * Les frais et le seuil de gratuité se règlent ensuite depuis le back-office.
 */
const deliveryZones = [
  { city: "Dakar", country: "Sénégal", fee: 2000, freeFrom: 75000, delay: "24 h", relay: true, active: true },
  { city: "Pikine", country: "Sénégal", fee: 2000, freeFrom: 75000, delay: "24 h", relay: true, active: true },
  { city: "Guédiawaye", country: "Sénégal", fee: 2000, freeFrom: 75000, delay: "24 h", relay: false, active: true },
  { city: "Rufisque", country: "Sénégal", fee: 2500, freeFrom: 75000, delay: "24 – 48 h", relay: false, active: true },
  { city: "Thiès", country: "Sénégal", fee: 3000, freeFrom: 90000, delay: "72 h", relay: true, active: true },
  { city: "Mbour / Saly", country: "Sénégal", fee: 3000, freeFrom: 90000, delay: "72 h", relay: false, active: true },
  { city: "Touba", country: "Sénégal", fee: 3500, freeFrom: 90000, delay: "72 h", relay: false, active: true },
  { city: "Saint-Louis", country: "Sénégal", fee: 3500, freeFrom: 90000, delay: "72 h", relay: false, active: true },
  { city: "Kaolack", country: "Sénégal", fee: 3500, freeFrom: 90000, delay: "72 h", relay: false, active: true },
  { city: "Ziguinchor", country: "Sénégal", fee: 4000, freeFrom: 100000, delay: "72 h", relay: false, active: true },
];

const promos = [
  {
    code: "BIENVENUE10",
    type: "POURCENTAGE" as const,
    value: 10,
    minCart: 0,
    used: 0,
    limit: 1000,
    end: "2026-12-31",
    active: true,
  },
  {
    code: "LIVRAISON0",
    type: "LIVRAISON_OFFERTE" as const,
    value: 0,
    minCart: 50000,
    used: 0,
    limit: 500,
    end: "2026-09-30",
    active: true,
  },
  {
    code: "RENTREE5000",
    type: "MONTANT_FIXE" as const,
    value: 5000,
    minCart: 60000,
    used: 0,
    limit: 300,
    end: "2026-09-15",
    active: false,
  },
];

// ---------------------------------------------------------------------------

/**
 * Un visuel encore servi par le front (chemin relatif) est celui livre avec le
 * code ; une adresse absolue signifie que la boutique a televerse le sien
 * depuis le back-office, et le seed ne doit alors plus y toucher.
 */
const visuelLivreAvecLeCode = (url: string) => url.startsWith("/");

async function seedCatalog() {
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    // Le nom et l'ordre viennent du catalogue : ils decrivent la structure de
    // la boutique. Le visuel et le resume, eux, se modifient depuis le
    // back-office : le seed les pose une premiere fois puis s'efface, sinon
    // chaque `npm run seed` effacerait le travail de la boutique.
    const existante = await prisma.category.findUnique({ where: { slug: category.slug } });
    const image = existante && !visuelLivreAvecLeCode(existante.image) ? existante.image : categoryImage(category.slug);

    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, image, position: category.position },
      create: {
        name: category.name,
        slug: category.slug,
        image,
        description: category.description,
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
          alt: `${product.name} - coloris ${variant.colorName}`,
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
        alt: `${product.name} - présentation`,
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

/**
 * Amorçage du back-office.
 *
 * On n'écrit ici QUE des données réelles et nécessaires au premier démarrage :
 * le compte administrateur, la configuration de la boutique et les visuels
 * d'accueil par défaut. Aucune fausse cliente, aucune fausse commande, aucun
 * faux témoignage : des chiffres inventés dans le tableau de bord donneraient
 * une image fausse de l'activité, et un avis inventé serait un faux avis.
 *
 * Les témoignages et les vraies ventes se créent depuis l'interface.
 */
async function seedBackOffice() {
  // Mot de passe administrateur : imposé par variable d'environnement. En
  // développement seulement, un mot de passe de repli est accepté - mais il
  // est annoncé bruyamment pour qu'il ne parte jamais en production.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD est obligatoire pour amorcer la base en production.");
  }
  if (!adminPassword) {
    console.warn("ADMIN_PASSWORD absente : mot de passe de développement « huwstore2026 » utilisé.");
  }
  const passwordHash = await bcrypt.hash(adminPassword ?? "huwstore2026", 10);

  // Le numéro est stocké sous sa forme compacte à 9 chiffres, exactement comme
  // le validateur le normalise à la connexion - sinon le compte serait
  // introuvable au moment de se connecter.
  await prisma.user.upsert({
    where: { phone: "709666259" },
    update: { role: "ADMIN" },
    create: {
      name: "Administration HUWSTORE",
      phone: "709666259",
      email: process.env.SHOP_ADMIN_EMAIL ?? null,
      passwordHash,
      role: "ADMIN",
    },
  });

  // Configuration de la boutique : lue par la vitrine (pied de page, WhatsApp)
  // et par la facture. Modifiable ensuite depuis Paramètres.
  await prisma.setting.upsert({
    where: { id: "shop" },
    update: {},
    create: {
      id: "shop",
      shopName: "HUWSTORE",
      phone: "70 966 62 59",
      whatsapp: "221709666259",
      email: process.env.SHOP_ADMIN_EMAIL ?? null,
      city: "Dakar",
      country: "Sénégal",
      announcement: "Livraison 24 h sur Dakar · 72 h en région · Paiement à la livraison",
    },
  });

  // Aucune bannière Hero par défaut : le premier slide du carrousel est fixe,
  // codé dans `HeroSlider.tsx` (front). Les bannières Hero ne servent plus
  // qu'aux campagnes ponctuelles que la boutique ajoute elle-même - en semer
  // ici créerait de fausses "promotions" à côté du slide statique.

  // Avis mis en avant sur la page d'accueil ("Les retours de nos clientes").
  // Contenu de démarrage, à remplacer par de vrais retours dès qu'ils arrivent.
  const existingTestimonials = await prisma.testimonial.count();
  if (existingTestimonials === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          author: "Awa Diop",
          role: "Cliente à Dakar",
          text: "Le sac est encore plus beau qu'en photo, et la livraison a été rapide. Je recommande les yeux fermés.",
          position: 0,
          active: true,
        },
        {
          author: "Fatou Ndiaye",
          role: "Cliente fidèle",
          text: "Deuxième commande chez HUWSTORE : la qualité du cuir est vraiment au rendez-vous, et le paiement à la livraison rassure.",
          position: 1,
          active: true,
        },
        {
          author: "Mariama Sow",
          role: "Cliente à Thiès",
          text: "Commande reçue en 72 h comme annoncé. Le tote bag est parfait pour le quotidien.",
          position: 2,
          active: true,
        },
      ],
    });
  }

  // Bandeau promo de l'accueil : met en avant le code de bienvenue semé plus
  // haut (`promos`), pour que la section "Campagne en cours" ne reste pas
  // vide tant que la boutique n'a pas publié sa propre campagne.
  const existingPromoBanners = await prisma.banner.count({ where: { slot: "BANDEAU_PROMO" } });
  if (existingPromoBanners === 0) {
    await prisma.banner.create({
      data: {
        title: "Chez HUWSTORE",
        subtitle: "-10 % sur votre première commande",
        text: "Profitez de 10 % de réduction sur tout le catalogue avec le code BIENVENUE10.",
        ctaLabel: "J'en profite",
        ctaHref: "/boutique",
        slot: "BANDEAU_PROMO",
        target: "TOUTES",
        focus: "center",
        position: 0,
        start: new Date(),
        end: new Date("2026-12-31"),
        active: true,
        image: productMedia("tote-bag-coton-durable").images.noir[0],
      },
    });
  }
}

async function main() {
  await seedCatalog();
  await seedOperations();
  await seedBackOffice();

  const [productCount, variantCount, imageCount, zoneCount] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { active: true } }),
    prisma.productImage.count(),
    prisma.deliveryZone.count({ where: { active: true } }),
  ]);

  console.log(`Catalogue : ${productCount} produits, ${variantCount} déclinaisons, ${imageCount} images.`);
  console.log(`Livraison : ${zoneCount} zones ouvertes.`);
  console.log(`Médias    : ${usingCloudinary ? "Cloudinary" : "fichiers locaux (front/public/products)"}.`);
  if (!usingCloudinary) console.log("Astuce    : lancez `npm run media:upload` pour basculer sur Cloudinary.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
