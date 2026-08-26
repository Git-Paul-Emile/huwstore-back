import { Router } from "express";
import { orderController } from "../controller/order.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const orderRoutes = Router();

orderRoutes.get("/", requireAuth, requireAdmin, orderController.list);
orderRoutes.get("/mine", requireAuth, orderController.mine);
orderRoutes.post("/", orderController.create);
orderRoutes.patch("/:id", validateId, requireAuth, requireAdmin, orderController.update);
