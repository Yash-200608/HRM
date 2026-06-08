import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestContextMiddleware } from './common/middleware/request-context';
import { errorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found';
import { apiRateLimit } from './common/middleware/rate-limit';
import { router } from './routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(morgan('combined'));
  app.use(requestContextMiddleware);
  app.use(apiRateLimit);
  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
