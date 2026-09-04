import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ZodError, z } from "zod";
import type { Request, Response } from "express";
import { validate } from "./validate.js";

const run = (mw: ReturnType<typeof validate>, req: Partial<Request>) =>
  new Promise<unknown>((resolve) => {
    mw(req as Request, {} as Response, (err?: unknown) => resolve(err));
  });

describe("validate", () => {
  const schema = z.object({ name: z.string().min(2) });

  it("retire les champs non déclarés (anti Mass Assignment)", async () => {
    const req = { body: { name: "Awa", role: "ADMIN" } } as Partial<Request>;
    const err = await run(validate({ body: schema }), req);

    assert.equal(err, undefined);
    assert.deepEqual(req.valid?.body, { name: "Awa" });
  });

  it("passe une ZodError au middleware suivant quand l'entrée est invalide", async () => {
    const err = await run(validate({ body: schema }), { body: { name: "A" } });
    assert.ok(err instanceof ZodError);
  });

  it("valide aussi la query", async () => {
    const req = { query: { page: "2" } } as unknown as Partial<Request>;
    await run(validate({ query: z.object({ page: z.coerce.number() }) }), req);
    assert.deepEqual(req.valid?.query, { page: 2 });
  });
});
