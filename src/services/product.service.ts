import type { Prisma } from "@prisma/client";
import { productRepository } from "../repositories/product.repository.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { AppError } from "../utils/AppError.js";
import { productBadgeMap } from "../utils/enumMaps.js";
import type { productSchema, productUpdateSchema, productListQuerySchema } from "../validators/product.validator.js";
import type { z } from "zod";

type ProductWithRelations = Awaited<ReturnType<typeof productRepository.findById>>;

function toDto(product: NonNullable<ProductWithRelations>) {
  const outOfStock = (product.stock?.qty ?? 0) === 0;
  return {
    id: product.id,
    name: product.name,
    collection: product.collection,
    category: product.category.name,
    material: product.material,
    color: product.color,
    price: product.price,
    compareAt: product.compareAt ?? undefined,
    badge: outOfStock ? "Rupture" : product.badge ? productBadgeMap.label(product.badge) : undefined,
    rating: product.rating,
    reviews: product.reviewsCount,
    image: product.image,
    imageAlt: product.imageAlt,
    imageHover: product.imageHover,
    active: product.active,
    stock: product.stock ? { qty: product.stock.qty, threshold: product.stock.threshold } : null,
  };
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const productService = {
  async list(query: z.infer<typeof productListQuerySchema>) {
    const where: Prisma.ProductWhereInput = query.all ? {} : { active: true };
    if (query.category) where.category = { name: query.category };
    if (query.material) where.material = query.material;
    if (query.color) where.color = query.color;
    if (query.maxPrice) where.price = { lte: query.maxPrice };

    const orderBy: Prisma.ProductOrderByWithRelationInput | undefined =
      query.sort === "price-asc" ? { price: "asc" } : query.sort === "price-desc" ? { price: "desc" } : undefined;

    const products = await productRepository.findAll(where, orderBy);
    const dtos = products.map(toDto);
    return query.sort === "new" ? dtos.sort((a, b) => (b.badge === "Nouveau" ? 1 : 0) - (a.badge === "Nouveau" ? 1 : 0)) : dtos;
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw AppError.notFound("Produit introuvable.");
    return toDto(product);
  },

  async create(input: z.infer<typeof productSchema>) {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) throw AppError.badRequest("Catégorie introuvable.");

    const id = input.id || slugify(input.name);
    const product = await productRepository.create({
      id,
      name: input.name,
      collection: input.collection,
      category: { connect: { id: input.categoryId } },
      material: input.material,
      color: input.color,
      price: input.price,
      compareAt: input.compareAt,
      badge: input.badge ? productBadgeMap.fromLabel(input.badge) : null,
      image: input.image,
      imageAlt: input.imageAlt,
      imageHover: input.imageHover,
      active: input.active,
      stock: { create: { qty: input.stockQty, threshold: input.stockThreshold } },
    });
    return toDto(product);
  },

  async update(id: string, input: z.infer<typeof productUpdateSchema>) {
    const existing = await productRepository.findById(id);
    if (!existing) throw AppError.notFound("Produit introuvable.");

    const { stockQty, stockThreshold, categoryId, badge, ...rest } = input;
    await productRepository.update(id, {
      ...rest,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(badge !== undefined ? { badge: badge ? productBadgeMap.fromLabel(badge) : null } : {}),
    });

    if (stockQty !== undefined || stockThreshold !== undefined) {
      await productRepository.upsertStock(
        id,
        stockQty ?? existing.stock?.qty ?? 0,
        stockThreshold ?? existing.stock?.threshold ?? 5,
      );
    }

    return this.getById(id);
  },

  async remove(id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) throw AppError.notFound("Produit introuvable.");
    await productRepository.remove(id);
  },
};
