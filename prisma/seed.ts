// Réinjecte en base le contenu qui était codé en dur dans front/src/data.ts et
// front/src/admin-data.ts, pour que la maquette initiale devienne de vraies données.
import { PrismaClient, type ProductBadge, type PayMethod, type PayStatus, type OrderStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const unsplash = (id: string, w = 900, h = 1100) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;

const categories = [
  { name: "Toile & Coton", img: "1594223274512-ad4803739b7c" },
  { name: "Cuir PU", img: "1637759292654-a12cb2be085e" },
  { name: "Oxford", img: "1691480150204-66dd1eb77391" },
  { name: "Mini Sacs", img: "1705909237050-7a7625b47fac" },
  { name: "Sacs à dos", img: "1596552639068-99bd471b579c" },
  { name: "Voyage & Maternité", img: "1597633244018-0201d0158aab" },
  { name: "Pochettes", img: "1575403538007-acb790100421" },
];

const products = [
  { id: "colette", name: "Sac Colette", collection: "Maison Aurélie", category: "Mini Sacs", material: "Cuir pleine fleur", color: "Fauve", price: 59000, badge: "NOUVEAU" as ProductBadge, rating: 5, reviewsCount: 42, image: unsplash("1637759292654-a12cb2be085e"), imageAlt: "Sac à main en cuir fauve avec longue bandoulière", imageHover: unsplash("1597633125184-9fd7e54f0ff7"), stock: { qty: 24, threshold: 6 } },
  { id: "margaux", name: "Cabas Margaux", collection: "Maison Aurélie", category: "Voyage & Maternité", material: "Toile enduite", color: "Grège", price: 42000, compareAt: 52000, badge: "PROMO" as ProductBadge, rating: 4, reviewsCount: 28, image: unsplash("1594223274512-ad4803739b7c"), imageAlt: "Cabas en toile posé sur un sac en cuir noir", imageHover: unsplash("1683921470299-b8f0f3331657"), stock: { qty: 8, threshold: 10 } },
  { id: "solene", name: "Pochette Solène", collection: "Atelier Rive", category: "Pochettes", material: "Cuir grainé", color: "Gris orage", price: 28000, badge: null, rating: 5, reviewsCount: 61, image: unsplash("1575403538007-acb790100421"), imageAlt: "Pochette en cuir gris posée sur une pile de livres", imageHover: unsplash("1683921470299-b8f0f3331657"), stock: { qty: 41, threshold: 8 } },
  { id: "noir-lucien", name: "Sac Lucien", collection: "Atelier Rive", category: "Cuir PU", material: "Cuir façon box", color: "Noir", price: 64000, badge: "RUPTURE" as ProductBadge, rating: 5, reviewsCount: 37, image: unsplash("1702325107940-88f9cd4468c2"), imageAlt: "Sac à main noir posé sur une table", imageHover: unsplash("1705909237050-7a7625b47fac"), stock: { qty: 0, threshold: 5 } },
  { id: "aurore", name: "Sac Aurore", collection: "Maison Aurélie", category: "Cuir PU", material: "Cuir nappa", color: "Ivoire", price: 72000, badge: "NOUVEAU" as ProductBadge, rating: 5, reviewsCount: 19, image: unsplash("1682745230951-8a5aa9a474a0"), imageAlt: "Sac ivoire posé sur une table claire", imageHover: unsplash("1596552639068-99bd471b579c"), stock: { qty: 3, threshold: 6 } },
  { id: "camille", name: "Besace Camille", collection: "Atelier Rive", category: "Oxford", material: "Cuir vieilli", color: "Cognac", price: 48000, compareAt: 56000, badge: "PROMO" as ProductBadge, rating: 4, reviewsCount: 53, image: unsplash("1691480150204-66dd1eb77391"), imageAlt: "Besace en cuir cognac sur fond blanc", imageHover: unsplash("1637759292654-a12cb2be085e"), stock: { qty: 17, threshold: 8 } },
  { id: "eloise", name: "Sac à dos Éloïse", collection: "Maison Aurélie", category: "Sacs à dos", material: "Toile & cuir", color: "Vert bouteille", price: 54000, badge: null, rating: 5, reviewsCount: 24, image: unsplash("1596552639068-99bd471b579c"), imageAlt: "Sac en cuir près d'un vase de fleurs blanches", imageHover: unsplash("1597633244018-0201d0158aab"), stock: { qty: 12, threshold: 6 } },
  { id: "juliette", name: "Mini Juliette", collection: "Atelier Rive", category: "Mini Sacs", material: "Cuir grainé", color: "Bordeaux", price: 35000, badge: "NOUVEAU" as ProductBadge, rating: 5, reviewsCount: 46, image: unsplash("1705909237050-7a7625b47fac"), imageAlt: "Petit sac en cuir sur fond coloré", imageHover: unsplash("1702325107940-88f9cd4468c2"), stock: { qty: 29, threshold: 8 } },
  { id: "victoire", name: "Cabas Victoire", collection: "Maison Aurélie", category: "Voyage & Maternité", material: "Toile & cuir", color: "Écru", price: 46000, badge: null, rating: 5, reviewsCount: 33, image: unsplash("1597633244018-0201d0158aab"), imageAlt: "Grand cabas en toile et cuir", imageHover: unsplash("1594223274512-ad4803739b7c"), stock: { qty: 20, threshold: 6 } },
  { id: "romane", name: "Sac Romane", collection: "Atelier Rive", category: "Oxford", material: "Cuir grainé", color: "Taupe", price: 52000, compareAt: 61000, badge: "PROMO" as ProductBadge, rating: 4, reviewsCount: 39, image: unsplash("1683921470299-b8f0f3331657"), imageAlt: "Sac en cuir taupe posé sur un tabouret", imageHover: unsplash("1691480150204-66dd1eb77391"), stock: { qty: 15, threshold: 6 } },
  { id: "capucine", name: "Pochette Capucine", collection: "Maison Aurélie", category: "Pochettes", material: "Cuir nappa", color: "Nude", price: 31000, badge: "NOUVEAU" as ProductBadge, rating: 5, reviewsCount: 21, image: unsplash("1597633125184-9fd7e54f0ff7"), imageAlt: "Pochette en cuir nude tenue à la main", imageHover: unsplash("1575403538007-acb790100421"), stock: { qty: 26, threshold: 6 } },
  { id: "adele", name: "Sac à dos Adèle", collection: "Atelier Rive", category: "Sacs à dos", material: "Cuir vieilli", color: "Cognac", price: 58000, badge: null, rating: 5, reviewsCount: 28, image: unsplash("1596552639068-99bd471b579c"), imageAlt: "Sac à dos en cuir cognac", imageHover: unsplash("1682745230951-8a5aa9a474a0"), stock: { qty: 18, threshold: 6 } },
];

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

const clients = [
  { name: "Awa Ndiaye", phone: "+221778124490", email: "awa.n@mail.com", city: "Dakar", since: "2024-11-03" },
  { name: "Fatou Bamba", phone: "+225074522180", email: "fatou.b@mail.com", city: "Abidjan", since: "2025-02-19" },
  { name: "Marième Sow", phone: "+221763301107", email: "marieme@mail.com", city: "Dakar", since: "2025-01-22" },
  { name: "Grace Mbala", phone: "+237699401233", email: "grace.m@mail.com", city: "Douala", since: "2025-06-08" },
  { name: "Aïcha Traoré", phone: "+223762188400", email: "aicha.t@mail.com", city: "Bamako", since: "2026-08-14" },
  { name: "Nadège Kouassi", phone: "+229975530210", email: "nadege@mail.com", city: "Cotonou", since: "2024-09-30" },
];

const orders = [
  { id: "CMD-2418", client: "Awa Ndiaye", city: "Dakar", country: "Sénégal", items: [{ productId: "colette", qty: 1 }], pay: "PAYE" as PayStatus, method: "WAVE" as PayMethod, status: "EN_COURS_DE_LIVRAISON" as OrderStatus, courier: "Livreur interne · Moussa", tracking: "MW-DK-0091", date: "2026-08-22" },
  { id: "CMD-2417", client: "Fatou Bamba", city: "Abidjan", country: "Côte d'Ivoire", items: [{ productId: "aurore", qty: 1 }, { productId: "juliette", qty: 1 }], pay: "EN_ATTENTE" as PayStatus, method: "ORANGE_MONEY" as PayMethod, status: "EN_PREPARATION" as OrderStatus, courier: null, tracking: null, date: "2026-08-22" },
  { id: "CMD-2416", client: "Marième Sow", city: "Dakar", country: "Sénégal", items: [{ productId: "solene", qty: 2 }], pay: "PAYE" as PayStatus, method: "COD" as PayMethod, status: "EXPEDIEE" as OrderStatus, courier: "DHL Express", tracking: "DHL-77120945", date: "2026-08-21" },
  { id: "CMD-2415", client: "Grace Mbala", city: "Douala", country: "Cameroun", items: [{ productId: "camille", qty: 1 }], pay: "PAYE" as PayStatus, method: "WAVE" as PayMethod, status: "LIVREE" as OrderStatus, courier: "Prestataire · Chronopost", tracking: "CH-CM-4402", date: "2026-08-19" },
  { id: "CMD-2414", client: "Aïcha Traoré", city: "Bamako", country: "Mali", items: [{ productId: "eloise", qty: 1 }], pay: "ECHOUE" as PayStatus, method: "ORANGE_MONEY" as PayMethod, status: "EN_PREPARATION" as OrderStatus, courier: null, tracking: null, date: "2026-08-19" },
  { id: "CMD-2413", client: "Nadège Kouassi", city: "Cotonou", country: "Bénin", items: [{ productId: "margaux", qty: 1 }], pay: "PAYE" as PayStatus, method: "CARTE" as PayMethod, status: "RETOURNEE" as OrderStatus, courier: "Prestataire · Chronopost", tracking: "CH-BJ-1180", date: "2026-08-17" },
];

const banners = [
  { title: "Nouveautés Automne — le cuir fauve", slot: "HERO" as const, target: "TOUTES" as const, start: "2026-08-01", end: "2026-09-15", active: true, image: unsplash("1637759292654-a12cb2be085e") },
  { title: "Livraison offerte dès 75 000 FCFA", slot: "BANDEAU_PROMO" as const, target: "TOUTES" as const, start: "2026-08-10", end: "2026-08-31", active: true, image: unsplash("1594223274512-ad4803739b7c") },
  { title: "-10% première commande · BIENVENUE10", slot: "POPUP" as const, target: "MOBILE" as const, start: "2026-08-15", end: "2026-09-30", active: false, image: unsplash("1575403538007-acb790100421") },
];

const promos = [
  { code: "BIENVENUE10", type: "POURCENTAGE" as const, value: 10, minCart: 0, used: 214, limit: 1000, end: "2026-12-31", active: true },
  { code: "LIVRAISON0", type: "LIVRAISON_OFFERTE" as const, value: 0, minCart: 50000, used: 88, limit: 500, end: "2026-09-30", active: true },
  { code: "RENTREE5000", type: "MONTANT_FIXE" as const, value: 5000, minCart: 60000, used: 47, limit: 300, end: "2026-09-15", active: false },
];

const reviews = [
  { productId: "colette", author: "Awa N.", rating: 5, text: "Cuir superbe, finitions impeccables. Livrée à Dakar en 24h.", status: "EN_ATTENTE" as const },
  { productId: "solene", author: "Marième S.", rating: 4, text: "Très jolie, un peu plus petite que prévu.", status: "EN_ATTENTE" as const },
  { productId: "camille", author: "Grace M.", rating: 5, text: "Parfaite pour le quotidien, je recommande.", status: "PUBLIE" as const },
  { productId: "aurore", author: "Anonyme", rating: 2, text: "Reçu avec du retard.", status: "REJETE" as const },
];

const stockMoves = [
  { productId: "colette", type: "VENTE" as const, qty: -1, reason: "Commande CMD-2418", author: "Système" },
  { productId: "margaux", type: "ENTREE" as const, qty: 20, reason: "Réassort atelier", author: "A. Diallo" },
  { productId: "noir-lucien", type: "AJUSTEMENT" as const, qty: -2, reason: "Casse (inventaire)", author: "A. Diallo" },
  { productId: "aurore", type: "SORTIE" as const, qty: -3, reason: "Retour fournisseur", author: "M. Fall" },
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, image: unsplash(c.img, 500, 620) },
    });
    categoryIds.set(c.name, category.id);
  }

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        collection: p.collection,
        categoryId: categoryIds.get(p.category)!,
        material: p.material,
        color: p.color,
        price: p.price,
        compareAt: p.compareAt,
        badge: p.badge,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        image: p.image,
        imageAlt: p.imageAlt,
        imageHover: p.imageHover,
        stock: { create: p.stock },
      },
    });
  }

  for (const z of deliveryZones) {
    await prisma.deliveryZone.upsert({
      where: { city_country: { city: z.city, country: z.country } },
      update: {},
      create: z,
    });
  }

  const demoPasswordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { phone: "+221709666259" },
    update: {},
    create: { name: "Admin MW Store", phone: "+221709666259", email: "admin@mwstore.com", passwordHash: demoPasswordHash, role: "ADMIN" },
  });

  const clientIds = new Map<string, string>();
  for (const c of clients) {
    const user = await prisma.user.upsert({
      where: { phone: c.phone },
      update: {},
      create: { name: c.name, phone: c.phone, email: c.email, city: c.city, passwordHash: demoPasswordHash, createdAt: new Date(c.since) },
    });
    clientIds.set(c.name, user.id);
  }

  for (const o of orders) {
    const items = o.items.map((line) => {
      const product = products.find((p) => p.id === line.productId)!;
      return { productId: product.id, name: product.name, qty: line.qty, price: product.price };
    });
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        userId: clientIds.get(o.client),
        client: o.client,
        city: o.city,
        country: o.country,
        total,
        pay: o.pay,
        method: o.method,
        status: o.status,
        courier: o.courier,
        tracking: o.tracking,
        createdAt: new Date(o.date),
        items: { create: items },
      },
    });
  }

  for (const b of banners) {
    await prisma.banner.create({ data: { ...b, start: new Date(b.start), end: new Date(b.end) } });
  }

  for (const p of promos) {
    await prisma.promo.upsert({ where: { code: p.code }, update: {}, create: { ...p, end: new Date(p.end) } });
  }

  for (const r of reviews) {
    await prisma.review.create({ data: r });
  }

  for (const m of stockMoves) {
    await prisma.stockMovement.create({ data: m });
  }

  console.log("Base huwstore réinitialisée avec les données de la maquette.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
