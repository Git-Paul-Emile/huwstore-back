import type { Response } from "express";

type JsonStatus = "success" | "error" | "not_found" | "fail" | "unauthorized";

export function jsonResponse<T>(res: Response, httpStatus: number, status: JsonStatus, message: string, data: T | null = null) {
  return res.status(httpStatus).json({ status, message, data });
}
