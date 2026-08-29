import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { orderService } from "../services/order.service.js";
import { orderCreateSchema, orderUpdateSchema, orderListQuerySchema } from "../validators/order.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";
import { toCsv } from "../services/csv.service.js";
import { invoiceService } from "../services/invoice.service.js";
import { settingService } from "../services/setting.service.js";

/** Jeton de lecture presente par un acheteur sans compte (?token=...). */
const readToken = (req: { query: Record<string, unknown> }) =>
  typeof req.query.token === "string" ? req.query.token : null;

export const orderController = {
  list: controllerWrapper(async (req, res) => {
    const query = orderListQuerySchema.parse(req.query);
    const { items, meta } = await orderService.list(query);
    jsonResponse(res, StatusCodes.OK, "success", "Commandes récupérées.", items, meta);
  }),

  mine: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const orders = await orderService.listMine(req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Vos commandes récupérées.", orders);
  }),

  /**
   * Consultation d'une commande. Sert au recu affiche juste apres l'achat et a
   * l'historique du compte. Deux acces legitimes : le compte proprietaire, ou
   * le jeton de lecture remis a l'achat pour une commande passee en invite.
   */
  getOne: controllerWrapper(async (req, res) => {
    const order = await orderService.getForBuyer(getParam(req, "id"), {
      userId: req.user?.userId ?? null,
      token: readToken(req),
    });
    jsonResponse(res, StatusCodes.OK, "success", "Commande récupérée.", order);
  }),

  /**
   * Facture PDF. Meme controle d'acces que le recu : une facture porte le nom,
   * le telephone et l'adresse de l'acheteuse, elle ne doit jamais etre lisible
   * par un tiers qui devinerait un identifiant.
   */
  invoice: controllerWrapper(async (req, res) => {
    const order = await orderService.getForBuyer(getParam(req, "id"), {
      userId: req.user?.userId ?? null,
      token: readToken(req),
    });
    const shop = await settingService.get();
    const pdf = invoiceService.build(order, shop);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceService.fileName(order)}"`);
    res.setHeader("Content-Length", String(pdf.length));
    res.status(StatusCodes.OK).send(pdf);
  }),

  /** Export back-office : le cahier et le fichier Excel qu'il remplace. */
  exportCsv: controllerWrapper(async (req, res) => {
    const query = orderListQuerySchema.parse(req.query);
    const orders = await orderService.listAllFiltered(query);

    const csv = toCsv(orders, [
      { header: "Commande", value: (o) => o.id },
      { header: "Date", value: (o) => new Date(o.date).toLocaleDateString("fr-FR") },
      { header: "Cliente", value: (o) => o.client },
      { header: "Téléphone", value: (o) => o.phone },
      { header: "Adresse", value: (o) => o.addressLine },
      { header: "Repère", value: (o) => o.landmark ?? "" },
      { header: "Ville", value: (o) => o.city },
      { header: "Mode de livraison", value: (o) => o.deliveryMode },
      { header: "Articles", value: (o) => o.items.map((i) => `${i.name} (${i.color ?? "-"}) x${i.qty}`).join(" | ") },
      { header: "Sous-total", value: (o) => o.subtotal },
      { header: "Livraison", value: (o) => o.shippingFee },
      { header: "Remise", value: (o) => o.discount },
      { header: "Code promo", value: (o) => o.promoCode ?? "" },
      { header: "Total", value: (o) => o.total },
      { header: "Paiement", value: (o) => `${o.method} - ${o.pay}` },
      { header: "Statut", value: (o) => o.status },
      { header: "Livreur", value: (o) => o.courier ?? "" },
      { header: "Suivi", value: (o) => o.tracking ?? "" },
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="commandes-${stamp}.csv"`);
    res.status(StatusCodes.OK).send(csv);
  }),

  /**
   * Passage de commande, avec ou sans compte. `req.user` est renseigne quand la
   * cliente est connectee (optionalAuth) : la commande lui est alors rattachee
   * et apparaitra dans son historique.
   */
  create: controllerWrapper(async (req, res) => {
    const input = orderCreateSchema.parse(req.body);
    const order = await orderService.create(input, req.user?.userId ?? null);
    jsonResponse(res, StatusCodes.CREATED, "success", "Commande créée.", order);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = orderUpdateSchema.parse(req.body);
    const order = await orderService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Commande mise à jour.", order);
  }),
};
