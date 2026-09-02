import { prisma } from "../config/database.js";
import type { BannerSlot, Prisma } from "@prisma/client";

/**
 * Cibles du bouton chargees avec la banniere : le nom de la categorie et
 * l'identifiant du produit suffisent au service pour reconstruire l'URL, sans
 * requete supplementaire par banniere.
 */
const linkInclude = {
  linkCategory: { select: { name: true } },
  linkProduct: { select: { id: true } },
} satisfies Prisma.BannerInclude;

export type BannerWithLink = Prisma.BannerGetPayload<{ include: typeof linkInclude }>;

export const bannerRepository = {
  /**
   * Tri d'affichage : l'ordre voulu par la boutique d'abord (position), puis
   * la plus recente. Le back-office reordonne donc ses bannieres sans toucher
   * aux dates de diffusion.
   */
  findAll: (where: Prisma.BannerWhereInput = {}) =>
    prisma.banner.findMany({ where, orderBy: [{ position: "asc" }, { start: "desc" }], include: linkInclude }),

  findById: (id: string) => prisma.banner.findUnique({ where: { id }, include: linkInclude }),
  create: (data: Prisma.BannerCreateInput) => prisma.banner.create({ data, include: linkInclude }),
  update: (id: string, data: Prisma.BannerUpdateInput) =>
    prisma.banner.update({ where: { id }, data, include: linkInclude }),
  remove: (id: string) => prisma.banner.delete({ where: { id } }),

  /**
   * Bannieres actives d'un emplacement dont la fenetre de diffusion chevauche
   * [start, end] - sert a plafonner le nombre de campagnes simultanees sur un
   * emplacement qui n'en affiche qu'une.
   */
  countOverlappingInSlot: (slot: BannerSlot, start: Date, end: Date, excludeId?: string) =>
    prisma.banner.count({
      where: {
        slot,
        active: true,
        start: { lte: end },
        end: { gte: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
};
