import 'dotenv/config';
import { createServer } from 'node:http';
import { connectMongo } from './config/mongo';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { planService } from './modules/plans/plan.service';

async function main() {
  await connectMongo();
  await planService.seedDefaults();

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info('server_started', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string) => {
    logger.info('shutdown_requested', { signal });
    server.close(() => {
      logger.info('http_server_closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

void main().catch((error) => {
  logger.error('fatal_bootstrap_error', error);
  process.exit(1);
});
