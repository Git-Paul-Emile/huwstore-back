import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { orderService } from "../services/order.service.js";
import { orderCreateSchema, orderUpdateSchema, orderListQuerySchema } from "../validators/order.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { validBody, validQuery } from "../middlewares/validate.js";
import { AppError } from "../utils/AppError.js";
import { toCsv } from "../services/csv.service.js";
import { invoiceService } from "../services/invoice.service.js";
import { settingService } from "../services/setting.service.js";

export const orderController = {
  list: controllerWrapper(async (req, res) => {
    const { items, meta } = await orderService.list(validQuery(req, orderListQuerySchema));
    jsonResponse(res, StatusCodes.OK, "success", "Commandes récupérées.", items, meta);
  }),

  mine: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const orders = await orderService.listMine(req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Vos commandes récupérées.", orders);
  }),

  /**
   * Consultation d'une commande. Sert au recu affiche juste apres l'achat et a
   * l'historique du compte : seule l'acheteuse connectee, proprietaire de la
   * commande, y a acces.
   */
  getOne: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const order = await orderService.getOwnedOrder(getParam(req, "id"), req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Commande récupérée.", order);
  }),

  /**
   * Facture PDF. Meme controle d'acces que le recu : une facture porte le nom,
   * le telephone et l'adresse de l'acheteuse, elle ne doit jamais etre lisible
   * par un tiers.
   */
  invoice: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const order = await orderService.getOwnedOrder(getParam(req, "id"), req.user.userId);
    const shop = await settingService.get();
    const pdf = invoiceService.build(order, shop);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceService.fileName(order)}"`);
    res.setHeader("Content-Length", String(pdf.length));
    res.status(StatusCodes.OK).send(pdf);
  }),

  /** Export back-office : le cahier et le fichier Excel qu'il remplace. */
  exportCsv: controllerWrapper(async (req, res) => {
    const orders = await orderService.listAllFiltered(validQuery(req, orderListQuerySchema));

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
   * Passage de commande. `requireAuth` garantit `req.user` : la commande est
   * rattachee au compte connecte et apparait dans son historique.
   */
  create: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const order = await orderService.create(validBody(req, orderCreateSchema), req.user.userId);
    jsonResponse(res, StatusCodes.CREATED, "success", "Commande créée.", order);
  }),

  update: controllerWrapper(async (req, res) => {
    const order = await orderService.update(getParam(req, "id"), validBody(req, orderUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Commande mise à jour.", order);
  }),
};
