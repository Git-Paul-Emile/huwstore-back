import { Router } from "express";
import { bannerController } from "../controller/banner.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { publicCache } from "../middlewares/httpCache.js";
import { bannerListQuerySchema, bannerSchema, bannerUpdateSchema } from "../validators/banner.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const bannerRoutes = Router();

bannerRoutes.get("/", publicCache(60, 600), validate({ query: bannerListQuerySchema }), bannerController.list);
bannerRoutes.post("/", requireAuth, requireAdmin, validate({ body: bannerSchema }), bannerController.create);
bannerRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: bannerUpdateSchema }),
  bannerController.update,
);
bannerRoutes.delete("/:id", validateId, requireAuth, requireAdmin, bannerController.remove);
