import type { Prisma } from "@prisma/client";
import { orderRepository } from "../repositories/order.repository.js";
import { AppError } from "../utils/AppError.js";
import { deliveryModeMap, orderStatusMap, payMethodMap, payStatusMap } from "../utils/enumMaps.js";
import { pricingService } from "./pricing.service.js";
import { jobQueue, JOBS } from "../queue/index.js";
import { logger } from "../config/logger.js";
import type { orderCreateSchema, orderUpdateSchema, orderListQuerySchema } from "../validators/order.validator.js";
import type { z } from "zod";

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const toDto = (order: OrderWithItems) => ({
  id: order.id,
  client: order.client,
  phone: order.phone,
  email: order.email ?? undefined,
  addressLine: order.addressLine,
  landmark: order.landmark ?? undefined,
  city: order.city,
  country: order.country,
  deliveryMode: deliveryModeMap.label(order.deliveryMode),
  items: order.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId ?? undefined,
    name: item.name,
    color: item.color ?? undefined,
    qty: item.qty,
    price: item.price,
  })),
  subtotal: order.subtotal,
  shippingFee: order.shippingFee,
  discount: order.discount,
  promoCode: order.promoCode ?? undefined,
  total: order.total,
  pay: payStatusMap.label(order.pay),
  method: payMethodMap.label(order.method),
  status: orderStatusMap.label(order.status),
  courier: order.courier ?? undefined,
  tracking: order.tracking ?? undefined,
  note: order.note ?? undefined,
  /** Vrai quand la commande a ete passee sans compte. */
  guest: order.userId === null,
  date: order.createdAt,
});

export type OrderDto = ReturnType<typeof toDto>;

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

function buildWhere(query: z.infer<typeof orderListQuerySchema>): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (query.status) where.status = orderStatusMap.fromLabel(query.status);
  if (query.pay) where.pay = payStatusMap.fromLabel(query.pay);
  if (query.search) {
    where.OR = [
      { id: { contains: query.search, mode: "insensitive" } },
      { client: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { city: { contains: query.search, mode: "insensitive" } },
      { tracking: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export const orderService = {
  async list(query: z.infer<typeof orderListQuerySchema>) {
    const where = buildWhere(query);
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

  /** Export back-office : pas de pagination, mais les memes filtres que la liste. */
  listAllFiltered: async (query: z.infer<typeof orderListQuerySchema>) =>
    (await orderRepository.findAllUnpaged(buildWhere(query), toOrderBy(query.sort))).map(toDto),

  listMine: async (userId: string) => (await orderRepository.findByUserId(userId)).map(toDto),

  /** Lecture sans controle d'acces : reservee au back-office. */
  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw AppError.notFound("Commande introuvable.");
    return toDto(order);
  },

  /**
   * Lecture d'une commande par son acheteur.
   *
   * Deux cas legitimes, et deux seulement :
   *  - la commande appartient au compte connecte ;
   *  - le visiteur presente le jeton de lecture remis a l'achat (commande en
   *    invite), que lui seul possede.
   *
   * Tout le reste repond « introuvable » plutot que « interdit » : repondre
   * « interdit » confirmerait a un curieux que l'identifiant existe.
   */
  async getForBuyer(id: string, access: { userId?: string | null; token?: string | null }) {
    const order = await orderRepository.findById(id);
    if (!order) throw AppError.notFound("Commande introuvable.");

    const ownedByUser = Boolean(access.userId) && order.userId === access.userId;
    const openedByToken = Boolean(access.token) && order.publicToken === access.token;
    if (!ownedByUser && !openedByToken) throw AppError.notFound("Commande introuvable.");

    return toDto(order);
  },

  /**
   * Enregistrement d'une commande.
   *
   * `userId` peut etre nul : la boutique accepte les commandes SANS COMPTE
   * (recueil de besoins). Dans ce cas la commande n'est rattachee a personne,
   * et c'est le jeton de lecture renvoye ici - puis rappele dans l'e-mail de
   * confirmation - qui permettra a l'acheteuse de retrouver son recu.
   */
  async create(input: z.infer<typeof orderCreateSchema>, userId: string | null) {
    // Un seul point de calcul : disponibilite, prix, frais de port et remise.
    const quote = await pricingService.quote({
      items: input.items,
      deliveryZoneId: input.deliveryZoneId,
      deliveryMode: input.deliveryMode,
      promoCode: input.promoCode,
    });

    const order = await orderRepository.createWithStockMovement(
      {
        client: input.client,
        phone: input.phone,
        email: input.email ?? null,
        addressLine: input.addressLine,
        landmark: input.landmark ?? null,
        city: input.city,
        country: input.country,
        deliveryMode: deliveryModeMap.fromLabel(input.deliveryMode),
        method: payMethodMap.fromLabel(input.method),
        note: input.note ?? null,
        subtotal: quote.subtotal,
        shippingFee: quote.shippingFee,
        discount: quote.discount,
        promoCode: quote.promoCode,
        total: quote.total,
        ...(input.deliveryZoneId ? { deliveryZone: { connect: { id: input.deliveryZoneId } } } : {}),
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        items: {
          create: quote.lines.map((line) => ({
            product: { connect: { id: line.productId } },
            variant: { connect: { id: line.variantId } },
            name: line.name,
            color: line.color,
            qty: line.qty,
            price: line.price,
          })),
        },
      },
      quote.lines.map((line) => ({ variantId: line.variantId, qty: line.qty, label: line.label })),
      quote.promoCode,
    );

    logger.info({ orderId: order.id, total: order.total, guest: userId === null }, "Commande enregistrée");

    const dto = toDto(order);
    const mailPayload = { ...dto, publicToken: order.publicToken };

    // Les e-mails partent dans la file de tâches : la vente est acquise, elle
    // ne doit pas attendre - ni échouer si - l'envoi. La clé d'idempotence
    // garantit qu'un même e-mail n'est jamais envoyé deux fois.
    jobQueue.enqueue(JOBS.orderNotifyShop, mailPayload, { idempotencyKey: `notify-shop:${order.id}` });
    jobQueue.enqueue(JOBS.orderConfirmClient, mailPayload, { idempotencyKey: `confirm-client:${order.id}` });

    // Le jeton n'est renvoye QU'ICI, a celle qui vient de commander.
    return { ...dto, publicToken: order.publicToken };
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

    logger.info({ orderId: id, status: order.status, pay: order.pay }, "Commande mise à jour");
    return toDto(order);
  },
};
