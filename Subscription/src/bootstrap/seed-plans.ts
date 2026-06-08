import 'dotenv/config';
import { connectMongo } from '../config/mongo';
import { planService } from '../modules/plans/plan.service';
import { logger } from '../config/logger';

async function main() {
  await connectMongo();
  await planService.seedDefaults();
  logger.info('plans_seeded');
  process.exit(0);
}

void main().catch((error) => {
  logger.error('seed_plans_failed', error);
  process.exit(1);
});
