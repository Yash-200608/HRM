import { z } from 'zod';
import { AppError } from './errors/app-error';
import { ErrorCodes } from './errors/error-codes';

export function parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('Validation failed', 400, ErrorCodes.ValidationFailed, result.error.flatten());
  }
  return result.data;
}
