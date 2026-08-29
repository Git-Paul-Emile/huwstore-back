import { feedbackRepository } from "../repositories/feedback.repository.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../config/logger.js";
import type { feedbackSchema, feedbackUpdateSchema } from "../validators/feedback.validator.js";
import type { z } from "zod";

const toDto = (feedback: NonNullable<Awaited<ReturnType<typeof feedbackRepository.findById>>>) => ({
  id: feedback.id,
  name: feedback.name,
  phone: feedback.phone,
  email: feedback.email,
  message: feedback.message,
  read: feedback.read,
  createdAt: feedback.createdAt,
});

export const feedbackService = {
  list: async () => (await feedbackRepository.findAll()).map(toDto),

  create: async (input: z.infer<typeof feedbackSchema>) => {
    const feedback = await feedbackRepository.create({
      name: input.name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      message: input.message,
    });
    // Route publique et non authentifiée (comme la création de commande) :
    // un journal structuré permet de repérer un abus a posteriori.
    logger.info({ feedbackId: feedback.id, hasContact: Boolean(input.phone || input.email) }, "Avis déposé");
    return toDto(feedback);
  },

  async update(id: string, input: z.infer<typeof feedbackUpdateSchema>) {
    const existing = await feedbackRepository.findById(id);
    if (!existing) throw AppError.notFound("Avis introuvable.");
    const feedback = await feedbackRepository.update(id, input);
    return toDto(feedback);
  },

  async remove(id: string) {
    const existing = await feedbackRepository.findById(id);
    if (!existing) throw AppError.notFound("Avis introuvable.");
    await feedbackRepository.remove(id);
  },
};
