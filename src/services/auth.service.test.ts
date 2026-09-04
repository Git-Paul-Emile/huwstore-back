import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../repositories/user.repository.js";
import { refreshTokenRepository } from "../repositories/refreshToken.repository.js";
import { signRefreshToken } from "../config/jwt.js";
import { authService } from "./auth.service.js";

const USER = { id: "u1", name: "Awa", phone: "770000000", email: null, role: "CLIENT" as const, passwordHash: "x" };

const storedRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "rt1",
  userId: USER.id,
  tokenHash: "ignored",
  family: "fam-1",
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null as Date | null,
  createdAt: new Date(),
  ...over,
});

describe("authService.refresh", () => {
  afterEach(() => mock.restoreAll());

  it("fait tourner le jeton : révoque l'ancien, en émet un neuf dans la même famille", async () => {
    const token = signRefreshToken({ userId: USER.id, role: "CLIENT" });
    mock.method(refreshTokenRepository, "findByHash", async () => storedRow());
    const revokeById = mock.method(refreshTokenRepository, "revokeById", async () => storedRow({ revokedAt: new Date() }));
    const create = mock.method(refreshTokenRepository, "create", async () => storedRow());
    mock.method(userRepository, "findById", async () => USER);

    const session = await authService.refresh(token);

    assert.equal(revokeById.mock.callCount(), 1);
    assert.equal(create.mock.callCount(), 1);
    assert.equal(create.mock.calls[0].arguments[0].family, "fam-1");
    assert.ok(session.accessToken && session.refreshToken);
  });

  it("détecte la réutilisation : un jeton déjà révoqué invalide toute la famille", async () => {
    const token = signRefreshToken({ userId: USER.id, role: "CLIENT" });
    mock.method(refreshTokenRepository, "findByHash", async () => storedRow({ revokedAt: new Date() }));
    const revokeFamily = mock.method(refreshTokenRepository, "revokeFamily", async () => ({ count: 3 }));

    await assert.rejects(() => authService.refresh(token), /sécurité/);
    assert.equal(revokeFamily.mock.callCount(), 1);
    assert.equal(revokeFamily.mock.calls[0].arguments[0], "fam-1");
  });

  it("refuse un jeton inconnu en base", async () => {
    const token = signRefreshToken({ userId: USER.id, role: "CLIENT" });
    mock.method(refreshTokenRepository, "findByHash", async () => null);
    await assert.rejects(() => authService.refresh(token));
  });

  it("refuse une chaîne qui n'est pas un jeton signé", async () => {
    await assert.rejects(() => authService.refresh("pas-un-jeton"));
  });
});

describe("signRefreshToken", () => {
  it("émet une chaîne différente à chaque appel, même pour le même compte", () => {
    const a = signRefreshToken({ userId: "u1", role: "CLIENT" });
    const b = signRefreshToken({ userId: "u1", role: "CLIENT" });
    assert.notEqual(a, b);
  });
});
