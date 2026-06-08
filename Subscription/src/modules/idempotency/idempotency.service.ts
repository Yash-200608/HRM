import { createHash } from 'node:crypto';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { idempotencyRepository } from './idempotency.repository';

function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function runIdempotentOperation<T>(input: {
  scope: string;
  key: string;
  payload: unknown;
  ttlMs?: number;
  operation: () => Promise<T>;
}) {
  const requestHash = hashPayload(input.payload);
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? 24 * 60 * 60 * 1000));
  const existing = await idempotencyRepository.findByScopeAndKey(input.scope, input.key);

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new AppError('Idempotency key reused with a different request', 409, ErrorCodes.IdempotencyConflict);
    }

    if (existing.status === 'COMPLETED') {
      return existing.responsePayload as T;
    }

    throw new AppError('Request is already being processed', 409, ErrorCodes.IdempotencyConflict);
  }

  const record = await idempotencyRepository.create({
    scope: input.scope,
    key: input.key,
    requestHash,
    status: 'PENDING',
    lockedAt: new Date(),
    expiresAt,
  });

  try {
    const result = await input.operation();
    await idempotencyRepository.complete(String(record._id), {
      status: 'COMPLETED',
      responseStatus: 200,
      responsePayload: result,
      failureReason: null,
    });
    return result;
  } catch (error) {
    await idempotencyRepository.fail(String(record._id), {
      status: 'FAILED',
      failureReason: error instanceof Error ? error.message : 'unknown_error',
    });
    throw error;
  }
}
