import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { eventController } from './event.controller';

export const eventRouter = Router();

eventRouter.post('/inbound', authenticate(['service']), asyncHandler(eventController.ingest));
