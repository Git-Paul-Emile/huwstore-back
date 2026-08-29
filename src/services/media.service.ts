import { cloudinary } from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../config/logger.js";
import { slugify } from "../utils/slugify.js";
import type { mediaUploadSchema } from "../validators/media.validator.js";
import type { z } from "zod";

/**
 * Depot des images du catalogue.
 *
 * Pourquoi passer par Cloudinary et non par le disque du serveur ? Parce que
 * l'API tourne sur un hebergement dont le systeme de fichiers est ephemere :
 * un redemarrage effacerait les photos. Cloudinary sert aussi les images
 * redimensionnees et en WebP, ce qui evite d'envoyer une photo de 4 Mo a une
 * cliente en 3G.
 *
 * C'est ce service qui rend le back-office autonome : la boutique televerse ses
 * photos depuis l'interface, sans jamais avoir a manipuler une URL.
 */
export const mediaService = {
  async upload(input: z.infer<typeof mediaUploadSchema>) {
    if (!process.env.CLOUDINARY_URL) {
      throw AppError.badRequest("Le stockage d'images n'est pas configuré (CLOUDINARY_URL manquante).");
    }

    try {
      const result = await cloudinary.uploader.upload(input.file, {
        folder: `huwstore/${input.folder}`,
        ...(input.label ? { public_id: `${slugify(input.label)}-${Date.now()}` } : {}),
        resource_type: "image",
        overwrite: false,
        // Garde-fou de poids et de dimensions : au-dela, l'image est reduite a
        // la volee. Une photo produit n'a jamais besoin de plus de 2000 px.
        transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto:good" }],
      });

      logger.info({ publicId: result.public_id, bytes: result.bytes }, "Image téléversée");

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error({ err: error }, "Échec du téléversement Cloudinary");
      throw AppError.badRequest("L'image n'a pas pu être envoyée. Réessayez dans un instant.");
    }
  },
};
