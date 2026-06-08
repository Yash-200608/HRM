import { Router } from 'express';
import { renderPrometheusMetrics } from '../common/observability/metrics';

export const metricsRouter = Router();

metricsRouter.get('/', (_req, res) => {
  res.status(200);
  res.type('text/plain; version=0.0.4');
  res.send(renderPrometheusMetrics());
});
