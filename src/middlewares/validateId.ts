import type { NextFunction, Request, Response } from "express";
import { getParam } from "../utils/getParam.js";

export function validateId(req: Request, _res: Response, next: NextFunction) {
  getParam(req, "id");
  next();
}
