import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken, type JwtPayload } from "../config/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
      /** Identifiant de correlation pose par requestLogger. */
      requestId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) throw AppError.unauthorized();

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");
  }
}

/**
 * Authentification FACULTATIVE.
 *
 * Utilisee sur les routes ouvertes aux visiteurs non connectes (la commande en
 * invite, par exemple) : si un jeton valide est present, on rattache la
 * ressource au compte ; sinon on continue sans erreur. Un jeton invalide est
 * ignore, jamais rejete - sinon un jeton perime bloquerait une vente.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Jeton illisible ou expire : on traite la requete comme anonyme.
    }
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") throw AppError.forbidden();
  next();
}
