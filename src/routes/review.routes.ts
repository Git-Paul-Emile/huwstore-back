import { Router } from "express";
import { reviewController } from "../controller/review.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const reviewRoutes = Router();

reviewRoutes.get("/", requireAuth, requireAdmin, reviewController.list);
reviewRoutes.post("/", reviewController.create);
reviewRoutes.patch("/:id/status", validateId, requireAuth, requireAdmin, reviewController.updateStatus);
