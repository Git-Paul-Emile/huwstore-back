import type { Prisma } from "@prisma/client";
import { orderRepository } from "../repositories/order.repository.js";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { orderStatusMap, payMethodMap, payStatusMap } from "../utils/enumMaps.js";
import type { orderCreateSchema, orderUpdateSchema, orderListQuerySchema } from "../validators/order.validator.js";
import type { z } from "zod";

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const toDto = (order: OrderWithItems) => ({
  id: order.id,
  client: order.client,
  city: order.city,
  country: order.country,
  items: order.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId ?? undefined,
    name: item.name,
    color: item.color ?? undefined,
    qty: item.qty,
    price: item.price,
  })),
  total: order.total,
  pay: payStatusMap.label(order.pay),
  method: payMethodMap.label(order.method),
  status: orderStatusMap.label(order.status),
  courier: order.courier ?? undefined,
  tracking: order.tracking ?? undefined,
  date: order.createdAt,
});

function toOrderBy(sort: z.infer<typeof orderListQuerySchema>["sort"]): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "total-desc":
      return { total: "desc" };
    case "total-asc":
      return { total: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

export const orderService = {
  async list(query: z.infer<typeof orderListQuerySchema>) {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = orderStatusMap.fromLabel(query.status);
    if (query.pay) where.pay = payStatusMap.fromLabel(query.pay);
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: "insensitive" } },
        { client: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
        { tracking: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      orderRepository.findAll(where, toOrderBy(query.sort), skip, query.limit),
      orderRepository.count(where),
    ]);

    return {
      items: rows.map(toDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: skip + rows.length < total,
        hasPrev: query.page > 1,
      },
    };
  },

  listMine: async (userId: string) => (await orderRepository.findByUserId(userId)).map(toDto),

  async create(input: z.infer<typeof orderCreateSchema>, userId?: string) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: input.items.map((i) => i.variantId) }, active: true },
      include: { product: { select: { id: true, name: true, price: true, active: true } }, stock: true },
    });

    if (variants.length !== input.items.length) {
      throw AppError.badRequest("Un ou plusieurs articles sont introuvables ou ne sont plus disponibles.");
    }

    // On vérifie la disponibilité AVANT d'écrire quoi que ce soit : mieux vaut
    // une 400 explicite qu'une transaction qui échoue à mi-parcours.
    const lines = input.items.map((line) => {
      const variant = variants.find((v) => v.id === line.variantId)!;
      if (!variant.product.active) throw AppError.badRequest(`${variant.product.name} n'est plus en vente.`);

      const available = variant.stock?.qty ?? 0;
      if (available < line.qty) {
        throw AppError.badRequest(
          `Stock insuffisant pour ${variant.product.name} (${variant.colorName}) : ${available} disponible(s).`,
        );
      }

      return {
        variantId: variant.id,
        productId: variant.product.id,
        name: variant.product.name,
        color: variant.colorName,
        qty: line.qty,
        price: variant.product.price,
        label: `${variant.product.name} — ${variant.colorName}`,
      };
    });

    const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

    const order = await orderRepository.createWithStockMovement(
      {
        client: input.client,
        city: input.city,
        country: input.country,
        method: payMethodMap.fromLabel(input.method),
        total,
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        items: {
          create: lines.map((line) => ({
            product: { connect: { id: line.productId } },
            variant: { connect: { id: line.variantId } },
            name: line.name,
            color: line.color,
            qty: line.qty,
            price: line.price,
          })),
        },
      },
      lines.map((line) => ({ variantId: line.variantId, qty: line.qty, label: line.label })),
    );

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
