import type { Request, Response } from "express";
import { jsonResponse } from "../utils/jsonResponse.js";

export function notFound(req: Request, res: Response) {
  jsonResponse(res, 404, "not_found", `Route introuvable : ${req.method} ${req.originalUrl}`);
}
