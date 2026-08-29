import { Router } from "express";
import { testimonialController } from "../controller/testimonial.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const testimonialRoutes = Router();

testimonialRoutes.get("/", testimonialController.list);
testimonialRoutes.post("/", requireAuth, requireAdmin, testimonialController.create);
testimonialRoutes.patch("/:id", validateId, requireAuth, requireAdmin, testimonialController.update);
testimonialRoutes.delete("/:id", validateId, requireAuth, requireAdmin, testimonialController.remove);
