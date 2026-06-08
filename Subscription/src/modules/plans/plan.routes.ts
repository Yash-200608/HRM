import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { planController } from './plan.controller';

export const planRouter = Router();

planRouter.get('/', asyncHandler(planController.list));
planRouter.get('/:id', asyncHandler(planController.getById));
