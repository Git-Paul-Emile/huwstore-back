import { Router } from "express";
import { cartController } from "../controller/cart.controller.js";
import { validate } from "../middlewares/validate.js";
import { cartAddSchema, cartQtySchema, cartMergeSchema } from "../validators/cart.validator.js";
import { requireAuth } from "../middlewares/auth.js";

export const cartRoutes = Router();

cartRoutes.use(requireAuth);

cartRoutes.get("/", cartController.list);
cartRoutes.post("/merge", validate({ body: cartMergeSchema }), cartController.merge);
cartRoutes.post("/", validate({ body: cartAddSchema }), cartController.add);
cartRoutes.patch("/:variantId", validate({ body: cartQtySchema }), cartController.setQty);
cartRoutes.delete("/:variantId", cartController.remove);
cartRoutes.delete("/", cartController.clear);
