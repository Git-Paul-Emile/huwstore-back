import { Router } from "express";
import { statsController } from "../controller/stats.controller.js";
import { validate } from "../middlewares/validate.js";
import { overviewQuerySchema, topProductsQuerySchema } from "../validators/stats.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const statsRoutes = Router();

statsRoutes.use(requireAuth, requireAdmin);
statsRoutes.get("/dashboard", statsController.dashboard);
statsRoutes.get("/overview", validate({ query: overviewQuerySchema }), statsController.overview);
statsRoutes.get("/sales-7-days", statsController.sales7);
statsRoutes.get("/sales-by-category", statsController.salesByCategory);
statsRoutes.get("/top-products", validate({ query: topProductsQuerySchema }), statsController.topProducts);
