import { getImageStore } from "./external/image-store.js";
import type { mediaUploadSchema } from "../validators/media.validator.js";
import type { z } from "zod";

/**
 * Depot des images du catalogue.
 *
 * Pourquoi passer par un stockage externe et non par le disque du serveur ?
 * Parce que l'API tourne sur un hebergement dont le systeme de fichiers est
 * ephemere : un redemarrage effacerait les photos. Le fournisseur sert aussi
 * les images redimensionnees et en WebP, ce qui evite d'envoyer une photo de
 * 4 Mo a une cliente en 3G.
 *
 * Ce service ne connait PAS le fournisseur : il parle au port `ImageStore`
 * (rules/external-services.md). Timeout, retry et disjoncteur sont dans
 * l'adaptateur.
 */
export const mediaService = {
  async upload(input: z.infer<typeof mediaUploadSchema>) {
    const store = await getImageStore();
    return store.upload({ file: input.file, folder: input.folder, label: input.label });
  },
};
