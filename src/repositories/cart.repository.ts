import { prisma } from "../config/database.js";

export const cartRepository = {
  findByUser: (userId: string) =>
    prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { variantId: true, qty: true, variant: { select: { productId: true } } },
    }),

  // upsert plutot que create : ajouter deux fois la meme declinaison
  // incremente la quantite au lieu d'echouer sur la contrainte unique.
  upsertAdd: (userId: string, variantId: string, qty: number) =>
    prisma.cartItem.upsert({
      where: { userId_variantId: { userId, variantId } },
      create: { userId, variantId, qty },
      update: { qty: { increment: qty } },
    }),

  setQty: (userId: string, variantId: string, qty: number) =>
    prisma.cartItem.updateMany({ where: { userId, variantId }, data: { qty } }),

  remove: (userId: string, variantId: string) => prisma.cartItem.deleteMany({ where: { userId, variantId } }),

  /** Vidage complet, appelé une fois la commande enregistrée. */
  clear: (userId: string) => prisma.cartItem.deleteMany({ where: { userId } }),

  /**
   * Fusion du panier local d'une visiteuse a la connexion : les lignes deja
   * presentes en base additionnent leur quantite plutot que d'etre ecrasees,
   * une transaction pour que la fusion reussisse ou echoue en bloc.
   */
  merge: (userId: string, lines: { variantId: string; qty: number }[]) =>
    prisma.$transaction(
      lines.map((line) =>
        prisma.cartItem.upsert({
          where: { userId_variantId: { userId, variantId: line.variantId } },
          create: { userId, variantId: line.variantId, qty: line.qty },
          update: { qty: { increment: line.qty } },
        }),
      ),
    ),
};
