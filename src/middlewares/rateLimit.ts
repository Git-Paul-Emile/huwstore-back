import rateLimit, { type Options } from "express-rate-limit";
import type { Request, Response } from "express";
import { jsonResponse } from "../utils/jsonResponse.js";
import { logger } from "../config/logger.js";

/**
 * Limitation de debit (rules/security.md).
 *
 * Sans elle, un script peut tester des milliers de mots de passe sur
 * /auth/login, ou saturer l'API a lui seul. Deux reglages differents, parce
 * que les deux risques ne sont pas les memes :
 *  - le trafic normal de la boutique est genereux (une page produit declenche
 *    plusieurs requetes), donc la limite globale est large ;
 *  - une tentative de connexion est rare et couteuse a verifier (bcrypt), donc
 *    la limite d'authentification est stricte.
 */
const MINUTE_MS = 60 * 1000;
const QUARTER_HOUR_MS = 15 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** Trafic normal d'une boutique : une page produit déclenche plusieurs requêtes. */
const GLOBAL_MAX_PER_QUARTER_HOUR = 600;
/** Connexion : rare, coûteuse à vérifier (bcrypt), cible d'attaque par dictionnaire. */
const AUTH_MAX_FAILURES_PER_QUARTER_HOUR = 10;
/** Écritures publiques (commande, validation de code promo). */
const PUBLIC_WRITE_MAX_PER_HOUR = 60;

const COMMON = { standardHeaders: "draft-7", legacyHeaders: false } as const;

const refuse = (message: string) => (req: Request, res: Response, _next: unknown, options: Options) => {
  logger.warn({ ip: req.ip, path: req.originalUrl }, "Limite de débit atteinte");
  jsonResponse(res, options.statusCode, "fail", message);
};

export const globalLimiter = rateLimit({
  ...COMMON,
  windowMs: QUARTER_HOUR_MS,
  limit: GLOBAL_MAX_PER_QUARTER_HOUR,
  handler: refuse("Trop de requêtes. Merci de patienter quelques minutes."),
});

export const authLimiter = rateLimit({
  ...COMMON,
  windowMs: QUARTER_HOUR_MS,
  limit: AUTH_MAX_FAILURES_PER_QUARTER_HOUR,
  // Une connexion REUSSIE ne consomme pas le quota : seul l'echec compte, donc
  // une cliente qui se connecte normalement n'est jamais bloquee.
  skipSuccessfulRequests: true,
  handler: refuse("Trop de tentatives de connexion. Réessayez dans quinze minutes."),
});

/** Ecritures publiques (commande, code promo) : genereux, mais pas illimite. */
export const writeLimiter = rateLimit({
  ...COMMON,
  windowMs: HOUR_MS,
  limit: PUBLIC_WRITE_MAX_PER_HOUR,
  handler: refuse("Trop d'envois successifs. Merci de réessayer dans un moment."),
});
