import { prisma, TX_OPTIONS } from "../config/database.js";
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

  existsById: async (id: string) => (await prisma.product.count({ where: { id } })) > 0,

  findBySlug: (slug: string) => prisma.product.findUnique({ where: { slug }, include }),

  create: (data: Prisma.ProductCreateInput) => prisma.product.create({ data, include }),

  update: (id: string, data: Prisma.ProductUpdateInput) => prisma.product.update({ where: { id }, data, include }),

  /**
   * Mise à jour de la fiche ET de ses coloris dans une seule transaction.
   * Le plan est calculé par le service ; le dépôt se contente de l'exécuter
   * atomiquement, galerie comprise. Un coloris existant est repéré par son `id`
   * (on peut donc renommer son coloris) ; un nouveau est repéré par son slug
   * (upsert, pour ré-activer un coloris précédemment archivé au lieu d'échouer).
   */
  updateWithVariants: (
    id: string,
    productData: Prisma.ProductUpdateInput,
    plan: {
      productName: string;
      archiveIds: string[];
      variants: {
        id?: string;
        colorName: string;
        colorSlug: string;
        hex: string;
        hexSecondary: string | null;
        position: number;
        threshold: number;
        images: string[];
      }[];
    },
  ) =>
    prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productData });

      if (plan.archiveIds.length > 0) {
        await tx.productVariant.updateMany({ where: { id: { in: plan.archiveIds } }, data: { active: false } });
      }

      for (const variant of plan.variants) {
        const common = {
          colorName: variant.colorName,
          colorSlug: variant.colorSlug,
          hex: variant.hex,
          hexSecondary: variant.hexSecondary,
          position: variant.position,
          active: true,
        };

        const saved = variant.id
          ? await tx.productVariant.update({
              where: { id: variant.id },
              data: { ...common, stock: { update: { threshold: variant.threshold } } },
            })
          : await tx.productVariant.upsert({
              where: { productId_colorSlug: { productId: id, colorSlug: variant.colorSlug } },
              create: {
                ...common,
                productId: id,
                sku: `HUW-${id.toUpperCase()}-${variant.colorSlug.toUpperCase()}`,
                stock: { create: { qty: 0, threshold: variant.threshold } },
              },
              update: { ...common, stock: { update: { threshold: variant.threshold } } },
            });

        // La galerie reflète exactement ce que l'admin a laissé à l'écran : on
        // repart d'une table propre plutôt que de diffuser image par image.
        await tx.productImage.deleteMany({ where: { variantId: saved.id } });
        if (variant.images.length > 0) {
          await tx.productImage.createMany({
            data: variant.images.map((url, index) => ({
              productId: id,
              variantId: saved.id,
              url,
              alt: `${plan.productName} - coloris ${variant.colorName}`,
              position: variant.position * 100 + index,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({ where: { id }, include });
    }, TX_OPTIONS),

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
