import { Router } from "express";
import { clientController } from "../controller/client.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const clientRoutes = Router();

clientRoutes.get("/", requireAuth, requireAdmin, clientController.list);
