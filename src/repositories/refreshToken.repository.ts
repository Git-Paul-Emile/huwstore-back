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

  /** Revoque tous les jetons encore actifs d'une meme famille (reutilisation detectee). */
  revokeFamily: (family: string) =>
    prisma.refreshToken.updateMany({ where: { family, revokedAt: null }, data: { revokedAt: new Date() } }),

  /**
   * Revoque ET expire tous les jetons encore actifs d'une meme famille -
   * deconnexion explicite seulement.
   *
   * `revokeFamily` seul ne suffit pas ici : `authService.refresh` tolere un
   * jeton revoque depuis moins de `ROTATION_GRACE_MS` (course benigne entre
   * deux onglets pendant une rotation) et rouvre alors une session normale.
   * Applique a une deconnexion volontaire, cette meme tolerance rouvrirait la
   * session quelques secondes apres le clic sur "Se deconnecter" - observe le
   * 14/09/2026 en revenant sur le site depuis une page 404. Expirer le jeton
   * en plus de le revoquer fait echouer `refresh` sur la verification
   * d'expiration, executee AVANT celle de revocation, donc sans jamais passer
   * par la fenetre de grace.
   */
  expireFamily: (family: string) =>
    prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date(), expiresAt: new Date() },
    }),

  /** Nettoyage : retire les jetons expires depuis plus d'un jour. */
  deleteExpired: () =>
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
};
