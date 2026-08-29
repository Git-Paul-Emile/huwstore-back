import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CircuitBreaker, CircuitOpenError, TimeoutError, resilient, withRetry, withTimeout } from "./resilience.js";

describe("withTimeout", () => {
  it("rend la valeur quand l'opération répond à temps", async () => {
    const value = await withTimeout("op", 50, async () => "ok");
    assert.equal(value, "ok");
  });

  it("rejette avec TimeoutError au-delà du délai", async () => {
    await assert.rejects(
      withTimeout("op", 20, () => new Promise((resolve) => setTimeout(resolve, 200))),
      (error) => error instanceof TimeoutError,
    );
  });

  it("signale l'abandon via AbortSignal", async () => {
    let aborted = false;
    await assert.rejects(
      withTimeout("op", 20, (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
        return new Promise((resolve) => setTimeout(resolve, 200));
      }),
    );
    assert.equal(aborted, true);
  });
});

describe("withRetry", () => {
  it("réessaie puis réussit", async () => {
    let calls = 0;
    const value = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("transitoire");
        return "ok";
      },
      { attempts: 3, baseDelayMs: 1 },
    );
    assert.equal(value, "ok");
    assert.equal(calls, 3);
  });

  it("s'arrête immédiatement si l'erreur n'est pas rejouable", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("définitive");
        },
        { attempts: 5, baseDelayMs: 1, retryable: () => false },
      ),
    );
    assert.equal(calls, 1);
  });

  it("propage la dernière erreur après épuisement des tentatives", async () => {
    await assert.rejects(
      withRetry(async () => Promise.reject(new Error("toujours")), { attempts: 2, baseDelayMs: 1 }),
      /toujours/,
    );
  });
});

describe("CircuitBreaker", () => {
  it("s'ouvre après le seuil d'échecs et court-circuite", async () => {
    const breaker = new CircuitBreaker("test", { failureThreshold: 2, openMs: 1_000 });
    const boom = () => breaker.run(async () => Promise.reject(new Error("ko")));

    await assert.rejects(boom());
    await assert.rejects(boom());
    // Circuit ouvert : l'appel suivant échoue sans exécuter l'opération.
    await assert.rejects(boom(), (error) => error instanceof CircuitOpenError);
    assert.equal(breaker.snapshot().state, "open");
  });

  it("se referme après un essai réussi passé le délai", async () => {
    const breaker = new CircuitBreaker("test", { failureThreshold: 1, openMs: 20 });
    await assert.rejects(breaker.run(async () => Promise.reject(new Error("ko"))));
    assert.equal(breaker.snapshot().state, "open");

    await new Promise((resolve) => setTimeout(resolve, 30));
    const value = await breaker.run(async () => "ok");
    assert.equal(value, "ok");
    assert.equal(breaker.snapshot().state, "closed");
  });
});

describe("resilient (façade)", () => {
  it("compose timeout + retry + circuit breaker", async () => {
    let calls = 0;
    const value = await resilient({ label: "op", timeoutMs: 100, retry: { attempts: 3, baseDelayMs: 1 } }, async () => {
      calls += 1;
      if (calls < 2) throw new Error("transitoire");
      return "ok";
    });
    assert.equal(value, "ok");
    assert.equal(calls, 2);
  });
});
