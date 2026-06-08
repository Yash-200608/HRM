import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { AuthPrincipal } from '../../common/types/auth';

type TokenSecret = typeof env.JWT_SECRET | typeof env.ADMIN_JWT_SECRET;

export type SignedAccessTokenPayload = AuthPrincipal & {
  sid?: string;
  tv?: number;
};

export function getJwtSecretForPrincipal(principal: AuthPrincipal): TokenSecret {
  return principal.kind === 'admin' ? env.ADMIN_JWT_SECRET : env.JWT_SECRET;
}

export function signAccessToken(
  principal: AuthPrincipal,
  expiresIn: jwt.SignOptions['expiresIn'] = '1h',
  options?: { secret?: string; sessionId?: string; tokenId?: string; tokenVersion?: number },
) {
  const payload: SignedAccessTokenPayload = {
    ...principal,
    ...(options?.sessionId ? { sid: options.sessionId } : {}),
    ...(options?.tokenVersion ? { tv: options.tokenVersion } : {}),
  };

  return jwt.sign(payload, options?.secret ?? getJwtSecretForPrincipal(principal), {
    expiresIn,
    jwtid: options?.tokenId,
  });
}

export function verifyBearerToken(token: string) {
  const verifiedWithAdminSecret = tryVerify(token, env.ADMIN_JWT_SECRET);
  if (verifiedWithAdminSecret) {
    return verifiedWithAdminSecret;
  }

  const verifiedWithUserSecret = tryVerify(token, env.JWT_SECRET);
  if (verifiedWithUserSecret) {
    return verifiedWithUserSecret;
  }

  return null;
}

function isAuthKind(value: unknown): value is AuthPrincipal['kind'] {
  return value === 'user' || value === 'admin' || value === 'service' || value === 'organization';
}

function tryVerify(token: string, secret: string) {
  try {
    const payload = jwt.verify(token, secret) as SignedAccessTokenPayload;
    if (!isAuthKind(payload.kind) || typeof payload.subject !== 'string') {
      return null;
    }
    if (payload.kind === 'admin' && secret !== env.ADMIN_JWT_SECRET) {
      return null;
    }
    if (payload.kind !== 'admin' && secret === env.ADMIN_JWT_SECRET) {
      return null;
    }
    return { payload, secret };
  } catch {
    return null;
  }
}
