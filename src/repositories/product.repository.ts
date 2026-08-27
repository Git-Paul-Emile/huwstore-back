import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

/**
 * Une seule définition de l'include, partagée par toutes les lectures :
 * le service reçoit donc toujours la même forme d'objet, et le DTO n'a jamais
 * à gérer une relation « parfois chargée ».
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
};
