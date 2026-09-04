import { Router } from "express";
import { feedbackController } from "../controller/feedback.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { validate } from "../middlewares/validate.js";
import { feedbackSchema, feedbackUpdateSchema } from "../validators/feedback.validator.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";
import { writeLimiter } from "../middlewares/rateLimit.js";

export const feedbackRoutes = Router();

// Déposer un avis est ouvert à tout visiteur, avec ou sans compte - c'est le
// point d'entrée de la fonctionnalité demandée dans le recueil de besoins.
// Le débit est limité : comme pour les commandes, c'est une route publique
// qui écrit en base sans aucune authentification.
feedbackRoutes.post("/", writeLimiter, validate({ body: feedbackSchema }), feedbackController.create);

// Lire, traiter et supprimer les avis reste réservé au back-office : rien
// n'est publié automatiquement sur la vitrine.
feedbackRoutes.get("/", requireAuth, requireAdmin, feedbackController.list);
feedbackRoutes.patch(
  "/:id",
  validateId,
  requireAuth,
  requireAdmin,
  validate({ body: feedbackUpdateSchema }),
  feedbackController.update,
);
feedbackRoutes.delete("/:id", validateId, requireAuth, requireAdmin, feedbackController.remove);
