import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

const categoryListInclude = {
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

export type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof categoryListInclude }>;

export const categoryRepository = {
  findAll: () =>
    prisma.category.findMany({
      include: categoryListInclude,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
  findById: (id: string) => prisma.category.findUnique({ where: { id } }),
  existsById: async (id: string) => (await prisma.category.count({ where: { id } })) > 0,
  findByName: (name: string) => prisma.category.findUnique({ where: { name } }),
  findBySlug: (slug: string) => prisma.category.findUnique({ where: { slug } }),
  countProducts: (id: string) => prisma.product.count({ where: { categoryId: id } }),
  create: (data: Prisma.CategoryCreateInput) => prisma.category.create({ data }),
  update: (id: string, data: Prisma.CategoryUpdateInput) => prisma.category.update({ where: { id }, data }),
  remove: (id: string) => prisma.category.delete({ where: { id } }),
};
