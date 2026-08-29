import { settingRepository } from "../repositories/setting.repository.js";
import type { settingUpdateSchema } from "../validators/setting.validator.js";
import type { z } from "zod";

type SettingRow = NonNullable<Awaited<ReturnType<typeof settingRepository.find>>>;

const toDto = (setting: SettingRow) => ({
  shopName: setting.shopName,
  phone: setting.phone,
  whatsapp: setting.whatsapp,
  email: setting.email ?? undefined,
  city: setting.city,
  country: setting.country,
  addressLine: setting.addressLine ?? undefined,
  ninea: setting.ninea ?? undefined,
  instagramUrl: setting.instagramUrl ?? undefined,
  facebookUrl: setting.facebookUrl ?? undefined,
  tiktokUrl: setting.tiktokUrl ?? undefined,
  announcement: setting.announcement ?? undefined,
});

export type SettingDto = ReturnType<typeof toDto>;

/**
 * Parametres de la boutique.
 *
 * Ils remplacent les valeurs qui etaient auparavant ecrites en dur dans le
 * front (nom, telephone, WhatsApp, reseaux sociaux, bandeau d'annonce). La
 * boutique peut donc changer de numero sans redeploiement.
 */
export const settingService = {
  /** Toujours disponible : la ligne est creee a la volee au premier appel. */
  get: async () => toDto(await settingRepository.ensure()),

  async update(input: z.infer<typeof settingUpdateSchema>) {
    await settingRepository.ensure();
    return toDto(await settingRepository.update(input));
  },
};
