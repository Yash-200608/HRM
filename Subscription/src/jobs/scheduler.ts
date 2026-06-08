import 'dotenv/config';
import { registerSchedulers } from './schedulers';
import { logger } from '../config/logger';

async function main() {
  await registerSchedulers();
  logger.info('schedulers_registered');
  process.exit(0);
}

void main().catch((error) => {
  logger.error('scheduler_bootstrap_failed', error);
  process.exit(1);
});
