import { logger } from '../../config/logger';
import { metrics } from '../../common/observability/metrics';
import { archiveService } from '../../modules/archive/archive.service';

export async function processArchiveLifecycle() {
  const result = await archiveService.purgeDue();
  metrics.gauge('archive_purge_due_total', undefined, result.processed);
  logger.info('archive_lifecycle_processed', {
    processed: result.processed,
    purged: result.purged.length,
  });
  return result;
}
