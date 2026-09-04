import { Router } from "express";
import { promoController } from "../controller/promo.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { promoSchema, promoUpdateSchema, promoValidateSchema } from "../validators/promo.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const promoRoutes = Router();

// Verification d'un code depuis le panier : ouverte, mais elle ne revele que
// le sort du code saisi - elle n'en liste aucun.
promoRoutes.post("/validate", validate({ body: promoValidateSchema }), promoController.validate);

// La LISTE des codes reste privee : publique, elle offrirait a n'importe qui
// tous les codes actifs de la boutique.
promoRoutes.get("/", requireAuth, requireAdmin, promoController.list);
promoRoutes.post("/", requireAuth, requireAdmin, validate({ body: promoSchema }), promoController.create);
promoRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: promoUpdateSchema }),
  promoController.update,
);
promoRoutes.delete("/:id", validateId, requireAuth, requireAdmin, promoController.remove);
