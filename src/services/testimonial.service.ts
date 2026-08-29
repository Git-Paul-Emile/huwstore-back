import { testimonialRepository } from "../repositories/testimonial.repository.js";
import { AppError } from "../utils/AppError.js";
import type { testimonialSchema, testimonialUpdateSchema } from "../validators/testimonial.validator.js";
import type { z } from "zod";

const toDto = (testimonial: NonNullable<Awaited<ReturnType<typeof testimonialRepository.findById>>>) => ({
  id: testimonial.id,
  author: testimonial.author,
  role: testimonial.role,
  text: testimonial.text,
  avatar: testimonial.avatar,
  position: testimonial.position,
  active: testimonial.active,
});

export const testimonialService = {
  list: async () => (await testimonialRepository.findAll()).map(toDto),

  create: async (input: z.infer<typeof testimonialSchema>) => {
    const testimonial = await testimonialRepository.create({
      author: input.author,
      role: input.role,
      text: input.text,
      avatar: input.avatar ?? null,
      position: input.position,
      active: input.active,
    });
    return toDto(testimonial);
  },

  async update(id: string, input: z.infer<typeof testimonialUpdateSchema>) {
    const existing = await testimonialRepository.findById(id);
    if (!existing) throw AppError.notFound("Témoignage introuvable.");
    const testimonial = await testimonialRepository.update(id, input);
    return toDto(testimonial);
  },

  async remove(id: string) {
    const existing = await testimonialRepository.findById(id);
    if (!existing) throw AppError.notFound("Témoignage introuvable.");
    await testimonialRepository.remove(id);
  },
};
