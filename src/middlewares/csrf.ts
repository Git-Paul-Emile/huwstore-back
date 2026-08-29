import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE, CSRF_HEADER } from "../config/cookies.js";
import { AppError } from "../utils/AppError.js";

/**
 * Protection CSRF par double envoi (rules/security.md).
 *
 * Elle ne concerne QUE les routes authentifiées par cookie - c'est-à-dire
 * /auth/refresh et /auth/logout. Partout ailleurs l'API exige un en-tête
 * `Authorization: Bearer`, qu'un site tiers ne peut pas produire : ces routes
 * là sont insensibles au CSRF par construction.
 */
export function requireCsrfToken(req: Request, _res: Response, next: NextFunction) {
  const fromCookie = req.cookies?.[CSRF_COOKIE];
  const fromHeader = req.get(CSRF_HEADER);

  if (!fromCookie || !fromHeader || fromCookie !== fromHeader) {
    throw AppError.forbidden("Requête refusée : jeton anti-CSRF manquant ou invalide.");
  }
  next();
}
