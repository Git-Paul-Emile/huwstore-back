import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "./env.js";

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  ACCESS_TOKEN_SECRET: "a".repeat(32),
  REFRESH_TOKEN_SECRET: "b".repeat(32),
} as NodeJS.ProcessEnv;

describe("parseEnv", () => {
  it("accepte une configuration minimale et applique les valeurs par défaut", () => {
    const result = parseEnv(base);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.env.PORT, 8000);
      assert.equal(result.env.NODE_ENV, "development");
      assert.equal(result.env.RESEND_FROM_EMAIL, "onboarding@resend.dev");
    }
  });

  it("refuse un secret de jeton trop court", () => {
    const result = parseEnv({ ...base, ACCESS_TOKEN_SECRET: "trop-court" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /ACCESS_TOKEN_SECRET/);
  });

  it("refuse l'absence de DATABASE_URL", () => {
    const withoutDb: NodeJS.ProcessEnv = { ...base };
    delete withoutDb.DATABASE_URL;
    const result = parseEnv(withoutDb);
    assert.equal(result.ok, false);
  });

  it("exige une URL publique réelle en production", () => {
    const result = parseEnv({ ...base, NODE_ENV: "production" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /SITE_URL/);
  });

  it("accepte la production quand les URL publiques sont fournies", () => {
    const result = parseEnv({
      ...base,
      NODE_ENV: "production",
      CLIENT_URL: "https://huwstore.com",
      SITE_URL: "https://huwstore.com",
    });
    assert.equal(result.ok, true);
  });
});
