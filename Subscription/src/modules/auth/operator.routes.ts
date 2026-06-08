import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireRoles } from '../../common/middleware/rbac';
import { operatorController } from './operator.controller';

export const operatorRouter = Router();

operatorRouter.post('/login', asyncHandler(operatorController.login));
operatorRouter.post('/email-verification/request', asyncHandler(operatorController.requestEmailVerification));
operatorRouter.get('/email-verification/confirm', asyncHandler(operatorController.confirmEmailVerification));
operatorRouter.post('/email-verification/confirm', asyncHandler(operatorController.confirmEmailVerification));
operatorRouter.post('/password-reset/request', asyncHandler(operatorController.requestPasswordReset));
operatorRouter.post('/password-reset/confirm', asyncHandler(operatorController.confirmPasswordReset));
operatorRouter.get('/me', authenticate(['admin', 'user']), asyncHandler(operatorController.me));
operatorRouter.get('/sessions', authenticate(['admin', 'user']), asyncHandler(operatorController.listSessions));
operatorRouter.post('/logout', authenticate(['admin', 'user']), asyncHandler(operatorController.logout));
operatorRouter.post('/logout-all', authenticate(['admin', 'user']), asyncHandler(operatorController.logoutAll));
operatorRouter.delete('/sessions/:sessionId', authenticate(['admin', 'user']), asyncHandler(operatorController.revokeSession));
operatorRouter.post('/operators', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.create));
operatorRouter.get('/operators/admins', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.listAdmins));
operatorRouter.get('/operators/users', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.listUsers));
operatorRouter.post('/operators/:id/resend-verification', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.resendEmailVerification));
operatorRouter.post('/operators/:id/force-password-reset', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.forcePasswordReset));
operatorRouter.post('/operators/:id/clear-verification-state', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.clearVerificationState));
operatorRouter.post('/operators/:id/revoke-password-reset', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.revokePasswordReset));
operatorRouter.patch('/operators/:id/suspend', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.suspend));
operatorRouter.patch('/operators/:id/activate', authenticate(['admin', 'service']), requireRoles(['admin']), asyncHandler(operatorController.activate));
