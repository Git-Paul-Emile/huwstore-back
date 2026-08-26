import { categoryRepository } from "../repositories/category.repository.js";
import { AppError } from "../utils/AppError.js";
import type { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";
import type { z } from "zod";

export const categoryService = {
  list: () => categoryRepository.findAll(),

  async create(input: z.infer<typeof categorySchema>) {
    const existing = await categoryRepository.findByName(input.name);
    if (existing) throw AppError.conflict("Cette catégorie existe déjà.");
    return categoryRepository.create(input);
  },

  async update(id: string, input: z.infer<typeof categoryUpdateSchema>) {
    const category = await categoryRepository.findById(id);
    if (!category) throw AppError.notFound("Catégorie introuvable.");
    return categoryRepository.update(id, input);
  },

  async remove(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw AppError.notFound("Catégorie introuvable.");
    await categoryRepository.remove(id);
  },
};
