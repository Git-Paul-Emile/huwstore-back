import { prisma } from "../config/database.js";

export const statsRepository = {
  ordersSince: (since: Date) =>
    prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
  orderItemsSince: (since: Date) =>
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: since } } },
      select: { qty: true, price: true, product: { select: { category: { select: { name: true } } } } },
    }),
  pendingOrdersCount: () => prisma.order.count({ where: { status: "EN_PREPARATION" } }),
  // Le stock vit désormais sur la déclinaison : on ne compte que celles
  // qui appartiennent à un produit encore en vente.
  allStockLevels: () =>
    prisma.stock.findMany({
      where: { variant: { active: true, product: { active: true } } },
      select: { qty: true, threshold: true },
    }),
  /**
   * Meilleures ventes, agregees sur les LIGNES de commande : c'est la quantite
   * reellement vendue qui classe, pas le nombre d'avis ni la date d'ajout.
   * On regroupe par produit et non par declinaison : la cliente veut savoir
   * quel modele part, pas quel coloris.
   */
  topProductsSince: (since: Date, take: number) =>
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: since }, status: { not: "RETOURNEE" } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take,
    }),

  productsByIds: (ids: string[]) =>
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        slug: true,
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    }),

  newClientsSince: (since: Date) => prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: since } } }),
  revenueSince: (since: Date) =>
    prisma.order.aggregate({ where: { createdAt: { gte: since } }, _sum: { total: true } }),
};
