import { settingRepository } from "../repositories/setting.repository.js";
import { TtlCache } from "../lib/cache.js";
import type { settingUpdateSchema } from "../validators/setting.validator.js";
import type { z } from "zod";

/**
 * Les paramètres sont lus à chaque e-mail, chaque facture et chaque chargement
 * de la vitrine, mais changent quelques fois par an : 60 s de cache évitent des
 * milliers de lectures identiques sans jamais afficher une info vraiment périmée.
 */
const CACHE_KEY = "settings";
const cache = new TtlCache(60_000);

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
  get: (): Promise<SettingDto> => cache.remember(CACHE_KEY, async () => toDto(await settingRepository.ensure())),

  async update(input: z.infer<typeof settingUpdateSchema>) {
    await settingRepository.ensure();
    const updated = toDto(await settingRepository.update(input));
    cache.invalidate(CACHE_KEY);
    return updated;
  },
};
