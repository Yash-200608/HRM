import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';

export function requireIdempotencyKey() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const idempotencyKey = req.header('idempotency-key') ?? req.header('x-idempotency-key');
    if (!idempotencyKey) {
      next(new AppError('Idempotency-Key header required', 400, ErrorCodes.ValidationFailed));
      return;
    }

    req.idempotencyKey = idempotencyKey.trim();
    next();
  };
}
