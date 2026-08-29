import type { Promo } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { productRepository } from "../repositories/product.repository.js";
import { deliveryZoneRepository } from "../repositories/deliveryZone.repository.js";
import { promoRepository } from "../repositories/promo.repository.js";
import { assertPromoUsable, computeDiscount, computeShippingFee, promoLabel } from "./pricing.rules.js";

/**
 * Calcul du montant d'une commande.
 *
 * Regle unique et non negociable : le navigateur n'envoie JAMAIS un montant.
 * Il envoie des identifiants de declinaison, des quantites, une zone et
 * eventuellement un code promo ; tout le reste est recalcule ici. Le panier
 * du front refait le meme calcul pour l'affichage, mais c'est cette fonction
 * qui fait foi au moment d'enregistrer.
 *
 * Ce service est partage par deux appelants :
 *  - POST /orders            -> enregistre la commande avec ces montants
 *  - POST /promos/validate   -> previsualise la remise sans rien enregistrer
 * Un seul calcul, donc aucun risque de divergence entre l'apercu et la vente.
 */

export type PricedLine = {
  variantId: string;
  productId: string;
  name: string;
  color: string;
  qty: number;
  /** Prix unitaire fige a l'instant du calcul. */
  price: number;
  label: string;
};

export type PriceBreakdown = {
  lines: PricedLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  promoCode: string | null;
  promoLabel: string | null;
};

export type PriceInput = {
  items: { variantId: string; qty: number }[];
  deliveryZoneId?: string;
  deliveryMode?: "Domicile" | "Point relais";
  promoCode?: string;
};

export const pricingService = {
  /**
   * Verifie la disponibilite, fige les prix et produit le detail du montant.
   * Leve une 400 explicite au premier probleme : mieux vaut refuser avant
   * d'ecrire que d'echouer au milieu d'une transaction.
   */
  async quote(input: PriceInput): Promise<PriceBreakdown> {
    const variants = await productRepository.findActiveVariantsForPricing(input.items.map((i) => i.variantId));

    if (variants.length !== input.items.length) {
      throw AppError.badRequest("Un ou plusieurs articles sont introuvables ou ne sont plus disponibles.");
    }

    const lines: PricedLine[] = input.items.map((line) => {
      const variant = variants.find((v) => v.id === line.variantId)!;
      if (!variant.product.active) throw AppError.badRequest(`${variant.product.name} n'est plus en vente.`);

      const available = variant.stock?.qty ?? 0;
      if (available < line.qty) {
        throw AppError.badRequest(
          `Stock insuffisant pour ${variant.product.name} (${variant.colorName}) : ${available} disponible(s).`,
        );
      }

      return {
        variantId: variant.id,
        productId: variant.product.id,
        name: variant.product.name,
        color: variant.colorName,
        qty: line.qty,
        price: variant.product.price,
        label: `${variant.product.name} - ${variant.colorName}`,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

    // Frais de port : la zone est relue en base, jamais recue du navigateur.
    let zone: { fee: number; freeFrom: number } | null = null;
    if (input.deliveryZoneId) {
      zone = await deliveryZoneRepository.findById(input.deliveryZoneId);
      if (!zone) throw AppError.badRequest("Zone de livraison inconnue.");
    }
    const shippingFee = computeShippingFee(subtotal, zone, input.deliveryMode);

    // Remise.
    let discount = 0;
    let promo: Promo | null = null;
    if (input.promoCode) {
      const code = input.promoCode.trim().toUpperCase();
      promo = assertPromoUsable(await promoRepository.findByCode(code), code, subtotal);
      discount = computeDiscount(promo, subtotal, shippingFee);
    }

    return {
      lines,
      subtotal,
      shippingFee,
      discount,
      total: subtotal + shippingFee - discount,
      promoCode: promo?.code ?? null,
      promoLabel: promo ? promoLabel(promo) : null,
    };
  },
};
