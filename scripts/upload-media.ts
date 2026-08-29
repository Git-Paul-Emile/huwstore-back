/**
 * Upload des medias du catalogue vers Cloudinary.
 *
 *   npm run media:upload
 *
 * Sources : front/public/products/<slug>/<cle>-<n>.jpg (+ video.mp4)
 *           front/public/univers/<slug>.webp
 * Sorties : back/prisma/media.generated.json   (photos produits)
 *           back/prisma/univers.generated.json (visuels des univers)
 *           Les deux sont lus par prisma/media.ts, donc par le seed et par tout
 *           ce qui a besoin d'une URL d'image.
 *
 * Le script est IDEMPOTENT : le public_id est deterministe
 * (huwstore/products/<slug>/<cle>-<n>) et `overwrite: true` remplace l'asset
 * existant au lieu d'en creer un doublon. On peut donc le relancer sans risque
 * apres avoir ajoute ou remplace une photo.
 *
 * Prerequis : CLOUDINARY_URL dans back/.env (le SDK le lit automatiquement).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_PRODUCTS = path.join(HERE, "../../front/public/products");
const PUBLIC_UNIVERS = path.join(HERE, "../../front/public/univers");
const OUTPUT = path.join(HERE, "../prisma/media.generated.json");
const UNIVERS_OUTPUT = path.join(HERE, "../prisma/univers.generated.json");

type ProductMedia = { images: Record<string, string[]>; video: string | null };

if (!process.env.CLOUDINARY_URL) {
  console.error("CLOUDINARY_URL manquant dans back/.env - upload impossible.");
  process.exit(1);
}

cloudinary.config({ secure: true });

/** "noir-2.jpg" -> { key: "noir", index: 2 } ; renvoie null si le nom ne suit pas la convention. */
function parseName(file: string): { key: string; index: number } | null {
  const match = /^(.+)-(\d+)\.(jpg|jpeg|png|webp)$/i.exec(file);
  if (!match) return null;
  return { key: match[1], index: Number(match[2]) };
}

async function upload(localPath: string, publicId: string, resourceType: "image" | "video") {
  const result = await cloudinary.uploader.upload(localPath, {
    public_id: publicId,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true,
  });
  return result.secure_url;
}

/**
 * Visuels des univers : un fichier par categorie, nomme d'apres son slug.
 *
 * Ce sont des sacs detoures sur fond transparent : `format: "webp"` conserve la
 * transparence, ce qu'un JPEG perdrait, et le public_id deterministe rend le
 * script rejouable sans creer de doublon.
 */
async function uploadUnivers(): Promise<Record<string, string>> {
  if (!fs.existsSync(PUBLIC_UNIVERS)) {
    console.log("Aucun dossier front/public/univers : visuels d'univers ignores.");
    return {};
  }

  const output: Record<string, string> = {};

  for (const file of fs.readdirSync(PUBLIC_UNIVERS).sort()) {
    const match = /^(.+)\.(webp|png|jpe?g|avif)$/i.exec(file);
    if (!match) continue;

    const slug = match[1];
    const result = await cloudinary.uploader.upload(path.join(PUBLIC_UNIVERS, file), {
      public_id: `huwstore/univers/${slug}`,
      resource_type: "image",
      format: "webp",
      overwrite: true,
      invalidate: true,
    });
    output[slug] = result.secure_url;
    console.log(`  univers  ${file}`);
  }

  return output;
}

async function main() {
  if (!fs.existsSync(PUBLIC_PRODUCTS)) {
    throw new Error(`Dossier source introuvable : ${PUBLIC_PRODUCTS}`);
  }

  const slugs = fs
    .readdirSync(PUBLIC_PRODUCTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const output: Record<string, ProductMedia> = {};

  for (const slug of slugs) {
    const dir = path.join(PUBLIC_PRODUCTS, slug);
    const media: ProductMedia = { images: {}, video: null };

    // On trie par cle puis par index pour que l'ordre des photos soit stable
    // d'une execution a l'autre (et donc l'ordre de la galerie aussi).
    const parsed = fs
      .readdirSync(dir)
      .map((file) => ({ file, meta: parseName(file) }))
      .filter((entry): entry is { file: string; meta: { key: string; index: number } } => entry.meta !== null)
      .sort((a, b) => a.meta.key.localeCompare(b.meta.key) || a.meta.index - b.meta.index);

    for (const { file, meta } of parsed) {
      const url = await upload(path.join(dir, file), `huwstore/products/${slug}/${meta.key}-${meta.index}`, "image");
      (media.images[meta.key] ??= []).push(url);
      console.log(`  image  ${slug}/${file}`);
    }

    const video = path.join(dir, "video.mp4");
    if (fs.existsSync(video)) {
      media.video = await upload(video, `huwstore/products/${slug}/video`, "video");
      console.log(`  video  ${slug}/video.mp4`);
    }

    output[slug] = media;
    console.log(`${slug} : ${parsed.length} image(s)${media.video ? " + 1 video" : ""}`);
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\nURLs Cloudinary ecrites dans ${path.relative(process.cwd(), OUTPUT)}`);

  const univers = await uploadUnivers();
  fs.writeFileSync(UNIVERS_OUTPUT, `${JSON.stringify(univers, null, 2)}\n`);
  console.log(`univers : ${Object.keys(univers).length} visuel(s) -> ${path.relative(process.cwd(), UNIVERS_OUTPUT)}`);

  console.log("\nRelancez `npm run seed` pour que la base utilise ces URLs.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
