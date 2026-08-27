import { categoryRepository } from "../repositories/category.repository.js";
import { AppError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";
import type { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";
import type { z } from "zod";

export const categoryService = {
  list: () => categoryRepository.findAll(),

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
