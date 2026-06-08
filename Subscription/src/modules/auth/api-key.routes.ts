import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireOrganizationAccess, requireRoles } from '../../common/middleware/rbac';
import { apiKeyController } from './api-key.controller';

export const apiKeyRouter = Router();

apiKeyRouter.get('/admin', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(apiKeyController.listAdminKeys));
apiKeyRouter.post('/admin', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(apiKeyController.createAdminKey));
apiKeyRouter.delete('/admin/:id', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(apiKeyController.revokeAdminKey));

apiKeyRouter.get('/organizations/:organizationId', authenticate(['organization', 'admin', 'service']), requireOrganizationAccess(), asyncHandler(apiKeyController.listOrganizationKeys));
apiKeyRouter.post('/organizations/:organizationId', authenticate(['organization', 'admin', 'service']), requireOrganizationAccess(), asyncHandler(apiKeyController.createOrganizationKey));
apiKeyRouter.delete('/organizations/:organizationId/:id', authenticate(['organization', 'admin', 'service']), requireOrganizationAccess(), asyncHandler(apiKeyController.revokeOrganizationKey));
