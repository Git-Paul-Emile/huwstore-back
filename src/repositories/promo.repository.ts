import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const promoRepository = {
  findAll: () => prisma.promo.findMany({ orderBy: { end: "desc" } }),
  findById: (id: string) => prisma.promo.findUnique({ where: { id } }),
  findByCode: (code: string) => prisma.promo.findUnique({ where: { code } }),
  create: (data: Prisma.PromoCreateInput) => prisma.promo.create({ data }),
  update: (id: string, data: Prisma.PromoUpdateInput) => prisma.promo.update({ where: { id }, data }),
  remove: (id: string) => prisma.promo.delete({ where: { id } }),
};
