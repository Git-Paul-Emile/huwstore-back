import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

const include = { items: true } satisfies Prisma.OrderInclude;

export const orderRepository = {
  findAll: () => prisma.order.findMany({ include, orderBy: { createdAt: "desc" } }),
  findByUserId: (userId: string) => prisma.order.findMany({ where: { userId }, include, orderBy: { createdAt: "desc" } }),
  findById: (id: string) => prisma.order.findUnique({ where: { id }, include }),
  create: (data: Prisma.OrderCreateInput) => prisma.order.create({ data, include }),
  update: (id: string, data: Prisma.OrderUpdateInput) => prisma.order.update({ where: { id }, data, include }),
};
