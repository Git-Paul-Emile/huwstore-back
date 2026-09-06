import { Router } from "express";
import { productOptionController } from "../controller/product-option.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import {
  productOptionSchema,
  productOptionUpdateSchema,
  productOptionListQuerySchema,
} from "../validators/product-option.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const productOptionRoutes = Router();

// Configuration du back-office : réservée à l'admin, la vitrine n'en a pas besoin
// (ses filtres viennent de /products/facets, calculés depuis les produits réels).
productOptionRoutes.use(requireAuth, requireAdmin);

productOptionRoutes.get("/", validate({ query: productOptionListQuerySchema }), productOptionController.list);
productOptionRoutes.post("/", validate({ body: productOptionSchema }), productOptionController.create);
productOptionRoutes.patch(
  "/:id",
  validateId,
  validate({ body: productOptionUpdateSchema }),
  productOptionController.update,
);
productOptionRoutes.delete("/:id", validateId, productOptionController.remove);
