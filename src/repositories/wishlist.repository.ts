import { prisma } from "../config/database.js";

export const wishlistRepository = {
  findByUser: (userId: string) =>
    prisma.wishlistItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { productId: true } }),

  add: (userId: string, productId: string) =>
    // upsert plutot que create : ajouter deux fois le meme favori doit etre
    // sans effet, pas une erreur 409 que le front devrait rattraper.
    prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    }),

  remove: (userId: string, productId: string) =>
    prisma.wishlistItem.deleteMany({ where: { userId, productId } }),

  /** Fusion de la liste locale d'un visiteur au moment ou il se connecte. */
  merge: (userId: string, productIds: string[]) =>
    prisma.wishlistItem.createMany({
      data: productIds.map((productId) => ({ userId, productId })),
      skipDuplicates: true,
    }),
};
