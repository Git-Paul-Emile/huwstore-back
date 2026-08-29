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
const refuse = (message: string) => (req: Request, res: Response, _next: unknown, options: Options) => {
  logger.warn({ ip: req.ip, path: req.originalUrl }, "Limite de débit atteinte");
  jsonResponse(res, options.statusCode, "fail", message);
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: refuse("Trop de requêtes. Merci de patienter quelques minutes."),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Une connexion REUSSIE ne consomme pas le quota : seul l'echec compte, donc
  // une cliente qui se connecte normalement n'est jamais bloquee.
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: refuse("Trop de tentatives de connexion. Réessayez dans quinze minutes."),
});

/** Ecritures publiques (commande, code promo) : genereux, mais pas illimite. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: refuse("Trop d'envois successifs. Merci de réessayer dans un moment."),
});
