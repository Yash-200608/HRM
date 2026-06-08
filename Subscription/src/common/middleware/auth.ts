import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import { constantTimeEquals } from '../security/crypto';
import { apiKeyService } from '../../modules/auth/api-key.service';
import { sessionRepository } from '../../modules/auth/session.repository';
import { verifyBearerToken } from '../../modules/auth/jwt.service';
import { verifyHrmBearerToken } from '../../modules/auth/hrm-jwt.service';
import type { AuthPrincipal } from '../types/auth';

export function authenticate(requiredKinds: AuthPrincipal['kind'][] = ['user', 'admin', 'service', 'organization']) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.header('authorization');
    const apiKey = req.header('x-api-key');
    const internalKey = req.header('x-internal-api-key');

    if (internalKey && constantTimeEquals(internalKey, env.INTERNAL_API_KEY)) {
      req.auth = { kind: 'service', subject: 'internal' };
      return next();
    }

    if (apiKey) {
      const principal = await apiKeyService.authenticate(apiKey);
      if (!principal) {
        throw new AppError('Unauthorized', 401, ErrorCodes.Unauthorized);
      }
      if (!requiredKinds.includes(principal.kind)) {
        throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
      }
      req.auth = principal;
      return next();
    }

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const verified = verifyBearerToken(token);
      if (!verified) {
        const hrmVerified = verifyHrmBearerToken(token);
        if (!hrmVerified) {
          throw new AppError('Unauthorized', 401, ErrorCodes.Unauthorized);
        }

        if (!requiredKinds.includes(hrmVerified.payload.kind)) {
          throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
        }

        req.auth = hrmVerified.payload;
        return next();
      }

      const { payload } = verified;
      if (!requiredKinds.includes(payload.kind)) {
        throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
      }

      if (payload.sid) {
        const session = await sessionRepository.findActiveBySessionId(payload.sid);
        if (!session || session.tokenId !== payload.tokenId || session.tokenVersion !== (payload.tokenVersion ?? session.tokenVersion)) {
          throw new AppError('Unauthorized', 401, ErrorCodes.Unauthorized);
        }
      }

      req.auth = payload;
      return next();
    }

    throw new AppError('Unauthorized', 401, ErrorCodes.Unauthorized);
  };
}
