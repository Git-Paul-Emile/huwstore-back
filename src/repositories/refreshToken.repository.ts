import { prisma } from "../config/database.js";

/**
 * Acces aux jetons de rafraichissement stockes (rules/architecture.md : seul
 * point d'acces a la table). On ne manipule que des hachages, jamais le jeton
 * en clair - c'est le service qui hache avant d'appeler ici.
 */
export const refreshTokenRepository = {
  create: (data: { userId: string; tokenHash: string; family: string; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),

  findByHash: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),

  revokeById: (id: string) => prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }),

  /** Revoque tous les jetons encore actifs d'une meme famille (reutilisation detectee, ou logout). */
  revokeFamily: (family: string) =>
    prisma.refreshToken.updateMany({ where: { family, revokedAt: null }, data: { revokedAt: new Date() } }),

  /** Nettoyage : retire les jetons expires depuis plus d'un jour. */
  deleteExpired: () =>
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
};
