import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const userRepository = {
  findByPhone: (phone: string) => prisma.user.findUnique({ where: { phone } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),
  findClients: () =>
    prisma.user.findMany({
      where: { role: "CLIENT" },
      include: { orders: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
    }),
};
