import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const bannerRepository = {
  findAll: () => prisma.banner.findMany({ orderBy: { start: "desc" } }),
  findById: (id: string) => prisma.banner.findUnique({ where: { id } }),
  create: (data: Prisma.BannerCreateInput) => prisma.banner.create({ data }),
  update: (id: string, data: Prisma.BannerUpdateInput) => prisma.banner.update({ where: { id }, data }),
  remove: (id: string) => prisma.banner.delete({ where: { id } }),
};
