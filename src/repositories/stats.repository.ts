import { prisma } from "../config/database.js";

export const statsRepository = {
  ordersSince: (since: Date) => prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
  orderItemsSince: (since: Date) =>
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: since } } },
      select: { qty: true, price: true, product: { select: { category: { select: { name: true } } } } },
    }),
  pendingOrdersCount: () => prisma.order.count({ where: { status: "EN_PREPARATION" } }),
  allStockLevels: () => prisma.stock.findMany({ select: { qty: true, threshold: true } }),
  newClientsSince: (since: Date) => prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: since } } }),
  revenueSince: (since: Date) => prisma.order.aggregate({ where: { createdAt: { gte: since } }, _sum: { total: true } }),
};
