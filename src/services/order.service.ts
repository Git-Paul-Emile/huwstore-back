import { orderRepository } from "../repositories/order.repository.js";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { orderStatusMap, payMethodMap, payStatusMap } from "../utils/enumMaps.js";
import type { orderCreateSchema, orderUpdateSchema } from "../validators/order.validator.js";
import type { z } from "zod";

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const toDto = (order: OrderWithItems) => ({
  id: order.id,
  client: order.client,
  city: order.city,
  country: order.country,
  items: order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  total: order.total,
  pay: payStatusMap.label(order.pay),
  method: payMethodMap.label(order.method),
  status: orderStatusMap.label(order.status),
  courier: order.courier ?? undefined,
  tracking: order.tracking ?? undefined,
  date: order.createdAt,
});

export const orderService = {
  list: async () => (await orderRepository.findAll()).map(toDto),
  listMine: async (userId: string) => (await orderRepository.findByUserId(userId)).map(toDto),

  async create(input: z.infer<typeof orderCreateSchema>, userId?: string) {
    const products = await prisma.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } } });
    if (products.length !== input.items.length) throw AppError.badRequest("Un ou plusieurs produits sont introuvables.");

    const items = input.items.map((line) => {
      const product = products.find((p) => p.id === line.productId)!;
      return { productId: product.id, name: product.name, qty: line.qty, price: product.price };
    });
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const order = await orderRepository.create({
      client: input.client,
      city: input.city,
      country: input.country,
      method: payMethodMap.fromLabel(input.method),
      total,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
      items: { create: items.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })) },
    });
    return toDto(order);
  },

  async update(id: string, input: z.infer<typeof orderUpdateSchema>) {
    const existing = await orderRepository.findById(id);
    if (!existing) throw AppError.notFound("Commande introuvable.");

    const order = await orderRepository.update(id, {
      ...(input.status ? { status: orderStatusMap.fromLabel(input.status) } : {}),
      ...(input.pay ? { pay: payStatusMap.fromLabel(input.pay) } : {}),
      ...(input.courier !== undefined ? { courier: input.courier } : {}),
      ...(input.tracking !== undefined ? { tracking: input.tracking } : {}),
    });
    return toDto(order);
  },
};
