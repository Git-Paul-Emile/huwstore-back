import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { logger } from "../config/logger.js";

/**
 * Gestion centralisee des erreurs : c'est le SEUL endroit du back qui decide
 * du code HTTP et du message renvoye au client.
 *
 * Trois familles d'erreurs y arrivent :
 *  1. AppError      -> une erreur que le metier a prevue (404, 400, 401...).
 *  2. ZodError      -> une entree invalide : c'est une 400, jamais une 500.
 *  3. le reste      -> un bug. On journalise tout, on ne renvoie qu'un message
 *                      neutre : ni stack trace, ni message d'ORM, qui
 *                      renseigneraient un attaquant sur la structure interne.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    jsonResponse(res, err.statusCode, err.status, err.message);
    return;
  }

  if (err instanceof ZodError) {
    // Un message par champ fautif : le formulaire cote client peut les afficher.
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(racine)",
      message: issue.message,
    }));
    logger.warn({ path: req.originalUrl, details }, "Entrée invalide refusée");
    res.status(400).json({
      status: "fail",
      message: details[0]?.message ?? "Données invalides.",
      data: null,
      errors: details,
    });
    return;
  }

  // Violation d'une contrainte d'unicite : 409, pas 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    jsonResponse(res, 409, "fail", "Cette valeur existe déjà.");
    return;
  }

  logger.error(
    { err, method: req.method, path: req.originalUrl, userId: req.user?.userId },
    "Erreur non gérée",
  );
  jsonResponse(res, 500, "error", "Une erreur inattendue est survenue.");
}
