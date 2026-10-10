import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
});

export const loginSchema = signupSchema;
