import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

const include = { items: true } satisfies Prisma.OrderInclude;

export const orderRepository = {
  findAll: (where: Prisma.OrderWhereInput, orderBy: Prisma.OrderOrderByWithRelationInput, skip: number, take: number) =>
    prisma.order.findMany({ where, include, orderBy, skip, take }),

  /** Sans pagination : reserve a l'export CSV du back-office. */
  findAllUnpaged: (where: Prisma.OrderWhereInput, orderBy: Prisma.OrderOrderByWithRelationInput) =>
    prisma.order.findMany({ where, include, orderBy }),

  count: (where: Prisma.OrderWhereInput) => prisma.order.count({ where }),

  findByUserId: (userId: string) =>
    prisma.order.findMany({ where: { userId }, include, orderBy: { createdAt: "desc" } }),

  findById: (id: string) => prisma.order.findUnique({ where: { id }, include }),

  create: (data: Prisma.OrderCreateInput) => prisma.order.create({ data, include }),

  update: (id: string, data: Prisma.OrderUpdateInput) => prisma.order.update({ where: { id }, data, include }),

  /**
   * Création de commande + décrément du stock dans une seule transaction.
   * Sans elle, une commande pourrait être enregistrée sans que le stock bouge :
   * on vendrait deux fois le dernier article.
   */
  createWithStockMovement: (
    order: Prisma.OrderCreateInput,
    lines: { variantId: string; qty: number; label: string }[],
    promoCode?: string | null,
  ) =>
    prisma.$transaction(async (tx) => {
      const created = await tx.order.create({ data: order, include });

      for (const line of lines) {
        await tx.stock.update({ where: { variantId: line.variantId }, data: { qty: { decrement: line.qty } } });
        await tx.stockMovement.create({
          data: {
            variantId: line.variantId,
            type: "VENTE",
            qty: -line.qty,
            reason: `Commande ${created.id}`,
            author: "Système",
          },
        });
      }

      // Le compteur d'utilisation du code promo appartient a la meme
      // transaction que la vente : un code a quota 1 ne peut pas etre
      // consomme deux fois par deux commandes simultanees.
      if (promoCode) {
        await tx.promo.update({ where: { code: promoCode }, data: { used: { increment: 1 } } });
      }

      return created;
    }),
};
