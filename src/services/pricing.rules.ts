import type { Promo } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

/**
 * Regles de calcul du prix, a l'etat pur.
 *
 * Ce fichier ne connait NI la base de donnees, NI Express : il ne recoit que
 * des nombres et des objets simples. C'est ce qui le rend testable sans
 * infrastructure - et le calcul d'un total est exactement le genre de code
 * qu'il faut pouvoir verifier au caractere pres (rules/testing.md).
 *
 * L'orchestration (lire le stock, relire la zone, incrementer le quota du code
 * promo) vit dans pricing.service.ts, qui appelle ces fonctions.
 */

/**
 * Frais de port applicables.
 *
 * Fonction PURE : elle ne connait ni la base ni la requete, ce qui la rend
 * testable telle quelle. Deux regles, tirees du recueil de besoins :
 *  - le retrait en point relais ne coute rien ;
 *  - chaque zone offre la livraison au-dela d'un montant (freeFrom).
 */
export function computeShippingFee(
  subtotal: number,
  zone: { fee: number; freeFrom: number } | null,
  deliveryMode?: string,
): number {
  if (!zone || deliveryMode === "Point relais") return 0;
  return subtotal >= zone.freeFrom ? 0 : zone.fee;
}

/**
 * Montant d'une remise, plafonne.
 *
 * Le plafond n'est pas cosmetique : sans lui, un code « -20 000 FCFA » sur un
 * panier de 15 000 FCFA produirait un total negatif, c'est-a-dire une commande
 * ou la boutique devrait de l'argent a la cliente.
 */
export function computeDiscount(
  promo: Pick<Promo, "type" | "value">,
  subtotal: number,
  shippingFee: number,
): number {
  const raw =
    promo.type === "POURCENTAGE"
      ? Math.round((subtotal * promo.value) / 100)
      : promo.type === "MONTANT_FIXE"
        ? promo.value
        : shippingFee; // LIVRAISON_OFFERTE

  return Math.max(0, Math.min(raw, subtotal + shippingFee));
}

/** Libelle lisible de la remise, affiche au panier et sur la facture. */
export function promoLabel(promo: Pick<Promo, "type" | "value">): string {
  if (promo.type === "POURCENTAGE") return `-${promo.value} %`;
  if (promo.type === "MONTANT_FIXE") return `-${promo.value.toLocaleString("fr-FR")} FCFA`;
  return "Livraison offerte";
}

/** Un code promo est utilisable si actif, non expire, sous son quota. */
export function assertPromoUsable(promo: Promo | null, code: string, subtotal: number): Promo {
  if (!promo || !promo.active) throw AppError.badRequest(`Le code ${code} n'existe pas ou n'est plus actif.`);
  if (promo.end.getTime() < Date.now()) throw AppError.badRequest(`Le code ${promo.code} a expiré.`);
  if (promo.used >= promo.limit) throw AppError.badRequest(`Le code ${promo.code} a atteint sa limite d'utilisation.`);
  if (subtotal < promo.minCart) {
    throw AppError.badRequest(
      `Le code ${promo.code} s'applique à partir de ${promo.minCart.toLocaleString("fr-FR")} FCFA d'achat.`,
    );
  }
  return promo;
}
