import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../config/logger.js";

/**
 * Journalise chaque requête avec sa durée et son code HTTP (« mesurer temps de
 * réponse et taux d'erreur », rules/observability.md).
 *
 * Chaque requête reçoit aussi un identifiant renvoyé dans l'en-tête
 * `X-Request-Id` : quand une cliente signale une erreur, cet identifiant permet
 * de retrouver la ligne exacte dans les journaux.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-Id", requestId);
  req.requestId = requestId;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const line = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    };
    if (res.statusCode >= 500) logger.error(line, "Requête en échec");
    else if (res.statusCode >= 400) logger.warn(line, "Requête refusée");
    else logger.info(line, "Requête traitée");
  });

  next();
}
