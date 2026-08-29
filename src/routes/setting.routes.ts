import { Router } from "express";
import { settingController } from "../controller/setting.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const settingRoutes = Router();

// Lecture publique : le pied de page, le widget WhatsApp et le bandeau
// d'annonce de la vitrine s'alimentent ici.
settingRoutes.get("/", settingController.get);
settingRoutes.patch("/", requireAuth, requireAdmin, settingController.update);
