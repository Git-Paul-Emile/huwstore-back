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
