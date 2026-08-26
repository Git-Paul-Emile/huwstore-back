import { Router } from "express";
import { stockController } from "../controller/stock.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const stockRoutes = Router();

stockRoutes.use(requireAuth, requireAdmin);
stockRoutes.get("/", stockController.list);
stockRoutes.get("/movements", stockController.movements);
stockRoutes.post("/adjust", stockController.adjust);
