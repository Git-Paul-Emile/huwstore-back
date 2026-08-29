import { Router } from "express";
import { promoController } from "../controller/promo.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const promoRoutes = Router();

// Verification d'un code depuis le panier : ouverte, mais elle ne revele que
// le sort du code saisi - elle n'en liste aucun.
promoRoutes.post("/validate", promoController.validate);

// La LISTE des codes reste privee : publique, elle offrirait a n'importe qui
// tous les codes actifs de la boutique.
promoRoutes.get("/", requireAuth, requireAdmin, promoController.list);
promoRoutes.post("/", requireAuth, requireAdmin, promoController.create);
promoRoutes.patch("/:id", validateId, requireAuth, requireAdmin, promoController.update);
promoRoutes.delete("/:id", validateId, requireAuth, requireAdmin, promoController.remove);
