import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const feedbackRepository = {
  findAll: () => prisma.feedback.findMany({ orderBy: { createdAt: "desc" } }),
  findById: (id: string) => prisma.feedback.findUnique({ where: { id } }),
  create: (data: Prisma.FeedbackCreateInput) => prisma.feedback.create({ data }),
  update: (id: string, data: Prisma.FeedbackUpdateInput) => prisma.feedback.update({ where: { id }, data }),
  remove: (id: string) => prisma.feedback.delete({ where: { id } }),
};
