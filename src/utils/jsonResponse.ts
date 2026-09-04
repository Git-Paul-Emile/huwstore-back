import type { Response } from "express";

type JsonStatus = "success" | "error" | "not_found" | "fail" | "unauthorized";

/** Métadonnées de pagination renvoyées avec toute collection paginée. */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

/**
 * Enveloppe de réponse unique pour toute l'API.
 *
 * `data` porte la ressource (ou la liste), `meta` porte la pagination.
 * Les séparer évite au client de deviner si data est un tableau ou un objet
 * paginé selon l'endpoint : la forme est toujours la même.
 */
export function jsonResponse<T>(
  res: Response,
  httpStatus: number,
  status: JsonStatus,
  message: string,
  data: T | null = null,
  meta?: PaginationMeta,
) {
  return res.status(httpStatus).json({ status, message, data, ...(meta ? { meta } : {}) });
}

/**
 * Suppression réussie : 204 sans corps (rules/api.md, table des verbes).
 * Le client sait que la ressource n'est plus là, il n'a rien à lire.
 */
export function noContent(res: Response) {
  return res.status(204).end();
}
