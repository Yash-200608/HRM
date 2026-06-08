import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { adminController } from './admin.controller';

export const adminRouter = Router();

adminRouter.get('/metrics', authenticate(['admin', 'service']), asyncHandler(adminController.metrics));
adminRouter.get('/revenue', authenticate(['admin', 'service']), asyncHandler(adminController.revenue));
adminRouter.get('/plans', authenticate(['admin', 'service']), asyncHandler(adminController.plans));
adminRouter.get('/payments/failures', authenticate(['admin', 'service']), asyncHandler(adminController.payments));
adminRouter.get('/features', authenticate(['admin', 'service']), asyncHandler(adminController.features));
adminRouter.get('/ops/metrics', authenticate(['admin', 'service']), asyncHandler(adminController.operationalMetrics));
adminRouter.post('/outbox/:id/replay', authenticate(['admin', 'service']), asyncHandler(adminController.replayOutboxEvent));
