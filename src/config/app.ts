import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "../routes/index.js";
import { docsRouter } from "../routes/docs.routes.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { notFound } from "../middlewares/notFound.js";
import { requestLogger } from "../middlewares/requestLogger.js";
import { globalLimiter } from "../middlewares/rateLimit.js";
import { prisma } from "./database.js";

/**
 * Base de l'API, versionnée (rules/api.md).
 *
 * Le numéro de version fait partie du contrat : le jour où un champ change de
 * forme, on publie /api/v2 et les clients déjà installés continuent d'appeler
 * /api/v1 sans casser. L'ancienne base /api reste redirigée le temps que tous
 * les appelants migrent.
 */
export const API_PREFIX = "/api/v1";

/**
 * Origines autorisées par le CORS. Plusieurs valeurs séparées par des virgules
 * (préproduction + production), pour ne jamais avoir à ouvrir l'API à « * ».
 */
const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function createApp() {
  const app = express();

  // Derrière le proxy de l'hébergeur : sans cela, req.ip vaut l'IP du proxy et
  // la limitation de débit compterait tout le trafic sur un seul compteur.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // En-têtes de sécurité (rules/security.md) : HSTS, nosniff, anti-clickjacking,
  // pas de referrer inter-site. L'API ne sert que du JSON, jamais de HTML de
  // l'utilisateur, mais ces en-têtes protègent aussi les réponses d'erreur.
  app.use(
    helmet({
      // Les fichiers renvoyés (CSV, facture PDF) sont téléchargés depuis le
      // domaine du front : ils doivent rester lisibles d'une autre origine.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      // Sans cela, le navigateur cache au front le nom du fichier téléchargé.
      exposedHeaders: ["Content-Disposition", "X-Request-Id"],
    }),
  );

  app.use(cookieParser());
  // Limite de taille : les photos produit arrivent encodées en base64 depuis le
  // back-office. Au-delà, la requête est refusée avant d'occuper la mémoire.
  app.use(express.json({ limit: "12mb" }));

  app.use(requestLogger);
  app.use(globalLimiter);

  /** Sonde de disponibilité : l'hébergeur et la supervision l'interrogent. */
  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ok", database: "up", uptimeSeconds: Math.round(process.uptime()) });
    } catch {
      res.status(503).json({ status: "degraded", database: "down" });
    }
  });

  // Documentation OpenAPI (rules/api.md).
  app.use(`${API_PREFIX}/docs`, docsRouter);

  app.use(API_PREFIX, router);

  // Compatibilité : l'ancienne base non versionnée redirige vers la version 1.
  // 308 conserve la méthode HTTP et le corps de la requête, contrairement à 301.
  app.use("/api", (req, res) => res.redirect(308, `${API_PREFIX}${req.url}`));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
