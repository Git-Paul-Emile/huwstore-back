import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "../routes/index.js";
import { docsRouter } from "../routes/docs.routes.js";
import { sitemapRouter } from "../routes/sitemap.routes.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { notFound } from "../middlewares/notFound.js";
import { requestLogger } from "../middlewares/requestLogger.js";
import { globalLimiter } from "../middlewares/rateLimit.js";
import { compression } from "../middlewares/compression.js";
import { monitoring } from "./monitoring.js";
import { jobQueue } from "../queue/index.js";
import { getMailer } from "../services/external/mailer.js";
import { getImageStore } from "../services/external/image-store.js";
import { prisma } from "./database.js";
import { env } from "./env.js";

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
const allowedOrigins = env.CLIENT_URL
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
  // Le téléversement de média accepte aussi une vidéo produit : sa limite plus
  // haute est cantonnée à cette seule route (admin, débit limité).
  app.use(`${API_PREFIX}/media`, express.json({ limit: "56mb" }));
  app.use(express.json({ limit: "12mb" }));

  // Compression Brotli/gzip des réponses (rules/performance.md).
  app.use(compression);

  app.use(requestLogger);
  app.use(globalLimiter);

  /**
   * Sonde de disponibilité (rules/observability.md) : l'hébergeur et la
   * supervision l'interrogent. Elle expose aussi l'état de la file de tâches et
   * des services externes, pour repérer une dérive avant qu'elle ne se voie.
   */
  app.get("/health", async (_req, res) => {
    const [mailer, imageStore] = await Promise.all([getMailer(), getImageStore()]);
    const body = {
      status: "ok" as "ok" | "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      database: "up" as "up" | "down",
      queue: jobQueue.stats(),
      monitoring: { enabled: monitoring.enabled },
      external: { mailer: mailer.health(), imageStore: imageStore.health() },
    };
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      body.status = "degraded";
      body.database = "down";
    }
    res.status(body.status === "ok" ? 200 : 503).json(body);
  });

  // Plan du site (rules/SEO.md) : servi à la racine du domaine via une
  // réécriture Vercel côté front.
  app.use("/sitemap.xml", sitemapRouter);

  // Documentation OpenAPI (rules/api.md).
  app.use(`${API_PREFIX}/docs`, docsRouter);

  app.use(API_PREFIX, router);

  // Compatibilité : l'ancienne base non versionnée redirige vers la version 1.
  // 308 conserve la méthode HTTP et le corps de la requête, contrairement à 301.
  // On NE redirige PAS ce qui cible déjà /api/v1 : une route v1 inconnue doit
  // tomber en 404, pas boucler indéfiniment sur elle-même.
  app.use("/api", (req, res, next) => {
    if (req.url === "/v1" || req.url.startsWith("/v1/")) return next();
    res.redirect(308, `${API_PREFIX}${req.url}`);
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
