import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireTenantBodyOrganization } from '../../common/middleware/tenant-access';
import { featureController } from './feature.controller';

export const featureRouter = Router();

featureRouter.post('/check', authenticate(['admin', 'service', 'organization']), requireTenantBodyOrganization('organizationId'), asyncHandler(featureController.check));
