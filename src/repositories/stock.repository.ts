import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

/**
 * Le stock est tenu au niveau de la DÉCLINAISON (couleur), pas du produit :
 * c'est la seule maille qui corresponde à ce qu'on met réellement en carton.
 */
const variantInclude = {
  variant: { include: { product: { select: { id: true, name: true } } } },
} satisfies Prisma.StockInclude;

export const stockRepository = {
  findAllStock: () =>
    prisma.stock.findMany({
      include: variantInclude,
      orderBy: [{ variant: { product: { name: "asc" } } }, { variant: { position: "asc" } }],
    }),

  findMovements: (take = 100) =>
    prisma.stockMovement.findMany({
      include: { variant: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take,
    }),

  findVariantById: (variantId: string) =>
    prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { name: true } }, stock: true } }),

  findVariantBySku: (sku: string) =>
    prisma.productVariant.findUnique({ where: { sku }, include: { product: { select: { name: true } }, stock: true } }),

  /**
   * Mouvement et niveau de stock sont écrits dans UNE transaction : un
   * mouvement enregistré sans son ajustement (ou l'inverse) rendrait
   * l'inventaire faux et impossible à auditer.
   */
  applyMovement: (data: Prisma.StockMovementUncheckedCreateInput, threshold: number) =>
    prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({ data });
      const stock = await tx.stock.upsert({
        where: { variantId: data.variantId },
        create: { variantId: data.variantId, qty: Math.max(0, data.qty), threshold },
        update: { qty: { increment: data.qty } },
      });
      return { movement, stock };
    }),
};
