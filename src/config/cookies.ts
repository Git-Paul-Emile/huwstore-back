import type { CookieOptions } from "express";
import { isProduction } from "./env.js";

/**
 * Cookies de session.
 *
 * Le jeton de rafraîchissement vit dans un cookie `HttpOnly` : le JavaScript de
 * la page ne peut pas le lire, donc une faille XSS ne permet pas de voler une
 * session de 30 jours. Le jeton d'accès, lui, ne dure que 15 minutes et reste
 * en mémoire du navigateur (jamais dans localStorage).
 *
 * En production, le front (Vercel) et l'API (Render) sont sur deux domaines :
 * le cookie doit donc être `SameSite=None; Secure`, sinon le navigateur ne
 * l'envoie tout simplement pas. En développement, tout est sur localhost et
 * `Lax` suffit - `None` sans HTTPS serait rejeté par le navigateur.
 */
export const REFRESH_COOKIE = "mw-refresh-token";
export const CSRF_COOKIE = "mw-csrf";
export const CSRF_HEADER = "x-csrf-token";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: THIRTY_DAYS_MS,
};

/**
 * Jeton anti-CSRF, en clair et volontairement lisible par le JavaScript du
 * front : c'est le principe du « double envoi ». Le navigateur joint le cookie
 * automatiquement, mais seul un script de NOTRE origine peut le lire pour le
 * recopier dans l'en-tête. Un site tiers qui déclencherait un appel à
 * /auth/refresh enverrait bien le cookie, sans jamais pouvoir fournir l'en-tête.
 */
export const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: THIRTY_DAYS_MS,
};
