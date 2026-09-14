import { deliveryZoneRepository } from "../repositories/deliveryZone.repository.js";
import { AppError } from "../utils/AppError.js";
import type { deliveryZoneSchema, deliveryZoneUpdateSchema } from "../validators/deliveryZone.validator.js";
import type { z } from "zod";

export const deliveryZoneService = {
  list: () => deliveryZoneRepository.findAll(),

  /**
   * Refuse un doublon casse ignorée : la contrainte d'unicité du schéma
   * laisserait passer "Dakar" à côté d'un "dakar" déjà existant.
   */
  async create(input: z.infer<typeof deliveryZoneSchema>) {
    const existing = await deliveryZoneRepository.findByCityInsensitive(input.city, input.country);
    if (existing) throw AppError.conflict(`Une zone "${existing.city}" existe déjà pour ce pays.`);
    return deliveryZoneRepository.create(input);
  },

  async update(id: string, input: z.infer<typeof deliveryZoneUpdateSchema>) {
    const zone = await deliveryZoneRepository.findById(id);
    if (!zone) throw AppError.notFound("Zone de livraison introuvable.");

    const nextCity = input.city ?? zone.city;
    const nextCountry = input.country ?? zone.country;
    // Vérifié seulement si la ville ou le pays change réellement : modifier
    // le frais d'une zone ne doit pas se heurter à son propre nom.
    if (nextCity !== zone.city || nextCountry !== zone.country) {
      const existing = await deliveryZoneRepository.findByCityInsensitive(nextCity, nextCountry);
      if (existing && existing.id !== id) throw AppError.conflict(`Une zone "${existing.city}" existe déjà pour ce pays.`);
    }

    return deliveryZoneRepository.update(id, input);
  },

  async remove(id: string) {
    const zone = await deliveryZoneRepository.findById(id);
    if (!zone) throw AppError.notFound("Zone de livraison introuvable.");
    await deliveryZoneRepository.remove(id);
  },
};
