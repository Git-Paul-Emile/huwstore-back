import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const stockRepository = {
  findAllStock: () => prisma.stock.findMany({ include: { product: true }, orderBy: { product: { name: "asc" } } }),
  findMovements: () => prisma.stockMovement.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } }),
  findStockByProductId: (productId: string) => prisma.stock.findUnique({ where: { productId } }),
  createMovement: (data: Prisma.StockMovementCreateInput) => prisma.stockMovement.create({ data }),
  incrementStockQty: (productId: string, delta: number) =>
    prisma.stock.upsert({
      where: { productId },
      create: { productId, qty: Math.max(0, delta), threshold: 5 },
      update: { qty: { increment: delta } },
    }),
};
