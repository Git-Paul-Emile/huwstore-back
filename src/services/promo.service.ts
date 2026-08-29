import { promoRepository } from "../repositories/promo.repository.js";
import { AppError } from "../utils/AppError.js";
import { promoTypeMap } from "../utils/enumMaps.js";
import { pricingService } from "./pricing.service.js";
import type { promoSchema, promoUpdateSchema, promoValidateSchema } from "../validators/promo.validator.js";
import type { z } from "zod";

const toDto = (promo: NonNullable<Awaited<ReturnType<typeof promoRepository.findById>>>) => ({
  id: promo.id,
  code: promo.code,
  type: promoTypeMap.label(promo.type),
  value: promo.value,
  minCart: promo.minCart,
  used: promo.used,
  limit: promo.limit,
  end: promo.end,
  active: promo.active,
});

export const promoService = {
  list: async () => (await promoRepository.findAll()).map(toDto),

  /**
   * Verifie un code contre un panier reel et renvoie le detail du montant.
   * Rien n'est ecrit ici : le compteur d'utilisation n'est incremente qu'a la
   * validation de la commande, dans la meme transaction que la vente.
   */
  async validate(input: z.infer<typeof promoValidateSchema>) {
    const quote = await pricingService.quote({
      items: input.items,
      deliveryZoneId: input.deliveryZoneId,
      deliveryMode: input.deliveryMode,
      promoCode: input.code,
    });

    return {
      code: quote.promoCode,
      label: quote.promoLabel,
      subtotal: quote.subtotal,
      shippingFee: quote.shippingFee,
      discount: quote.discount,
      total: quote.total,
    };
  },

  async create(input: z.infer<typeof promoSchema>) {
    const existing = await promoRepository.findByCode(input.code);
    if (existing) throw AppError.conflict("Ce code promo existe déjà.");
    const promo = await promoRepository.create({ ...input, type: promoTypeMap.fromLabel(input.type) });
    return toDto(promo);
  },

  async update(id: string, input: z.infer<typeof promoUpdateSchema>) {
    const existing = await promoRepository.findById(id);
    if (!existing) throw AppError.notFound("Code promo introuvable.");
    const { type, ...rest } = input;
    const promo = await promoRepository.update(id, {
      ...rest,
      ...(type ? { type: promoTypeMap.fromLabel(type) } : {}),
    });
    return toDto(promo);
  },

  async remove(id: string) {
    const existing = await promoRepository.findById(id);
    if (!existing) throw AppError.notFound("Code promo introuvable.");
    await promoRepository.remove(id);
  },
};
