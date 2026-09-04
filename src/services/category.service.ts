import { categoryRepository, type CategoryRow } from "../repositories/category.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { AppError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";
import type { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";
import type { z } from "zod";

/** Nombre de visuels retenus pour la vignette « Nos univers ». */
const PREVIEW_SIZE = 4;

/**
 * Produits récents balayés pour composer les vignettes. Borne volontaire : au
 * pire quelques dizaines de fiches, jamais tout le catalogue.
 */
const RECENT_PRODUCTS_SCANNED = 40;

/**
 * Le visuel de DÉPART d'un univers, servi en local (`/univers/x.webp`) ou
 * depuis Cloudinary (`.../huwstore/univers/x.webp`, produit par
 * `npm run media:upload`). Ce n'est pas un choix de la boutique : c'est le
 * repli, la sélection de produits doit primer dessus.
 */
const isSeedDefaultImage = (url: string) => url.startsWith("/univers/") || url.includes("/huwstore/univers/");

/**
 * `true` quand la boutique a téléversé sa propre image pour l'univers depuis le
 * back-office (elle atterrit dans `huwstore/categories/`). Ce choix prime alors
 * sur la couverture composée des produits.
 */
const isChosenImage = (url: string) => Boolean(url) && !isSeedDefaultImage(url);

type CoverSource = Awaited<ReturnType<typeof productRepository.findCategoryCoverSources>>[number];

/** Image de couverture d'un produit : première déclinaison active, sinon galerie de la fiche. */
const coverImageOf = (product: CoverSource) => {
  const image = product.variants[0]?.images[0] ?? product.images[0];
  return image ? { url: image.url, alt: image.alt } : null;
};

/** Regroupe jusqu'à `PREVIEW_SIZE` visuels de produits par catégorie, sans doublon. */
function coversByCategory(products: CoverSource[]): Map<string, { url: string; alt: string }[]> {
  const byCategory = new Map<string, { url: string; alt: string }[]>();
  for (const product of products) {
    const list = byCategory.get(product.categoryId) ?? [];
    if (list.length >= PREVIEW_SIZE) continue;
    const image = coverImageOf(product);
    if (image && !list.some((entry) => entry.url === image.url)) list.push(image);
    byCategory.set(product.categoryId, list);
  }
  return byCategory;
}

/**
 * DTO d'un univers pour la vitrine (rules/architecture.md : le service ne
 * renvoie pas l'objet ORM brut). `preview` porte l'image choisie au back-office
 * si elle existe, sinon des photos de produits réellement rattachés.
 */
function toDto(category: CategoryRow, covers: { url: string; alt: string }[]) {
  const preview = isChosenImage(category.image) ? [{ url: category.image, alt: category.name }] : covers;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    description: category.description,
    position: category.position,
    _count: category._count,
    preview,
  };
}

/**
 * Liste des univers, vignettes comprises.
 *
 * Pas de cache : les deux lectures sont ciblées (un `select` par requête, sans
 * `take` imbriqué, donc pas de N+1) et la fraîcheur prime - une catégorie créée
 * au back-office doit apparaître tout de suite en vitrine. On l'ajoutera si une
 * mesure montre que l'endpoint pèse.
 */
export async function buildCategoryList() {
  const [categories, recentProducts] = await Promise.all([
    categoryRepository.findAll(),
    productRepository.findCategoryCoverSources(RECENT_PRODUCTS_SCANNED),
  ]);
  const covers = coversByCategory(recentProducts);
  return categories.map((category) => toDto(category, covers.get(category.id) ?? []));
}

export const categoryService = {
  list: buildCategoryList,

  async create(input: z.infer<typeof categorySchema>) {
    const existing = await categoryRepository.findByName(input.name);
    if (existing) throw AppError.conflict("Cette catégorie existe déjà.");
    return categoryRepository.create({ ...input, slug: input.slug ?? slugify(input.name) });
  },

  async update(id: string, input: z.infer<typeof categoryUpdateSchema>) {
    const category = await categoryRepository.findById(id);
    if (!category) throw AppError.notFound("Catégorie introuvable.");
    return categoryRepository.update(id, input);
  },

  async remove(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw AppError.notFound("Catégorie introuvable.");

    // Une catégorie encore rattachée à des produits ne peut pas disparaître :
    // la contrainte de clé étrangère lèverait une 500 illisible.
    const count = await categoryRepository.countProducts(id);
    if (count > 0) throw AppError.conflict(`Cette catégorie contient encore ${count} produit(s).`);

    await categoryRepository.remove(id);
  },
};
