/**
 * Stockage d'images, vu comme un PORT (rules/external-services.md).
 *
 * Le service `media` ne connaît que l'interface `ImageStore`. Cloudinary vit
 * derrière un adaptateur ; en remplacer la mise en œuvre (S3, Bunny, disque)
 * ne touche que ce dossier.
 */
import { CircuitBreaker, resilient } from "../../lib/resilience.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import { slugify } from "../../utils/slugify.js";

export type ImageUploadInput = {
  /** Fichier encodé (data URI ou URL distante), tel que reçu du back-office. */
  file: string;
  /** Sous-dossier logique, ex. "produits" ou "bannieres". */
  folder: string;
  /** Libellé facultatif, transformé en identifiant lisible. */
  label?: string;
  /** Type de média. Par défaut une image. */
  resourceType?: "image" | "video";
};

export type StoredImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

export interface ImageStore {
  readonly name: string;
  /** `true` quand le stockage est configuré et prêt à recevoir des fichiers. */
  isConfigured(): boolean;
  upload(input: ImageUploadInput): Promise<StoredImage>;
  health(): { name: string; state: string; failures: number; configured: boolean };
}

type CloudinaryUploader = {
  upload: (
    file: string,
    options: Record<string, unknown>,
  ) => Promise<{ secure_url: string; public_id: string; width: number; height: number; bytes: number }>;
};

/** Dimension maximale d'une photo produit : au-delà, réduction à la volée. */
const MAX_IMAGE_SIDE_PX = 2000;

export class CloudinaryImageStore implements ImageStore {
  readonly name = "cloudinary";
  private readonly breaker = new CircuitBreaker("cloudinary", { failureThreshold: 4, openMs: 30_000 });

  constructor(private readonly uploader: CloudinaryUploader) {}

  isConfigured(): boolean {
    return Boolean(process.env.CLOUDINARY_URL);
  }

  async upload(input: ImageUploadInput): Promise<StoredImage> {
    if (!this.isConfigured()) {
      throw AppError.badRequest("Le stockage d'images n'est pas configuré (CLOUDINARY_URL manquante).");
    }

    const isVideo = input.resourceType === "video";

    try {
      const result = await resilient(
        {
          label: "cloudinary.uploader.upload",
          // Une vidéo pèse plus lourd et Cloudinary la transcode : plus de temps,
          // mais AUCUN réessai - renvoyer 40 Mo une seconde fois ferait patienter
          // la boutique pour rien.
          timeoutMs: isVideo ? 60_000 : 20_000,
          breaker: this.breaker,
          retry: isVideo ? false : { attempts: 2, baseDelayMs: 500 },
        },
        () =>
          this.uploader.upload(input.file, {
            folder: `huwstore/${input.folder}`,
            ...(input.label ? { public_id: `${slugify(input.label)}-${Date.now()}` } : {}),
            resource_type: isVideo ? "video" : "image",
            overwrite: false,
            // La photo est bornée en pixels et servie en `auto:good` ; la vidéo
            // est déposée telle quelle (Cloudinary sert la variante adaptée).
            ...(isVideo
              ? {}
              : {
                  transformation: [
                    { width: MAX_IMAGE_SIDE_PX, height: MAX_IMAGE_SIDE_PX, crop: "limit", quality: "auto:good" },
                  ],
                }),
          }),
      );

      logger.info({ publicId: result.public_id, bytes: result.bytes, kind: isVideo ? "video" : "image" }, "Média téléversé");
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ err: error, kind: isVideo ? "video" : "image" }, "Échec du téléversement du média");
      throw AppError.badRequest(
        isVideo
          ? "La vidéo n'a pas pu être envoyée. Réessayez dans un instant."
          : "L'image n'a pas pu être envoyée. Réessayez dans un instant.",
      );
    }
  }

  health() {
    const snapshot = this.breaker.snapshot();
    return { name: this.name, state: snapshot.state, failures: snapshot.failures, configured: this.isConfigured() };
  }
}

let instance: ImageStore | undefined;

export async function getImageStore(): Promise<ImageStore> {
  if (instance) return instance;
  const { cloudinary } = await import("../../config/cloudinary.js");
  instance = new CloudinaryImageStore(cloudinary.uploader as unknown as CloudinaryUploader);
  return instance;
}

/** Réservé aux tests. */
export function __setImageStore(store: ImageStore | undefined) {
  instance = store;
}
