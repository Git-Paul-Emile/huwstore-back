import { Router } from "express";
import { deliveryZoneController } from "../controller/deliveryZone.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { deliveryZoneSchema, deliveryZoneUpdateSchema } from "../validators/deliveryZone.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const deliveryZoneRoutes = Router();

deliveryZoneRoutes.get("/", deliveryZoneController.list);
deliveryZoneRoutes.post(
  "/",
  requireAuth,
  requireAdmin,
  validate({ body: deliveryZoneSchema }),
  deliveryZoneController.create,
);
deliveryZoneRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: deliveryZoneUpdateSchema }),
  deliveryZoneController.update,
);
deliveryZoneRoutes.delete("/:id", validateId, requireAuth, requireAdmin, deliveryZoneController.remove);
