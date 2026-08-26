import { Router } from "express";
import { categoryController } from "../controller/category.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const categoryRoutes = Router();

categoryRoutes.get("/", categoryController.list);
categoryRoutes.post("/", requireAuth, requireAdmin, categoryController.create);
categoryRoutes.patch("/:id", validateId, requireAuth, requireAdmin, categoryController.update);
categoryRoutes.delete("/:id", validateId, requireAuth, requireAdmin, categoryController.remove);
