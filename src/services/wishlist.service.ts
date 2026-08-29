import { wishlistRepository } from "../repositories/wishlist.repository.js";

/**
 * Favoris cote serveur.
 *
 * Le front garde une liste locale pour les visiteurs non connectes ; a la
 * connexion il appelle merge() pour verser cette liste dans le compte. C'est
 * la raison d'etre de merge : ne pas faire perdre a une cliente les favoris
 * qu'elle a coches avant de creer son compte.
 */
export const wishlistService = {
  list: async (userId: string) => (await wishlistRepository.findByUser(userId)).map((row) => row.productId),

  async add(userId: string, productId: string) {
    await wishlistRepository.add(userId, productId);
    return wishlistService.list(userId);
  },

  async remove(userId: string, productId: string) {
    await wishlistRepository.remove(userId, productId);
    return wishlistService.list(userId);
  },

  async merge(userId: string, productIds: string[]) {
    if (productIds.length > 0) await wishlistRepository.merge(userId, productIds);
    return wishlistService.list(userId);
  },
};
