import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

/** Identifiant fige de l'unique ligne de configuration. */
export const SETTINGS_ID = "shop";

export const settingRepository = {
  find: () => prisma.setting.findUnique({ where: { id: SETTINGS_ID } }),

  /**
   * Cree la ligne si elle n'existe pas encore, sinon la renvoie telle quelle.
   * Evite d'avoir a seeder la table pour que la boutique demarre.
   */
  ensure: () =>
    prisma.setting.upsert({ where: { id: SETTINGS_ID }, update: {}, create: { id: SETTINGS_ID } }),

  update: (data: Prisma.SettingUpdateInput) => prisma.setting.update({ where: { id: SETTINGS_ID }, data }),
};
