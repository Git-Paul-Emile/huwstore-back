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
import { env } from "../../config/env.js";

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
  /**
   * Retire un média du stockage à partir de son URL publique.
   *
   * Idempotent et prudent : une URL déjà absente, non reconnue, ou pointant
   * hors du périmètre géré depuis le back-office (visuel local, asset de seed
   * partagé) est un no-op tracé, jamais une erreur. Une panne transitoire du
   * fournisseur, elle, remonte : l'appelant (la file de tâches) réessaiera.
   */
  destroy(url: string, resourceType?: "image" | "video"): Promise<void>;
  health(): { name: string; state: string; failures: number; configured: boolean };
}

type CloudinaryUploader = {
  upload: (
    file: string,
    options: Record<string, unknown>,
  ) => Promise<{ secure_url: string; public_id: string; width: number; height: number; bytes: number }>;
  destroy: (publicId: string, options: Record<string, unknown>) => Promise<{ result: string }>;
};

/**
 * Préfixe des médias téléversés depuis le back-office. Tout ce qui est en
 * dehors (visuels de seed sous `huwstore/univers/`, fichiers locaux
 * `/univers/x.webp`) n'est jamais supprimé automatiquement : ces assets sont
 * partagés ou versionnés avec le code.
 */
const MANAGED_PREFIX = "huwstore/";
const SEED_PREFIX = "huwstore/univers/";

/**
 * Déduit l'identifiant Cloudinary (`public_id`) d'une URL de livraison produite
 * par nos propres téléversements : `.../<type>/upload/<v123>/<public_id>.<ext>`.
 * Renvoie `null` si l'URL n'a pas cette forme (fichier local, lien externe).
 */
export function publicIdFromUrl(url: string): string | null {
  const match = /\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/.exec(url);
  if (!match) return null;
  const withoutExtension = match[1].replace(/\.[a-zA-Z0-9]+$/, "");
  return withoutExtension || null;
}

/** Dimension maximale d'une photo produit : au-delà, réduction à la volée. */
const MAX_IMAGE_SIDE_PX = 2000;

export class CloudinaryImageStore implements ImageStore {
  readonly name = "cloudinary";
  private readonly breaker = new CircuitBreaker("cloudinary", { failureThreshold: 4, openMs: 30_000 });

  constructor(private readonly uploader: CloudinaryUploader) {}

  isConfigured(): boolean {
    return Boolean(env.CLOUDINARY_URL);
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

  async destroy(url: string, resourceType: "image" | "video" = "image"): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn({ url }, "Stockage d'images non configuré, suppression ignorée");
      return;
    }

    const publicId = publicIdFromUrl(url);
    if (!publicId || !publicId.startsWith(MANAGED_PREFIX) || publicId.startsWith(SEED_PREFIX)) {
      logger.info({ url, publicId }, "Média hors périmètre back-office, suppression ignorée");
      return;
    }

    const { result } = await resilient(
      {
        label: "cloudinary.uploader.destroy",
        timeoutMs: 15_000,
        breaker: this.breaker,
        retry: { attempts: 3, baseDelayMs: 500 },
      },
      () => this.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true }),
    );

    // "ok" = supprimé, "not found" = déjà absent. Les deux sont un succès : le
    // but est que le fichier ne soit plus là, pas de prouver qu'on l'a effacé.
    if (result !== "ok" && result !== "not found") {
      throw new Error(`Cloudinary destroy a répondu "${result}" pour ${publicId}`);
    }

    logger.info({ publicId, result, kind: resourceType }, "Média supprimé du stockage");
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
