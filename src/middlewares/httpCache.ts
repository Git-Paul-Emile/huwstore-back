import type { NextFunction, Request, Response } from "express";
import { REFRESH_COOKIE, CSRF_COOKIE } from "../config/cookies.js";

/**
 * Pose un `Cache-Control` sur les GET publics du catalogue.
 *
 * Le navigateur sert alors la copie en cache immédiatement pendant `max-age`,
 * puis, jusqu'à `stale-while-revalidate` plus tard, il l'affiche encore tout de
 * suite ET rafraîchit en arrière-plan. C'est ce qui supprime l'écran de
 * chargement à chaque rechargement de page.
 *
 * `public` UNIQUEMENT pour une visiteuse réellement anonyme : ni en-tête
 * `Authorization`, ni cookie de session, ni `?all=`. Dès qu'un navigateur a une
 * session (une gérante du back-office, une cliente connectée), la réponse est
 * `no-store` : sinon, juste après une suppression, le navigateur re-servirait
 * pendant `max-age` la liste d'avant, et l'élément supprimé semblerait toujours
 * là. La perte de cache pour ces cas est assumée - ils sont minoritaires et
 * exigent une vue toujours juste.
 */
const SESSION_COOKIES = [REFRESH_COOKIE, CSRF_COOKIE];

function hasSession(req: Request): boolean {
  if (req.headers.authorization) return true;
  const cookie = req.headers.cookie ?? "";
  return SESSION_COOKIES.some((name) => cookie.includes(`${name}=`));
}

export function publicCache(maxAgeSeconds: number, staleWhileRevalidateSeconds: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.vary("Authorization");

    if (hasSession(req) || req.query.all !== undefined) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader(
        "Cache-Control",
        `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
      );
    }

    next();
  };
}
