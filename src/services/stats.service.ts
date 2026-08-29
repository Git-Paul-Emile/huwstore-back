import { statsRepository } from "../repositories/stats.repository.js";

const WEEKDAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_MS = 24 * 60 * 60 * 1000;

export const statsService = {
  async salesLast7Days() {
    const since = new Date(Date.now() - 7 * DAY_MS);
    const orders = await statsRepository.ordersSince(since);

    const totalsByDay = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * DAY_MS);
      totalsByDay.set(day.toDateString(), 0);
    }
    for (const order of orders) {
      const key = order.createdAt.toDateString();
      if (totalsByDay.has(key)) totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + order.total);
    }

    return [...totalsByDay.entries()].map(([key, value]) => ({
      day: WEEKDAYS_FR[new Date(key).getDay()],
      value: Math.round(value / 1000),
    }));
  },

  async salesByCategory() {
    const since = new Date(Date.now() - 30 * DAY_MS);
    const items = await statsRepository.orderItemsSince(since);

    const totals = new Map<string, number>();
    for (const item of items) {
      const category = item.product.category.name;
      totals.set(category, (totals.get(category) ?? 0) + item.qty * item.price);
    }

    return [...totals.entries()].map(([name, value]) => ({ name, value }));
  },

  /**
   * « Sacs les plus vendus » (recueil de besoins, Q70). Fenetre glissante de
   * 90 jours : assez large pour lisser les creux, assez courte pour rester
   * un classement du moment et non un cumul depuis l'ouverture.
   */
  async topProducts(days = 90, take = 8) {
    const since = new Date(Date.now() - days * DAY_MS);
    const grouped = await statsRepository.topProductsSince(since, take);
    if (grouped.length === 0) return [];

    const products = await statsRepository.productsByIds(grouped.map((row) => row.productId));
    const byId = new Map(products.map((product) => [product.id, product]));

    // On conserve l'ordre du groupBy : c'est lui qui porte le classement.
    return grouped.flatMap((row) => {
      const product = byId.get(row.productId);
      if (!product) return [];
      const qty = row._sum.qty ?? 0;
      return [
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category.name,
          image: product.images[0]?.url ?? null,
          qtySold: qty,
          revenue: qty * product.price,
        },
      ];
    });
  },

  async dashboard() {
    const since = new Date(Date.now() - DAY_MS);
    const [revenue, pending, stockLevels, newClients] = await Promise.all([
      statsRepository.revenueSince(since),
      statsRepository.pendingOrdersCount(),
      statsRepository.allStockLevels(),
      statsRepository.newClientsSince(since),
    ]);

    return {
      revenueToday: revenue._sum.total ?? 0,
      pendingOrders: pending,
      lowStockCount: stockLevels.filter((s) => s.qty <= s.threshold).length,
      newClientsToday: newClients,
    };
  },
};
