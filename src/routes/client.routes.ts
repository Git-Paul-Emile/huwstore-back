import { Router } from "express";
import { clientController } from "../controller/client.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const clientRoutes = Router();

clientRoutes.use(requireAuth, requireAdmin);

// Declaree AVANT la liste : sinon "/export" n'aurait aucune chance d'exister.
clientRoutes.get("/export", clientController.exportCsv);
clientRoutes.get("/", clientController.list);
