import type { Request } from "express";
import { AppError } from "./AppError.js";

// Express 5 types req.params values as `string | string[]` (repeated route segments).
// Our routes never repeat a param, so this narrows it back to `string` in one place.
export function getParam(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw AppError.badRequest(`Paramètre "${key}" manquant ou invalide.`);
  }
  return value;
}
