import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireIdempotencyKey } from '../../common/middleware/idempotency';
import { requireTenantParamOrganization } from '../../common/middleware/tenant-access';
import { requireWritableTenantOrganizationFromParam } from '../../common/middleware/archive-access';
import { organizationController } from './organization.controller';

export const organizationRouter = Router();

organizationRouter.post('/', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(organizationController.create));
organizationRouter.get('/:id', authenticate(['admin', 'service', 'organization']), requireTenantParamOrganization('id'), asyncHandler(organizationController.getById));
organizationRouter.patch('/:id', authenticate(['admin', 'service']), requireTenantParamOrganization('id'), requireWritableTenantOrganizationFromParam('id'), asyncHandler(organizationController.patch));
