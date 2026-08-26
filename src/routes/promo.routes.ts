import { Router } from "express";
import { promoController } from "../controller/promo.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const promoRoutes = Router();

promoRoutes.get("/", promoController.list);
promoRoutes.post("/", requireAuth, requireAdmin, promoController.create);
promoRoutes.patch("/:id", validateId, requireAuth, requireAdmin, promoController.update);
promoRoutes.delete("/:id", validateId, requireAuth, requireAdmin, promoController.remove);
