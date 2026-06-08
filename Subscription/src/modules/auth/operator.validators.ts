import { z } from 'zod';

export const createOperatorSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(['ADMIN', 'USER']),
  organizationId: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const emailLookupSchema = z.object({
  email: z.string().email(),
});

export const emailVerificationConfirmSchema = z.object({
  token: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export const operatorIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().min(1),
});
