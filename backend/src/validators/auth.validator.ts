import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
});

export const loginSchema = signupSchema;

export const emailVerificationSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i, 'Verification token is invalid.'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email().max(160),
});
