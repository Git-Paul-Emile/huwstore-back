import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailSchema, passwordSchema, phoneSchema } from "./common.js";

describe("phoneSchema", () => {
  it("accepte un numéro sénégalais écrit avec des espaces", () => {
    assert.equal(phoneSchema.parse("77 123 45 67"), "771234567");
  });

  it("normalise l'indicatif international vers la forme locale", () => {
    // Sans cette normalisation, la même cliente serait enregistrée deux fois.
    assert.equal(phoneSchema.parse("+221 77 123 45 67"), "771234567");
    assert.equal(phoneSchema.parse("0022177 123 45 67"), "771234567");
  });

  it("accepte les préfixes réellement attribués au Sénégal", () => {
    for (const prefix of ["70", "75", "76", "77", "78"]) {
      assert.equal(phoneSchema.parse(`${prefix}1234567`), `${prefix}1234567`);
    }
  });

  it("refuse un numéro trop court ou au mauvais préfixe", () => {
    assert.throws(() => phoneSchema.parse("7712345"));
    assert.throws(() => phoneSchema.parse("711234567"));
    assert.throws(() => phoneSchema.parse("pas un numéro"));
  });
});

describe("passwordSchema", () => {
  it("exige au moins huit caractères", () => {
    assert.throws(() => passwordSchema.parse("court"));
    assert.equal(passwordSchema.parse("motdepasse"), "motdepasse");
  });
});

describe("emailSchema", () => {
  it("met l'adresse en minuscules pour éviter les doublons", () => {
    assert.equal(emailSchema.parse("  Awa.Ndiaye@Mail.COM "), "awa.ndiaye@mail.com");
  });

  it("refuse une adresse mal formée", () => {
    assert.throws(() => emailSchema.parse("awa@"));
  });
});
