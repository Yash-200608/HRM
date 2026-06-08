import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireTenantBodyOrganization, requireTenantParamOrganization } from '../../common/middleware/tenant-access';
import { archiveController } from './archive.controller';

export const archiveRouter = Router();

archiveRouter.get('/:organizationId', authenticate(['admin', 'service', 'organization']), requireTenantParamOrganization('organizationId'), asyncHandler(archiveController.getByOrganization));
archiveRouter.patch('/', authenticate(['admin', 'service']), requireTenantBodyOrganization('organizationId'), asyncHandler(archiveController.update));
archiveRouter.post('/:organizationId/restore', authenticate(['admin', 'service']), requireTenantParamOrganization('organizationId'), asyncHandler(archiveController.restore));
