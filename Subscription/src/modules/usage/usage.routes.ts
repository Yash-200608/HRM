import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireWritableTenantOrganizationFromBody } from '../../common/middleware/archive-access';
import { requireTenantParamOrganization } from '../../common/middleware/tenant-access';
import { usageController } from './usage.controller';

export const usageRouter = Router();

usageRouter.post('/sync', authenticate(['service']), requireWritableTenantOrganizationFromBody('organizationId'), asyncHandler(usageController.sync));
usageRouter.get('/:organizationId', authenticate(['admin', 'service', 'organization']), requireTenantParamOrganization('organizationId'), asyncHandler(usageController.getByOrganization));
