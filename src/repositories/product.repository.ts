import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

const include = { category: true, stock: true } satisfies Prisma.ProductInclude;

export const productRepository = {
  findAll: (where: Prisma.ProductWhereInput, orderBy?: Prisma.ProductOrderByWithRelationInput) =>
    prisma.product.findMany({ where, include, orderBy }),
  findById: (id: string) => prisma.product.findUnique({ where: { id }, include }),
  create: (data: Prisma.ProductCreateInput) => prisma.product.create({ data, include }),
  update: (id: string, data: Prisma.ProductUpdateInput) => prisma.product.update({ where: { id }, data, include }),
  remove: (id: string) => prisma.product.delete({ where: { id } }),
  upsertStock: (productId: string, qty: number, threshold: number) =>
    prisma.stock.upsert({
      where: { productId },
      create: { productId, qty, threshold },
      update: { qty, threshold },
    }),
};
