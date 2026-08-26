import { Router } from "express";
import { deliveryZoneController } from "../controller/deliveryZone.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const deliveryZoneRoutes = Router();

deliveryZoneRoutes.get("/", deliveryZoneController.list);
deliveryZoneRoutes.post("/", requireAuth, requireAdmin, deliveryZoneController.create);
deliveryZoneRoutes.patch("/:id", validateId, requireAuth, requireAdmin, deliveryZoneController.update);
deliveryZoneRoutes.delete("/:id", validateId, requireAuth, requireAdmin, deliveryZoneController.remove);
