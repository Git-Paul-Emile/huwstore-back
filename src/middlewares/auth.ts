import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken, type JwtPayload } from "../config/jwt.js";

declare global {
  // Augmenter Express.Request impose la syntaxe `namespace` : c'est l'API
  // d'extension de types fournie par @types/express, il n'existe pas
  // d'équivalent en `module`. Désactivation limitée à ce bloc.
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

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") throw AppError.forbidden();
  next();
}
