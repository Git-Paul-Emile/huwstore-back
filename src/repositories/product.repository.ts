import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

/**
 * Une seule définition de l'include, partagée par toutes les lectures :
 * le service reçoit donc toujours la même forme d'objet, et le DTO n'a jamais
 * à gérer une relation « parfois chargée ».
 *
 * Pas de `select` restrictif ici : le DTO produit (`product.service.ts`)
 * consomme la quasi-totalité des colonnes scalaires. « Éviter SELECT * »
 * (rules/database.md) vise les colonnes inutiles ; quand tout est utilisé,
 * énumérer les champs n'apporterait que de la fragilité. Les lectures qui,
 * elles, n'ont besoin que d'un sous-ensemble portent un `select` explicite
 * (voir `findActiveVariantsForPricing`, `findIndexableForSitemap`).
 */
const include = {
  category: true,
  variants: {
    where: { active: true },
    orderBy: { position: "asc" },
    include: {
      stock: true,
      images: { orderBy: { position: "asc" } },
    },
  },
  images: { orderBy: { position: "asc" } },
} satisfies Prisma.ProductInclude;

/** Forme exacte renvoyée par toutes les lectures ci-dessous. */
export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof include }>;

export const productRepository = {
  findAll: (
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput | undefined,
    skip: number,
    take: number,
  ) => prisma.product.findMany({ where, include, orderBy, skip, take }),

  count: (where: Prisma.ProductWhereInput) => prisma.product.count({ where }),

  findById: (id: string) => prisma.product.findUnique({ where: { id }, include }),

  findBySlug: (slug: string) => prisma.product.findUnique({ where: { slug }, include }),

  create: (data: Prisma.ProductCreateInput) => prisma.product.create({ data, include }),

  update: (id: string, data: Prisma.ProductUpdateInput) => prisma.product.update({ where: { id }, data, include }),

  remove: (id: string) => prisma.product.delete({ where: { id } }),

  /** Liste des valeurs distinctes utilisées comme facettes de filtre côté boutique. */
  distinctMaterials: () =>
    prisma.product.findMany({ where: { active: true }, select: { material: true }, distinct: ["material"] }),

  distinctColors: () =>
    prisma.productVariant.findMany({
      where: { active: true, product: { active: true } },
      select: { colorName: true, colorSlug: true, hex: true },
      distinct: ["colorSlug"],
      orderBy: { colorSlug: "asc" },
    }),

  /** Bornes de prix du catalogue actif : elles alimentent le curseur de filtre. */
  priceBounds: () =>
    prisma.product.aggregate({ where: { active: true }, _min: { price: true }, _max: { price: true } }),

  /**
   * Déclinaisons actives d'une liste d'identifiants, avec le strict nécessaire
   * au calcul d'un panier : le produit parent (prix, nom, statut) et le stock.
   * Utilisé par le pricing pour figer les prix côté serveur.
   */
  findActiveVariantsForPricing: (variantIds: string[]) =>
    prisma.productVariant.findMany({
      where: { id: { in: variantIds }, active: true },
      select: {
        id: true,
        colorName: true,
        stock: { select: { qty: true } },
        product: { select: { id: true, name: true, price: true, active: true } },
      },
    }),

  /**
   * Catalogue exposé au sitemap : uniquement les fiches indexables. On renvoie
   * `id` (et non `slug`) car c'est lui qui figure dans l'URL publique
   * `/produit/:id`, donc dans l'URL canonique.
   */
  findIndexableForSitemap: () =>
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
};
