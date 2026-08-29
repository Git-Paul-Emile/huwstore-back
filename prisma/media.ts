/**
 * Resolution des URLs media des produits.
 *
 * Deux sources possibles, dans cet ordre :
 *  1. prisma/media.generated.json - produit par `npm run media:upload`, il contient
 *     les URLs Cloudinary. C'est la source utilisee des que l'upload a ete fait.
 *  2. Repli local - les memes fichiers servis par le front depuis front/public/products.
 *     Le site fonctionne donc immediatement, avant meme le premier upload.
 *
 * Le reste du code (seed, services) ne connait que `productMedia()` : changer
 * d'hebergeur d'images ne touche qu'a ce fichier. C'est le principe d'inversion
 * de dependance - le metier depend d'une abstraction, pas de Cloudinary.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Slug de couleur ("noir", "blanc-casse-marron"...) ou "generic" pour les visuels communs. */
export type MediaKey = string;

export type ProductMedia = {
  images: Record<MediaKey, string[]>;
  video: string | null;
};

type Manifest = {
  products: { slug: string; folder: string; video: string | null; images: Record<string, string[]> }[];
};

const manifest: Manifest = JSON.parse(
  fs.readFileSync(path.join(HERE, "../scripts/media-manifest.json"), "utf8"),
) as Manifest;

const GENERATED = path.join(HERE, "media.generated.json");

/**
 * Visuels des univers, produits par `npm run media:upload`. Fichier separe de
 * celui des produits : les deux manifestes n'ont ni la meme forme ni le meme
 * cycle de vie, les melanger ferait aussi collisionner un slug de categorie
 * avec un slug de produit.
 */
const UNIVERS_GENERATED = path.join(HERE, "univers.generated.json");

const uploaded: Record<string, ProductMedia> | null = fs.existsSync(GENERATED)
  ? (JSON.parse(fs.readFileSync(GENERATED, "utf8")) as Record<string, ProductMedia>)
  : null;

const universUploaded: Record<string, string> | null = fs.existsSync(UNIVERS_GENERATED)
  ? (JSON.parse(fs.readFileSync(UNIVERS_GENERATED, "utf8")) as Record<string, string>)
  : null;

/** Chemin public servi par le front (front/public/products/...). */
const localUrl = (slug: string, key: MediaKey, index: number) => `/products/${slug}/${key}-${index + 1}.jpg`;

/** Cle de media normalisee : "_generic" dans le manifeste, "generic" partout ailleurs. */
export const mediaKey = (variantSlug: string) => (variantSlug === "_generic" ? "generic" : variantSlug);

/** Media d'un produit, quelle que soit la source active. */
export function productMedia(slug: string): ProductMedia {
  if (uploaded?.[slug]) return uploaded[slug];

  const entry = manifest.products.find((p) => p.slug === slug);
  if (!entry) throw new Error(`Aucun media declare pour le produit "${slug}".`);

  const images: Record<MediaKey, string[]> = {};
  for (const [variantSlug, files] of Object.entries(entry.images)) {
    const key = mediaKey(variantSlug);
    images[key] = files.map((_, i) => localUrl(slug, key, i));
  }

  return { images, video: entry.video ? `/products/${slug}/video.mp4` : null };
}

/**
 * Visuel de depart d'un univers.
 *
 * Meme principe que pour les produits : Cloudinary si l'upload a eu lieu, sinon
 * le fichier livre avec le front. Cette valeur n'est qu'un point de depart - une
 * fois que la boutique a televerse son propre visuel depuis le back-office, le
 * seed n'y touche plus (voir `seed.ts`).
 */
export function categoryImage(slug: string): string {
  return universUploaded?.[slug] ?? `/univers/${slug}.webp`;
}

/** true si les URLs viennent de Cloudinary, false si on est sur le repli local. */
export const usingCloudinary = uploaded !== null;
