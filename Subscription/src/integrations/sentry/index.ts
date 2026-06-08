import { logger } from '../../config/logger';
import { metrics } from '../../common/observability/metrics';

export function captureException(error: unknown, context?: Record<string, unknown>) {
  metrics.increment('errors_total', { source: 'sentry' });
  logger.error('sentry_exception', {
    error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    context: context ?? {},
  });
  return error;
}
