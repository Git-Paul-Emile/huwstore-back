import { Router } from "express";
import { orderController } from "../controller/order.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { optionalAuth, requireAdmin, requireAuth } from "../middlewares/auth.js";
import { writeLimiter } from "../middlewares/rateLimit.js";

export const orderRoutes = Router();

// Declarees AVANT "/:id", sinon Express prendrait "mine" et "export" pour des id.
orderRoutes.get("/mine", requireAuth, orderController.mine);
orderRoutes.get("/export", requireAuth, requireAdmin, orderController.exportCsv);

orderRoutes.get("/", requireAuth, requireAdmin, orderController.list);

/**
 * Commander est ouvert AVEC OU SANS COMPTE (recueil de besoins).
 * `optionalAuth` rattache la commande au compte quand un jeton valide est
 * present, et laisse passer le visiteur sinon. Le debit est limite : c'est une
 * route publique qui ecrit en base et declenche des e-mails.
 */
orderRoutes.post("/", writeLimiter, optionalAuth, orderController.create);

// Lecture du recu : soit on est connecte et proprietaire, soit on presente le
// jeton remis a l'achat (?token=...). Meme regle pour la facture.
orderRoutes.get("/:id", validateId, optionalAuth, orderController.getOne);
orderRoutes.get("/:id/invoice", validateId, optionalAuth, orderController.invoice);

orderRoutes.patch("/:id", validateId, requireAuth, requireAdmin, orderController.update);
