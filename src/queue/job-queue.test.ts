import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JobQueue } from "./job-queue.js";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("JobQueue", () => {
  it("traite un job empilé", async () => {
    const queue = new JobQueue({ concurrency: 1 });
    const seen: string[] = [];
    queue.register<string>("greet", async (name) => {
      seen.push(name);
    });

    queue.enqueue("greet", "Awa");
    await queue.drain();

    assert.deepEqual(seen, ["Awa"]);
    assert.equal(queue.stats().completed, 1);
  });

  it("ignore un doublon de clé d'idempotence", async () => {
    const queue = new JobQueue({ concurrency: 1 });
    let runs = 0;
    queue.register("send", async () => {
      runs += 1;
    });

    const first = queue.enqueue("send", {}, { idempotencyKey: "order-1" });
    await queue.drain();
    const second = queue.enqueue("send", {}, { idempotencyKey: "order-1" });
    await queue.drain();

    assert.equal(first, true);
    assert.equal(second, false);
    assert.equal(runs, 1);
  });

  it("rejoue un job qui échoue puis réussit", async () => {
    const queue = new JobQueue({ concurrency: 1, retry: { attempts: 4, baseDelayMs: 1 } });
    let attempts = 0;
    queue.register("flaky", async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("transitoire");
    });

    queue.enqueue("flaky", {});
    await queue.drain();

    assert.equal(attempts, 3);
    assert.equal(queue.stats().completed, 1);
    assert.equal(queue.stats().deadLettered, 0);
  });

  it("met en lettre morte après épuisement des tentatives", async () => {
    const queue = new JobQueue({ concurrency: 1, retry: { attempts: 2, baseDelayMs: 1 } });
    queue.register("broken", async () => {
      throw new Error("toujours ko");
    });

    queue.enqueue("broken", {});
    await queue.drain();

    assert.equal(queue.stats().deadLettered, 1);
    assert.equal(queue.stats().failed, 1);
  });

  it("respecte la limite de concurrence", async () => {
    const queue = new JobQueue({ concurrency: 2 });
    let active = 0;
    let maxActive = 0;
    queue.register("slow", async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await flush();
      active -= 1;
    });

    for (let i = 0; i < 6; i += 1) queue.enqueue("slow", {});
    await queue.drain();

    assert.ok(maxActive <= 2, `concurrence max observée : ${maxActive}`);
    assert.equal(queue.stats().completed, 6);
  });

  it("refuse un job sans handler", () => {
    const queue = new JobQueue();
    assert.equal(queue.enqueue("inconnu", {}), false);
  });
});
