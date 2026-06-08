import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import { logger } from '../../config/logger';
import { captureException } from '../../integrations/sentry';
import { metrics } from '../observability/metrics';

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const err = error instanceof AppError
    ? error
    : new AppError('Internal server error', 500, ErrorCodes.InternalServerError);

  logger.error('request_failed', {
    requestId: req.requestId,
    code: err.code,
    message: err.message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (err.statusCode >= 500) {
    metrics.increment('http_server_errors_total', { code: err.code });
    captureException(error, {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      code: err.code,
    });
  }

  res.status(err.statusCode).json({
    error: {
      code: err.code,
      message: err.message,
      requestId: req.requestId,
    },
  });
}
