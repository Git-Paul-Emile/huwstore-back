import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const deliveryZoneRepository = {
  findAll: () => prisma.deliveryZone.findMany({ orderBy: { city: "asc" } }),
  findById: (id: string) => prisma.deliveryZone.findUnique({ where: { id } }),
  create: (data: Prisma.DeliveryZoneCreateInput) => prisma.deliveryZone.create({ data }),
  update: (id: string, data: Prisma.DeliveryZoneUpdateInput) => prisma.deliveryZone.update({ where: { id }, data }),
  remove: (id: string) => prisma.deliveryZone.delete({ where: { id } }),

  /**
   * Cherche une zone du même nom, casse ignorée - "Dakar" et "dakar" doivent
   * se voir comme un seul et même doublon. La contrainte `@@unique` du schéma
   * ne le fait pas : elle compare les chaînes telles quelles.
   */
  findByCityInsensitive: (city: string, country: string) =>
    prisma.deliveryZone.findFirst({
      where: { city: { equals: city, mode: "insensitive" }, country: { equals: country, mode: "insensitive" } },
    }),
};
