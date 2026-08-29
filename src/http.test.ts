/**
 * Tests d'intégration de la pile HTTP (rules/testing.md).
 *
 * On démarre l'application Express réelle - middlewares, routage, validation,
 * gestion d'erreurs, compression - et on l'interroge par le réseau. La couche
 * d'accès aux données est neutralisée au cas par cas : ces tests vérifient le
 * contrat HTTP, pas la base. Les tests de bout en bout avec base réelle vivent
 * côté front (Playwright), lancés contre une pile complète.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { createApp } from "./config/app.js";
import { productRepository } from "./repositories/product.repository.js";
import { productService } from "./services/product.service.js";

let server: Server;
let baseUrl: string;

const call = (path: string, init?: RequestInit) => fetch(`${baseUrl}${path}`, init);

before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
});

describe("enveloppe & routage", () => {
  it("répond une 404 enveloppée sur une route inconnue", async () => {
    const response = await call("/api/v1/inconnu");
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.status, "not_found");
    assert.equal(body.data, null);
  });

  it("redirige l'ancienne base /api vers /api/v1 en conservant la méthode", async () => {
    const response = await call("/api/products", { redirect: "manual" });
    assert.equal(response.status, 308);
    assert.match(response.headers.get("location") ?? "", /\/api\/v1\/products/);
  });

  it("pose les en-têtes de sécurité de helmet", async () => {
    const response = await call("/api/v1/products");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-powered-by"), null);
  });
});

describe("validation & authentification", () => {
  it("refuse un avis au corps invalide avant tout accès base (400 + détails)", async () => {
    // Route publique avec validateur : la validation Zod doit rejeter avant
    // toute écriture en base.
    const response = await call("/api/v1/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.status, "fail");
    assert.ok(Array.isArray(body.errors));
  });

  it("exige un jeton pour passer une commande (401)", async () => {
    const response = await call("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ variantId: "v1", qty: 1 }] }),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).status, "unauthorized");
  });

  it("exige un jeton sur la liste des commandes (401)", async () => {
    const response = await call("/api/v1/orders");
    assert.equal(response.status, 401);
    assert.equal((await response.json()).status, "unauthorized");
  });

  it("rejette un téléphone mal formé à la connexion (400)", async () => {
    const response = await call("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "12", password: "x" }),
    });
    assert.equal(response.status, 400);
  });

  it("refuse /auth/refresh sans jeton anti-CSRF (403)", async () => {
    const response = await call("/api/v1/auth/refresh", { method: "POST" });
    assert.equal(response.status, 403);
  });
});

describe("santé & plan du site", () => {
  it("expose la file de tâches et les services externes sur /health", async () => {
    const response = await call("/health");
    const body = await response.json();
    assert.ok(["ok", "degraded"].includes(body.status));
    assert.ok(body.queue && Array.isArray(body.queue.handlers));
    assert.ok(body.external?.mailer?.name);
  });

  it("génère un sitemap XML depuis le catalogue", async () => {
    productRepository.findIndexableForSitemap = async () => [
      { id: "tote-bag-coton-durable", updatedAt: new Date("2026-02-01T00:00:00Z") },
    ];
    const response = await call("/sitemap.xml");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /xml/);
    const xml = await response.text();
    assert.match(xml, /<loc>[^<]+\/produit\/tote-bag-coton-durable<\/loc>/);
    assert.match(xml, /<lastmod>2026-02-01<\/lastmod>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  });
});

describe("compression", () => {
  it("compresse une réponse JSON quand le client l'accepte", async () => {
    productService.list = async () => ({
      items: Array.from({ length: 40 }, (_unused, index) => ({
        id: `p-${index}`,
        name: "Sac de démonstration au nom volontairement long",
        description: "x".repeat(80),
      })) as never,
      meta: { page: 1, limit: 40, total: 40, totalPages: 1, hasNext: false, hasPrev: false },
    });

    const response = await call("/api/v1/products", { headers: { "accept-encoding": "gzip" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-encoding"), "gzip");
    assert.match(response.headers.get("vary") ?? "", /Accept-Encoding/);
  });
});
