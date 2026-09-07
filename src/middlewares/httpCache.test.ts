import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { publicCache } from "./httpCache.js";

type FakeRes = Response & { headers: Record<string, string> };

const run = (req: Partial<Request>) => {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
    vary: mock.fn(),
  } as unknown as FakeRes;
  const next = mock.fn();

  publicCache(60, 600)(req as Request, res, next);
  return { headers, next };
};

describe("publicCache", () => {
  it("met en cache une requête anonyme", () => {
    const { headers, next } = run({ headers: {}, query: {} });
    assert.equal(headers["cache-control"], "public, max-age=60, stale-while-revalidate=600");
    assert.equal(next.mock.callCount(), 1);
  });

  it("refuse le cache d'une requête authentifiée", () => {
    const { headers } = run({ headers: { authorization: "Bearer x" }, query: {} });
    assert.equal(headers["cache-control"], "no-store");
  });

  it("refuse le cache d'une vue back-office (?all)", () => {
    const { headers } = run({ headers: {}, query: { all: "true" } });
    assert.equal(headers["cache-control"], "no-store");
  });

  it("refuse le cache dès qu'un cookie de session est présent", () => {
    const { headers } = run({ headers: { cookie: "mw-refresh-token=abc; autre=1" }, query: {} });
    assert.equal(headers["cache-control"], "no-store");
  });

  it("met en cache si le navigateur n'a que des cookies sans rapport", () => {
    const { headers } = run({ headers: { cookie: "theme=dark" }, query: {} });
    assert.equal(headers["cache-control"], "public, max-age=60, stale-while-revalidate=600");
  });
});
