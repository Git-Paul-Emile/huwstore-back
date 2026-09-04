import { Router } from "express";
import { orderController } from "../controller/order.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { orderCreateSchema, orderUpdateSchema, orderListQuerySchema } from "../validators/order.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";
import { writeLimiter } from "../middlewares/rateLimit.js";

export const orderRoutes = Router();

// Declarees AVANT "/:id", sinon Express prendrait "mine" et "export" pour des id.
orderRoutes.get("/mine", requireAuth, orderController.mine);
orderRoutes.get(
  "/export",
  requireAuth,
  requireAdmin,
  validate({ query: orderListQuerySchema }),
  orderController.exportCsv,
);

orderRoutes.get("/", requireAuth, requireAdmin, validate({ query: orderListQuerySchema }), orderController.list);

/**
 * Commander exige un compte : la commande en invite n'est plus ouverte. Le
 * debit reste limite - c'est une route qui ecrit en base et declenche des
 * e-mails.
 */
orderRoutes.post("/", writeLimiter, requireAuth, validate({ body: orderCreateSchema }), orderController.create);

// Lecture du recu et de la facture : reservee a l'acheteuse connectee et
// proprietaire de la commande.
orderRoutes.get("/:id", validateId, requireAuth, orderController.getOne);
orderRoutes.get("/:id/invoice", validateId, requireAuth, orderController.invoice);

orderRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: orderUpdateSchema }),
  orderController.update,
);
