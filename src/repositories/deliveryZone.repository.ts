import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const deliveryZoneRepository = {
  findAll: () => prisma.deliveryZone.findMany({ orderBy: { city: "asc" } }),
  findById: (id: string) => prisma.deliveryZone.findUnique({ where: { id } }),
  create: (data: Prisma.DeliveryZoneCreateInput) => prisma.deliveryZone.create({ data }),
  update: (id: string, data: Prisma.DeliveryZoneUpdateInput) => prisma.deliveryZone.update({ where: { id }, data }),
  remove: (id: string) => prisma.deliveryZone.delete({ where: { id } }),
};
