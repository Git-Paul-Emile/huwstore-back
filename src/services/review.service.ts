import { reviewRepository } from "../repositories/review.repository.js";
import { AppError } from "../utils/AppError.js";
import { reviewStatusMap } from "../utils/enumMaps.js";
import type { reviewSchema, reviewStatusUpdateSchema } from "../validators/review.validator.js";
import type { z } from "zod";

const toDto = (review: NonNullable<Awaited<ReturnType<typeof reviewRepository.findById>>>) => ({
  id: review.id,
  product: review.product.name,
  author: review.author,
  rating: review.rating,
  text: review.text,
  date: review.createdAt,
  status: reviewStatusMap.label(review.status),
});

export const reviewService = {
  list: async () => (await reviewRepository.findAll()).map(toDto),

  create: async (input: z.infer<typeof reviewSchema>) => {
    const review = await reviewRepository.create({
      product: { connect: { id: input.productId } },
      author: input.author,
      rating: input.rating,
      text: input.text,
    });
    return toDto(review);
  },

  async updateStatus(id: string, input: z.infer<typeof reviewStatusUpdateSchema>) {
    const existing = await reviewRepository.findById(id);
    if (!existing) throw AppError.notFound("Avis introuvable.");
    const review = await reviewRepository.update(id, { status: reviewStatusMap.fromLabel(input.status) });
    return toDto(review);
  },
};
