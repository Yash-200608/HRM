import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireTenantBodyOrganization } from '../../common/middleware/tenant-access';
import { limitController } from './limit.controller';

export const limitRouter = Router();

limitRouter.post('/employees/check', authenticate(['service', 'admin', 'organization']), requireTenantBodyOrganization('organizationId'), asyncHandler(limitController.checkEmployeeLimit));
