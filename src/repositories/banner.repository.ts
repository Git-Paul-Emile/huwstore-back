import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const bannerRepository = {
  /**
   * Tri d'affichage : l'ordre voulu par la boutique d'abord (position), puis
   * la plus recente. Le back-office reordonne donc son carrousel sans toucher
   * aux dates de diffusion.
   */
  findAll: (where: Prisma.BannerWhereInput = {}) =>
    prisma.banner.findMany({ where, orderBy: [{ position: "asc" }, { start: "desc" }] }),

  findById: (id: string) => prisma.banner.findUnique({ where: { id } }),
  create: (data: Prisma.BannerCreateInput) => prisma.banner.create({ data }),
  update: (id: string, data: Prisma.BannerUpdateInput) => prisma.banner.update({ where: { id }, data }),
  remove: (id: string) => prisma.banner.delete({ where: { id } }),

  /**
   * Bannieres Hero actives dont la fenetre de diffusion chevauche [start, end] -
   * sert a plafonner le carrousel a deux campagnes simultanees (le tout premier
   * slide, fixe, vit dans le code du front et n'est jamais compte ici).
   */
  countOverlappingHero: (start: Date, end: Date, excludeId?: string) =>
    prisma.banner.count({
      where: {
        slot: "HERO",
        active: true,
        start: { lte: end },
        end: { gte: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
};
