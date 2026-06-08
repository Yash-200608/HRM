import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';

export function notFoundHandler(_req: Request, _res: Response, next: (err?: unknown) => void) {
  next(new AppError('Route not found', 404, ErrorCodes.NotFound));
}
