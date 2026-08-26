import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const reviewRepository = {
  findAll: () => prisma.review.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } }),
  findById: (id: string) => prisma.review.findUnique({ where: { id }, include: { product: true } }),
  create: (data: Prisma.ReviewCreateInput) => prisma.review.create({ data, include: { product: true } }),
  update: (id: string, data: Prisma.ReviewUpdateInput) => prisma.review.update({ where: { id }, data, include: { product: true } }),
};
