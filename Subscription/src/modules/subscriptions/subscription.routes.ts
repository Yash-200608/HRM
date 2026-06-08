import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireIdempotencyKey } from '../../common/middleware/idempotency';
import { requireResourceOrganizationAccess } from '../../common/middleware/tenant-access';
import { requireWritableTenantOrganizationFromBody } from '../../common/middleware/archive-access';
import { subscriptionRepository } from './subscription.repository';
import { subscriptionController } from './subscription.controller';

export const subscriptionRouter = Router();

subscriptionRouter.post('/', authenticate(['admin', 'service']), requireIdempotencyKey(), requireWritableTenantOrganizationFromBody('organizationId'), asyncHandler(subscriptionController.create));
subscriptionRouter.get(
  '/:id',
  authenticate(['admin', 'service', 'organization']),
  requireResourceOrganizationAccess(async (req) => {
    const subscription = await subscriptionRepository.findById(String(req.params.id));
    return subscription ? String((subscription.organization as { _id?: unknown } | null | undefined)?._id ?? subscription.organization) : null;
  }),
  asyncHandler(subscriptionController.getById),
);
subscriptionRouter.patch('/:id/upgrade', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(subscriptionController.upgrade));
subscriptionRouter.patch('/:id/downgrade', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(subscriptionController.downgrade));
subscriptionRouter.patch('/:id/cancel', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(subscriptionController.cancel));
