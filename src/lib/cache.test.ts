import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TtlCache } from "./cache.js";

describe("TtlCache", () => {
  it("ne charge qu'une fois tant que la valeur est fraîche", async () => {
    const cache = new TtlCache(1_000);
    let loads = 0;
    const load = () => cache.remember("k", async () => ++loads);

    assert.equal(await load(), 1);
    assert.equal(await load(), 1);
    assert.equal(loads, 1);
  });

  it("recharge après expiration", async () => {
    const cache = new TtlCache(10);
    let loads = 0;
    const load = () => cache.remember("k", async () => ++loads);

    await load();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(await load(), 2);
  });

  it("recharge après invalidation explicite", async () => {
    const cache = new TtlCache(10_000);
    let loads = 0;
    const load = () => cache.remember("k", async () => ++loads);

    await load();
    cache.invalidate("k");
    assert.equal(await load(), 2);
  });
});
