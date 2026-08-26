import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  password: z.string().min(4),
});

export const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(4),
});
