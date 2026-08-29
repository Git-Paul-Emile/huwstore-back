import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const addressRepository = {
  findByUser: (userId: string) =>
    prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),

  findById: (id: string) => prisma.address.findUnique({ where: { id } }),

  countByUser: (userId: string) => prisma.address.count({ where: { userId } }),

  create: (data: Prisma.AddressCreateInput) => prisma.address.create({ data }),

  update: (id: string, data: Prisma.AddressUpdateInput) => prisma.address.update({ where: { id }, data }),

  remove: (id: string) => prisma.address.delete({ where: { id } }),

  /**
   * Une seule adresse par defaut par client. La bascule est atomique : sans la
   * transaction, une coupure entre les deux ecritures laisserait zero ou deux
   * adresses par defaut.
   */
  setDefault: (userId: string, id: string) =>
    prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    }),
};
