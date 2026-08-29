import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const testimonialRepository = {
  findAll: () => prisma.testimonial.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
  findById: (id: string) => prisma.testimonial.findUnique({ where: { id } }),
  create: (data: Prisma.TestimonialCreateInput) => prisma.testimonial.create({ data }),
  update: (id: string, data: Prisma.TestimonialUpdateInput) => prisma.testimonial.update({ where: { id }, data }),
  remove: (id: string) => prisma.testimonial.delete({ where: { id } }),
};
