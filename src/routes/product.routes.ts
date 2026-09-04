import { Router } from "express";
import { productController } from "../controller/product.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { productSchema, productUpdateSchema, productListQuerySchema } from "../validators/product.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const productRoutes = Router();

// Déclarée AVANT "/:id", sinon Express interpréterait "facets" comme un id.
productRoutes.get("/facets", productController.facets);

productRoutes.get("/", validate({ query: productListQuerySchema }), productController.list);
productRoutes.get("/:id", validateId, productController.getById);
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
