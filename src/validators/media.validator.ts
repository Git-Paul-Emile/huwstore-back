import { z } from "zod";

/** Dossiers autorises sur Cloudinary : une liste fermee, jamais l'entree brute. */
export const MEDIA_FOLDERS = ["produits", "categories", "bannieres", "temoignages"] as const;

/** Tailles reelles maximales. Le base64 pese environ un tiers de plus. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const base64Length = (bytes: number) => Math.ceil((bytes * 4) / 3);

const IMAGE_DATA_URI = /^data:image\/(png|jpe?g|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/;
const VIDEO_DATA_URI = /^data:video\/(mp4|webm|quicktime);base64,[A-Za-z0-9+/]+={0,2}$/;

export const mediaUploadSchema = z
  .object({
    /**
     * Fichier encode en data URI. On verifie le TYPE declare et la taille avant
     * d'appeler Cloudinary : refuser tot coute une expression reguliere, refuser
     * tard coute un aller-retour reseau et de la bande passante.
     */
    file: z.string(),
    folder: z.enum(MEDIA_FOLDERS).default("produits"),
    /** Nom lisible, utilise pour construire l'identifiant public du fichier. */
    label: z.string().trim().max(80).optional(),
  })
  .superRefine((value, ctx) => {
    const isImage = IMAGE_DATA_URI.test(value.file);
    const isVideo = VIDEO_DATA_URI.test(value.file);

    if (!isImage && !isVideo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: "Image (PNG, JPEG, WebP, AVIF) ou vidéo (MP4, WebM) attendue.",
      });
      return;
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (value.file.length > base64Length(maxBytes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: isVideo ? "Vidéo trop lourde : 40 Mo maximum." : "Image trop lourde : 8 Mo maximum.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    kind: VIDEO_DATA_URI.test(value.file) ? ("video" as const) : ("image" as const),
  }));
