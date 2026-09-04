import { Router } from "express";
import { mediaController } from "../controller/media.controller.js";
import { validate } from "../middlewares/validate.js";
import { mediaUploadSchema } from "../validators/media.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

export const mediaRoutes = Router();

// Reserve au back-office : un televersement ouvert au public serait un
// hebergement d'images gratuit pour n'importe qui.
mediaRoutes.post("/", requireAuth, requireAdmin, validate({ body: mediaUploadSchema }), mediaController.upload);
