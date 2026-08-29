import type { NextFunction, Request, Response } from "express";
import { promisify } from "node:util";
import zlib from "node:zlib";

/**
 * Compression des réponses (rules/performance.md, rules/SEO.md).
 *
 * Implémentation volontairement sans dépendance : l'API ne renvoie que du JSON
 * et quelques fichiers (CSV, facture PDF), tous de taille modeste. On met donc
 * la réponse en tampon, et si elle dépasse un seuil et que son type se
 * compresse utilement, on l'encode - Brotli de préférence, sinon gzip.
 *
 * Ce qui n'est PAS compressé : les réponses courtes (l'en-tête coûterait plus
 * que le gain), les binaires déjà compressés (PDF, images), et les réponses
 * dont un `Content-Encoding` a déjà été posé en amont.
 */

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

/** En dessous, le gain ne couvre pas le surcoût des en-têtes. */
const MIN_BYTES = 1024;

const COMPRESSIBLE = /^(?:text\/|application\/(?:json|xml|javascript|manifest\+json|ld\+json)|image\/svg\+xml)/i;

function pickEncoding(header: string | undefined): "br" | "gzip" | null {
  if (!header) return null;
  const accepted = header.toLowerCase();
  if (accepted.includes("br")) return "br";
  if (accepted.includes("gzip")) return "gzip";
  return null;
}

function toBuffer(chunk: unknown, encoding?: BufferEncoding): Buffer | null {
  if (!chunk) return null;
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === "string") return Buffer.from(chunk, encoding ?? "utf8");
  return Buffer.from(chunk as ArrayBuffer);
}

export function compression(req: Request, res: Response, next: NextFunction) {
  const encoding = pickEncoding(req.headers["accept-encoding"] as string | undefined);
  if (!encoding || req.method === "HEAD") return next();

  const chunks: Buffer[] = [];
  const originalWrite = res.write.bind(res) as Response["write"];
  const originalEnd = res.end.bind(res) as Response["end"];

  res.write = function patchedWrite(chunk: unknown, encodingOrCb?: unknown, cb?: unknown): boolean {
    const buffer = toBuffer(chunk, typeof encodingOrCb === "string" ? (encodingOrCb as BufferEncoding) : undefined);
    if (buffer) chunks.push(buffer);
    const callback = typeof encodingOrCb === "function" ? encodingOrCb : cb;
    if (typeof callback === "function") (callback as () => void)();
    return true;
  } as Response["write"];

  res.end = function patchedEnd(chunk?: unknown, encodingOrCb?: unknown, cb?: unknown): Response {
    const buffer = toBuffer(chunk, typeof encodingOrCb === "string" ? (encodingOrCb as BufferEncoding) : undefined);
    if (buffer) chunks.push(buffer);
    const callback = typeof chunk === "function" ? chunk : typeof encodingOrCb === "function" ? encodingOrCb : cb;

    res.write = originalWrite;
    res.end = originalEnd;

    const body = Buffer.concat(chunks);
    const type = String(res.getHeader("Content-Type") ?? "");
    const skip = res.getHeader("Content-Encoding") || body.length < MIN_BYTES || !COMPRESSIBLE.test(type);

    if (skip) {
      if (body.length > 0) res.setHeader("Content-Length", body.length);
      return originalEnd(body, callback as () => void) as Response;
    }

    const compress = encoding === "br" ? brotli(body) : gzip(body);
    void compress
      .then((encoded) => {
        res.setHeader("Content-Encoding", encoding);
        res.setHeader("Content-Length", encoded.length);
        appendVary(res);
        originalEnd(encoded, callback as () => void);
      })
      .catch(() => {
        res.setHeader("Content-Length", body.length);
        originalEnd(body, callback as () => void);
      });

    return res;
  } as Response["end"];

  next();
}

function appendVary(res: Response) {
  const values = new Set(
    String(res.getHeader("Vary") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  values.add("Accept-Encoding");
  res.setHeader("Vary", [...values].join(", "));
}
