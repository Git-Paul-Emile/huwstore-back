import type { Request, RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";

/**
 * Validation d'entrée en middleware (rules/backend.md).
 *
 * La validation ne vit pas dans le Controller : le schéma Zod filtre `body`,
 * `query` et `params` AVANT que le Controller ne soit atteint. Un champ non
 * déclaré est retiré (protection contre le Mass Assignment). Une entrée
 * invalide part au middleware d'erreur, qui la traduit en 400 avec le détail
 * par champ.
 *
 * Le résultat validé se lit dans `req.valid`. On ne réécrit pas `req.query`
 * ni `req.params` : selon la version d'Express ce sont des accesseurs en
 * lecture seule. `req.body`, lui, reste une simple propriété.
 */
type Sources = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmentation de type Express, voir middlewares/auth.ts
  namespace Express {
    interface Request {
      /** Entrées validées par le middleware `validate`. */
      valid: { body: unknown; query: unknown; params: unknown };
    }
  }
}

export function validate(sources: Sources): RequestHandler {
  return (req, _res, next) => {
    try {
      req.valid = {
        body: sources.body ? sources.body.parse(req.body) : req.body,
        query: sources.query ? sources.query.parse(req.query) : req.query,
        params: sources.params ? sources.params.parse(req.params) : req.params,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Lecture typée du corps validé. Le middleware `validate({ body })` garantit la forme. */
export const validBody = <S extends ZodTypeAny>(req: Request, _schema: S): z.infer<S> => req.valid.body as z.infer<S>;

/** Lecture typée de la query validée. Le middleware `validate({ query })` garantit la forme. */
export const validQuery = <S extends ZodTypeAny>(req: Request, _schema: S): z.infer<S> => req.valid.query as z.infer<S>;
