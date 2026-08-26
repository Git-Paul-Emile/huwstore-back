import { userRepository } from "../repositories/user.repository.js";

type Segment = "VIP" | "Nouveau" | "Inactif" | "Fidèle";

function segmentOf(ordersCount: number, spent: number): Segment {
  if (ordersCount === 0) return "Nouveau";
  if (spent >= 300000) return "VIP";
  if (ordersCount >= 3) return "Fidèle";
  return "Inactif";
}

export const clientService = {
  async list() {
    const users = await userRepository.findClients();
    return users.map((u) => {
      const spent = u.orders.reduce((sum, o) => sum + o.total, 0);
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email ?? undefined,
        city: u.city ?? undefined,
        orders: u.orders.length,
        spent,
        since: u.createdAt,
        segment: segmentOf(u.orders.length, spent),
      };
    });
  },
};
