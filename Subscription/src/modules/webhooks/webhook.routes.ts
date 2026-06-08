import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { webhookController } from './webhook.controller';

export const webhookRouter = Router();

webhookRouter.post('/razorpay', asyncHandler(webhookController.razorpay));
