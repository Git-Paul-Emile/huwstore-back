import { Router } from "express";
import { bannerController } from "../controller/banner.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const bannerRoutes = Router();

bannerRoutes.get("/", bannerController.list);
bannerRoutes.post("/", requireAuth, requireAdmin, bannerController.create);
bannerRoutes.patch("/:id", validateId, requireAuth, requireAdmin, bannerController.update);
bannerRoutes.delete("/:id", validateId, requireAuth, requireAdmin, bannerController.remove);
