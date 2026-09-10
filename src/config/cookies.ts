import type { CookieOptions } from "express";
import { env, isProduction } from "./env.js";

/**
 * Cookies de session.
 *
 * Le jeton de rafraîchissement vit dans un cookie `HttpOnly` : le JavaScript de
 * la page ne peut pas le lire, donc une faille XSS ne permet pas de voler une
 * session de 30 jours. Le jeton d'accès, lui, ne dure que 15 minutes et reste
 * en mémoire du navigateur (jamais dans localStorage).
 *
 * Deux montages possibles en production :
 *  - front et API sur deux domaines distincts (Vercel + Render) : le cookie
 *    doit être `SameSite=None; Secure`, et les navigateurs qui bloquent les
 *    cookies tiers le perdent malgré tout au rechargement ;
 *  - API sur un sous-domaine du site (`api.huwstore.com`) : renseigner
 *    `COOKIE_DOMAIN=.huwstore.com`, le cookie devient "same-site", `Lax` suffit
 *    et il survit au rechargement partout.
 *
 * En développement tout est sur localhost : `Lax` suffit, `None` sans HTTPS
 * serait rejeté par le navigateur.
 */
export const REFRESH_COOKIE = "mw-refresh-token";
export const CSRF_COOKIE = "mw-csrf";
export const CSRF_HEADER = "x-csrf-token";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const cookieDomain = env.COOKIE_DOMAIN?.trim() || undefined;

/**
 * Base commune aux deux cookies. `sameSite` : `Lax` dès qu'un domaine partagé
 * est configuré (API en sous-domaine, donc same-site), `None` sinon en
 * production (domaines distincts), `Lax` en développement.
 */
const baseOptions: CookieOptions = {
  secure: isProduction,
  sameSite: cookieDomain ? "lax" : isProduction ? "none" : "lax",
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  path: "/",
  maxAge: THIRTY_DAYS_MS,
};

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  ...baseOptions,
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
  ...baseOptions,
};
