import { prisma } from "../config/database.js";
import type { Prisma, ProductOptionKind } from "@prisma/client";

export const productOptionRepository = {
  findAll: (kind?: ProductOptionKind) =>
    prisma.productOption.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: "asc" }, { position: "asc" }, { label: "asc" }],
    }),

  findById: (id: string) => prisma.productOption.findUnique({ where: { id } }),

  findByKindAndLabel: (kind: ProductOptionKind, label: string) =>
    prisma.productOption.findUnique({ where: { kind_label: { kind, label } } }),

  create: (data: Prisma.ProductOptionCreateInput) => prisma.productOption.create({ data }),

  update: (id: string, data: Prisma.ProductOptionUpdateInput) =>
    prisma.productOption.update({ where: { id }, data }),

  remove: (id: string) => prisma.productOption.delete({ where: { id } }),
};
