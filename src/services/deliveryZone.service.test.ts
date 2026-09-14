import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { deliveryZoneRepository } from "../repositories/deliveryZone.repository.js";
import { deliveryZoneService } from "./deliveryZone.service.js";

const ZONE = {
  id: "z1",
  city: "Dakar",
  country: "Sénégal",
  fee: 2000,
  freeFrom: 75000,
  delay: "24 h",
  relay: false,
  active: true,
};

describe("deliveryZoneService.create", () => {
  afterEach(() => mock.restoreAll());

  it("refuse un doublon casse ignorée", async () => {
    mock.method(deliveryZoneRepository, "findByCityInsensitive", async () => ZONE);
    const create = mock.method(deliveryZoneRepository, "create", async () => ZONE);

    await assert.rejects(
      () => deliveryZoneService.create({ ...ZONE, city: "dakar" }),
      /existe déjà/,
    );
    assert.equal(create.mock.callCount(), 0);
  });

  it("crée la zone quand aucun doublon n'existe", async () => {
    mock.method(deliveryZoneRepository, "findByCityInsensitive", async () => null);
    const create = mock.method(deliveryZoneRepository, "create", async () => ZONE);

    const result = await deliveryZoneService.create(ZONE);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(result.city, "Dakar");
  });
});

describe("deliveryZoneService.update", () => {
  afterEach(() => mock.restoreAll());

  it("refuse un renommage vers un nom déjà pris, casse ignorée", async () => {
    mock.method(deliveryZoneRepository, "findById", async () => ZONE);
    mock.method(
      deliveryZoneRepository,
      "findByCityInsensitive",
      async () => ({ ...ZONE, id: "z2", city: "Thiès" }),
    );
    const update = mock.method(deliveryZoneRepository, "update", async () => ZONE);

    await assert.rejects(
      () => deliveryZoneService.update("z1", { city: "thiès" }),
      /existe déjà/,
    );
    assert.equal(update.mock.callCount(), 0);
  });

  it("laisse passer un simple changement de casse sur son propre nom", async () => {
    mock.method(deliveryZoneRepository, "findById", async () => ZONE);
    mock.method(deliveryZoneRepository, "findByCityInsensitive", async () => ZONE);
    const update = mock.method(deliveryZoneRepository, "update", async () => ({ ...ZONE, city: "DAKAR" }));

    const result = await deliveryZoneService.update("z1", { city: "DAKAR" });

    assert.equal(update.mock.callCount(), 1);
    assert.equal(result.city, "DAKAR");
  });

  it("ne vérifie pas les doublons quand la ville ne change pas", async () => {
    mock.method(deliveryZoneRepository, "findById", async () => ZONE);
    const findDupe = mock.method(deliveryZoneRepository, "findByCityInsensitive", async () => null);
    const update = mock.method(deliveryZoneRepository, "update", async () => ({ ...ZONE, fee: 2500 }));

    await deliveryZoneService.update("z1", { fee: 2500 });

    assert.equal(findDupe.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 1);
  });

  it("refuse la mise à jour d'une zone introuvable", async () => {
    mock.method(deliveryZoneRepository, "findById", async () => null);
    await assert.rejects(() => deliveryZoneService.update("nope", { fee: 1000 }));
  });
});
