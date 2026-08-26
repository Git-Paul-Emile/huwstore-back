import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { jsonResponse } from "../utils/jsonResponse.js";

// Ne jamais exposer la stack trace au client — seule la console serveur la reçoit.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    jsonResponse(res, err.statusCode, err.status, err.message);
    return;
  }

  console.error(err);
  jsonResponse(res, 500, "error", "Une erreur inattendue est survenue.");
}
