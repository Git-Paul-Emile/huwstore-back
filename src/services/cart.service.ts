import { cartRepository } from "../repositories/cart.repository.js";
import { productService } from "./product.service.js";

/**
 * Panier cote serveur, sur le meme principe que les favoris
 * (wishlist.service.ts) : une visiteuse non connectee garde un panier local,
 * verse dans son compte a la connexion (merge).
 *
 * Une ligne ne stocke que l'identifiant de declinaison et la quantite ;
 * produit et declinaison affiches viennent toujours du catalogue en direct,
 * jamais d'une copie qui pourrait se perimer (prix, stock, photos).
 */
async function hydrate(userId: string) {
  const rows = await cartRepository.findByUser(userId);

  const lines = await Promise.all(
    rows.map(async (row) => {
      // Un produit retire du catalogue depuis l'ajout au panier ne doit pas
      // faire planter tout le panier : la ligne disparait silencieusement, le
      // stock l'aurait de toute facon bloquee a la commande.
      const product = await productService.getById(row.variant.productId).catch(() => null);
      const variant = product?.variants.find((v) => v.id === row.variantId);
      if (!product || !variant) return null;
      return { product, variant, qty: row.qty };
    }),
  );

  return lines.filter((line): line is NonNullable<typeof line> => line !== null);
}

export const cartService = {
  list: (userId: string) => hydrate(userId),

  async add(userId: string, variantId: string, qty: number) {
    await cartRepository.upsertAdd(userId, variantId, qty);
    return hydrate(userId);
  },

  async setQty(userId: string, variantId: string, qty: number) {
    await cartRepository.setQty(userId, variantId, qty);
    return hydrate(userId);
  },

  async remove(userId: string, variantId: string) {
    await cartRepository.remove(userId, variantId);
    return hydrate(userId);
  },

  clear: (userId: string) => cartRepository.clear(userId),

  async merge(userId: string, lines: { variantId: string; qty: number }[]) {
    if (lines.length > 0) await cartRepository.merge(userId, lines);
    return hydrate(userId);
  },
};
