import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Longueur maximale du resume d'un univers.
 *
 * Le resume est stocke et modifiable depuis le back-office, mais aucune page
 * ne l'affiche encore : la borne tient donc lieu de garde-fou, pour qu'un texte
 * saisi aujourd'hui reste utilisable le jour ou une page s'en servira.
 */
export const CATEGORY_DESCRIPTION_MAX = 110;

export const categorySchema = z.object({
  name: z.string().min(1),
  /** Optionnel : dérivé du nom quand il n'est pas fourni. */
  slug: z.string().regex(slugPattern, "Slug invalide (minuscules, chiffres et tirets).").optional(),
  image: z.string().min(1),
  /**
   * Resume affiche sous le nom de l'univers, sur la page d'accueil. La borne
   * n'est pas decorative : au-dela, le texte deborde des deux lignes prevues
   * par la carte et casse l'alignement de la bande. La chaine vide est admise,
   * c'est ainsi que le back-office efface un resume.
   */
  description: z.string().max(CATEGORY_DESCRIPTION_MAX).optional(),
  position: z.number().int().nonnegative().default(0),
});

export const categoryUpdateSchema = categorySchema.partial();
