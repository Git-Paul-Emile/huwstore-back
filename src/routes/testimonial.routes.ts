import { Router } from "express";
import { testimonialController } from "../controller/testimonial.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { testimonialSchema, testimonialUpdateSchema } from "../validators/testimonial.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const testimonialRoutes = Router();

testimonialRoutes.get("/", testimonialController.list);
testimonialRoutes.post(
  "/",
  requireAuth,
  requireAdmin,
  validate({ body: testimonialSchema }),
  testimonialController.create,
);
testimonialRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: testimonialUpdateSchema }),
  testimonialController.update,
);
testimonialRoutes.delete("/:id", validateId, requireAuth, requireAdmin, testimonialController.remove);
