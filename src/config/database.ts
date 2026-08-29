import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/**
 * Options des transactions interactives (`prisma.$transaction(async (tx) => …)`).
 *
 * La valeur par défaut de Prisma (5 s) est trop courte pour une transaction qui
 * enchaîne plusieurs allers-retours quand la base est distante (Neon) et
 * l'application dans une autre région : une vente, ou l'édition d'une fiche
 * produit avec ses coloris, ne doit pas échouer sur une latence réseau.
 */
export const TX_OPTIONS = { maxWait: 5_000, timeout: 20_000 } as const;
