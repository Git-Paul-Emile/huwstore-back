import { Router } from "express";
import { productController } from "../controller/product.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const productRoutes = Router();

productRoutes.get("/", productController.list);
productRoutes.get("/:id", validateId, productController.getById);
productRoutes.post("/", requireAuth, requireAdmin, productController.create);
productRoutes.patch("/:id", validateId, requireAuth, requireAdmin, productController.update);
productRoutes.delete("/:id", validateId, requireAuth, requireAdmin, productController.remove);
