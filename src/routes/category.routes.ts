import { Router } from "express";
import { categoryController } from "../controller/category.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const categoryRoutes = Router();

categoryRoutes.get("/", categoryController.list);
categoryRoutes.post("/", requireAuth, requireAdmin, validate({ body: categorySchema }), categoryController.create);
categoryRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: categoryUpdateSchema }),
  categoryController.update,
);
categoryRoutes.delete("/:id", validateId, requireAuth, requireAdmin, categoryController.remove);
