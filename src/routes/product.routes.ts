import { Router } from "express";
import { productController } from "../controller/product.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { publicCache } from "../middlewares/httpCache.js";
import { productSchema, productUpdateSchema, productListQuerySchema } from "../validators/product.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const productRoutes = Router();

// Déclarée AVANT "/:id", sinon Express interpréterait "facets" comme un id.
productRoutes.get("/facets", publicCache(300, 3600), productController.facets);

productRoutes.get("/", publicCache(60, 600), validate({ query: productListQuerySchema }), productController.list);
productRoutes.get("/:id", publicCache(120, 600), validateId, productController.getById);
productRoutes.post("/", requireAuth, requireAdmin, validate({ body: productSchema }), productController.create);
productRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: productUpdateSchema }),
  productController.update,
);
productRoutes.delete("/:id", validateId, requireAuth, requireAdmin, productController.remove);
