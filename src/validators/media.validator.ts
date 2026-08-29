import { z } from "zod";

/** Dossiers autorises sur Cloudinary : une liste fermee, jamais l'entree brute. */
export const MEDIA_FOLDERS = ["produits", "categories", "bannieres", "temoignages"] as const;

/** 8 Mo de fichier reel. Le base64 pese environ un tiers de plus. */
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_BYTES * 4) / 3);

const DATA_URI = /^data:image\/(png|jpe?g|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/;

export const mediaUploadSchema = z.object({
  /**
   * Image encodee en data URI. On verifie le TYPE declare et la taille avant
   * d'appeler Cloudinary : refuser tot coute une expression reguliere, refuser
   * tard coute un aller-retour reseau et de la bande passante.
   */
  file: z
    .string()
    .refine((value) => DATA_URI.test(value), {
      message: "Image attendue au format PNG, JPEG, WebP ou AVIF.",
    })
    .refine((value) => value.length <= MAX_BASE64_LENGTH, {
      message: "Image trop lourde : 8 Mo maximum.",
    }),
  folder: z.enum(MEDIA_FOLDERS).default("produits"),
  /** Nom lisible, utilise pour construire l'identifiant public du fichier. */
  label: z.string().trim().max(80).optional(),
});
