import { deliveryZoneRepository } from "../repositories/deliveryZone.repository.js";
import { AppError } from "../utils/AppError.js";
import type { deliveryZoneSchema, deliveryZoneUpdateSchema } from "../validators/deliveryZone.validator.js";
import type { z } from "zod";

export const deliveryZoneService = {
  list: () => deliveryZoneRepository.findAll(),

  create: (input: z.infer<typeof deliveryZoneSchema>) => deliveryZoneRepository.create(input),

  async update(id: string, input: z.infer<typeof deliveryZoneUpdateSchema>) {
    const zone = await deliveryZoneRepository.findById(id);
    if (!zone) throw AppError.notFound("Zone de livraison introuvable.");
    return deliveryZoneRepository.update(id, input);
  },

  async remove(id: string) {
    const zone = await deliveryZoneRepository.findById(id);
    if (!zone) throw AppError.notFound("Zone de livraison introuvable.");
    await deliveryZoneRepository.remove(id);
  },
};
