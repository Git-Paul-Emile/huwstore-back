import type { NextFunction, Request, Response } from "express";

/**
 * Pose un `Cache-Control` sur les GET publics du catalogue.
 *
 * Le navigateur sert alors la copie en cache immédiatement pendant `max-age`,
 * puis, jusqu'à `stale-while-revalidate` plus tard, il l'affiche encore tout de
 * suite ET rafraîchit en arrière-plan. C'est ce qui supprime l'écran de
 * chargement à chaque rechargement de page.
 *
 * Jamais sur une réponse authentifiée (en-tête `Authorization`) ou une vue
 * back-office (`?all=`) : elle dépend de l'utilisateur et ne doit pas atterrir
 * dans un cache partagé. `Vary: Authorization` le garantit auprès des
 * intermédiaires.
 */
export function publicCache(maxAgeSeconds: number, staleWhileRevalidateSeconds: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.vary("Authorization");

    if (req.headers.authorization || req.query.all !== undefined) {
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
