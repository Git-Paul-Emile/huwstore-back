import { Router } from "express";
import { mediaController } from "../controller/media.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const mediaRoutes = Router();

// Reserve au back-office : un televersement ouvert au public serait un
// hebergement d'images gratuit pour n'importe qui.
mediaRoutes.post("/", requireAuth, requireAdmin, mediaController.upload);
