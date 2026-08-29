import type { Prisma } from "@prisma/client";
import { productRepository, type ProductWithRelations } from "../repositories/product.repository.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { AppError } from "../utils/AppError.js";
import { productBadgeMap } from "../utils/enumMaps.js";
import { slugify } from "../utils/slugify.js";
import type { productSchema, productUpdateSchema, productListQuerySchema } from "../validators/product.validator.js";
import type { z } from "zod";

/**
 * Le DTO est le contrat public de l'API : il ne laisse jamais fuir la forme
 * Prisma. On peut donc renommer une colonne sans casser le front, et le front
 * n'a pas à savoir que le stock vit sur la variante.
 */

type VariantDto = {
  id: string;
  sku: string;
  color: string;
  colorSlug: string;
  hex: string;
  hexSecondary?: string;
  images: { url: string; alt: string }[];
  stock: { qty: number; threshold: number };
  available: boolean;
};

function toVariantDto(variant: ProductWithRelations["variants"][number]): VariantDto {
  const qty = variant.stock?.qty ?? 0;
  return {
    id: variant.id,
    sku: variant.sku,
    color: variant.colorName,
    colorSlug: variant.colorSlug,
    hex: variant.hex,
    hexSecondary: variant.hexSecondary ?? undefined,
    images: variant.images.map((image) => ({ url: image.url, alt: image.alt })),
    stock: { qty, threshold: variant.stock?.threshold ?? 0 },
    available: qty > 0,
  };
}

function toDto(product: ProductWithRelations) {
  const variants = product.variants.map(toVariantDto);

  // Stock produit = somme des stocks de ses couleurs. Un produit est en rupture
  // seulement quand AUCUNE de ses déclinaisons n'est disponible.
  const qty = variants.reduce((sum, v) => sum + v.stock.qty, 0);
  const threshold = variants.reduce((sum, v) => sum + v.stock.threshold, 0);
  const outOfStock = variants.length > 0 && qty === 0;

  // Visuels de vitrine : la première couleur, puis sa deuxième photo comme
  // image de survol, avec repli sur la galerie commune.
  const gallery = product.images.map((image) => ({ url: image.url, alt: image.alt }));
  const cover = variants[0]?.images ?? gallery;
  const image = cover[0] ?? gallery[0];
  const imageHover = cover[1] ?? gallery.find((g) => g.url !== image?.url) ?? image;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    collection: product.collection,
    category: product.category.name,
    categorySlug: product.category.slug,
    material: product.material,
    description: product.description,
    care: product.care,
    price: product.price,
    compareAt: product.compareAt ?? undefined,
    badge: outOfStock ? "Rupture" : product.badge ? productBadgeMap.label(product.badge) : undefined,
    videoUrl: product.videoUrl ?? undefined,
    includedAccessory: product.includedAccessory ?? undefined,

    // Champs de vitrine, dérivés - jamais stockés en double en base.
    color: variants[0]?.color ?? "",
    colors: variants.map((v) => v.color),
    image: image?.url ?? "",
    imageAlt: image?.alt ?? product.name,
    imageHover: imageHover?.url ?? image?.url ?? "",

    specs: {
      closure: product.closure ?? undefined,
      capacity: product.capacity ?? undefined,
      widthTopMm: product.widthTopMm ?? undefined,
      widthBottomMm: product.widthBottomMm ?? undefined,
      heightMm: product.heightMm ?? undefined,
      depthMm: product.depthMm ?? undefined,
      handleDropMm: product.handleDropMm ?? undefined,
      weightGrams: product.weightGrams ?? undefined,
      features: product.features,
    },

    variants,
    images: gallery,
    active: product.active,
    stock: variants.length > 0 ? { qty, threshold } : null,
  };
}

export type ProductDto = ReturnType<typeof toDto>;

/** Traduit les paramètres de tri de l'API en clause Prisma. */
function toOrderBy(sort: z.infer<typeof productListQuerySchema>["sort"]): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "new":
      return { createdAt: "desc" };
    case "best":
      // « Les plus vendus » : on classe sur le nombre de lignes de commande
      // réellement enregistrées. C'est une donnée de vente, pas une note
      // déclarative - la vitrine ne peut donc pas mentir sur ce classement.
      return { orderItems: { _count: "desc" } };
    default:
      return { createdAt: "desc" };
  }
}

export const productService = {
  /**
   * Liste paginée, filtrée, triée et recherchable - les quatre attendus d'une
   * collection REST. Renvoie les données ET les métadonnées de pagination.
   */
  async list(query: z.infer<typeof productListQuerySchema>) {
    const where: Prisma.ProductWhereInput = query.all ? {} : { active: true };

    // Les trois filtres acceptent plusieurs valeurs : a l'interieur d'un meme
    // filtre les valeurs s'additionnent (OU), entre filtres elles se cumulent
    // (ET) - c'est le comportement attendu d'une boutique a facettes.
    if (query.category) {
      where.category = { OR: [{ name: { in: query.category } }, { slug: { in: query.category } }] };
    }
    if (query.material) where.material = { in: query.material };
    if (query.color) {
      where.variants = {
        some: { active: true, OR: [{ colorSlug: { in: query.color } }, { colorName: { in: query.color } }] },
      };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined && { gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
      };
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { material: { contains: query.search, mode: "insensitive" } },
        { collection: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      productRepository.findAll(where, toOrderBy(query.sort), skip, query.limit),
      productRepository.count(where),
    ]);

    return {
      items: rows.map(toDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasNext: skip + rows.length < total,
        hasPrev: query.page > 1,
      },
    };
  },

  /** Accepte indifféremment l'identifiant ou le slug - pratique pour les URLs. */
  async getById(idOrSlug: string) {
    const product = (await productRepository.findById(idOrSlug)) ?? (await productRepository.findBySlug(idOrSlug));
    if (!product) throw AppError.notFound("Produit introuvable.");
    return toDto(product);
  },

  /** Facettes de filtre calculées depuis la base, jamais codées en dur. */
  async facets() {
    const [materials, colors, prices] = await Promise.all([
      productRepository.distinctMaterials(),
      productRepository.distinctColors(),
      productRepository.priceBounds(),
    ]);
    return {
      materials: materials.map((m) => m.material),
      colors: colors.map((c) => ({ name: c.colorName, slug: c.colorSlug, hex: c.hex })),
      // Bornes reelles du catalogue : le curseur de prix ne doit pas etre code
      // en dur cote front, sinon il ment des le premier changement de tarif.
      priceMin: prices._min.price ?? 0,
      priceMax: prices._max.price ?? 0,
    };
  },

  async create(input: z.infer<typeof productSchema>) {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) throw AppError.badRequest("Catégorie introuvable.");

    const id = input.id || slugify(input.name);
    const slug = input.slug || id;

    const product = await productRepository.create({
      id,
      slug,
      name: input.name,
      collection: input.collection,
      category: { connect: { id: input.categoryId } },
      material: input.material,
      description: input.description,
      care: input.care,
      price: input.price,
      compareAt: input.compareAt,
      badge: input.badge ? productBadgeMap.fromLabel(input.badge) : null,
      videoUrl: input.videoUrl,
      closure: input.closure,
      capacity: input.capacity,
      widthTopMm: input.widthTopMm,
      widthBottomMm: input.widthBottomMm,
      heightMm: input.heightMm,
      depthMm: input.depthMm,
      handleDropMm: input.handleDropMm,
      weightGrams: input.weightGrams,
      features: input.features,
      includedAccessory: input.includedAccessory,
      active: input.active,
      variants: {
        create: input.variants.map((variant, position) => ({
          sku: variant.sku || `HUW-${id.toUpperCase()}-${variant.colorSlug.toUpperCase()}`,
          colorName: variant.color,
          colorSlug: variant.colorSlug,
          hex: variant.hex,
          hexSecondary: variant.hexSecondary,
          position,
          stock: { create: { qty: variant.stockQty, threshold: variant.stockThreshold } },
          images: {
            create: variant.images.map((url, index) => ({
              url,
              alt: `${input.name} - coloris ${variant.color}`,
              position: position * 100 + index,
              product: { connect: { id } },
            })),
          },
        })),
      },
    });

    return toDto(product);
  },

  async update(id: string, input: z.infer<typeof productUpdateSchema>) {
    const existing = await productRepository.findById(id);
    if (!existing) throw AppError.notFound("Produit introuvable.");

    const { categoryId, badge, ...rest } = input;

    const product = await productRepository.update(id, {
      ...rest,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(badge !== undefined ? { badge: badge ? productBadgeMap.fromLabel(badge) : null } : {}),
    });

    return toDto(product);
  },

  async remove(id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) throw AppError.notFound("Produit introuvable.");
    // Désactivation plutôt que suppression : les commandes passées référencent
    // ce produit, un DELETE casserait l'historique.
    await productRepository.update(id, { active: false });
  },
};
