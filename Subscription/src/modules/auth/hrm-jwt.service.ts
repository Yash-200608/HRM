import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { AuthPrincipal } from '../../common/types/auth';

type HrmJwtPayload = jwt.JwtPayload & {
  id?: unknown;
  role?: unknown;
  companyId?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toPrincipal(payload: HrmJwtPayload): AuthPrincipal | null {
  const subject = asString(payload.id);
  const role = asString(payload.role)?.toLowerCase();
  const organizationId = asString(payload.companyId);

  if (!subject || !role) {
    return null;
  }

  if (role === 'admin' || role === 'super_admin') {
    return {
      kind: 'admin',
      subject,
      organizationId: organizationId ?? undefined,
      roles: ['admin', role],
    };
  }

  if (!organizationId) {
    return null;
  }

  return {
    kind: 'organization',
    subject,
    organizationId,
    roles: [role],
  };
}

export function verifyHrmBearerToken(token: string) {
  if (!env.HRM_ACCESS_TOKEN_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.HRM_ACCESS_TOKEN_SECRET) as HrmJwtPayload;
    const principal = toPrincipal(payload);
    return principal ? { payload: principal } : null;
  } catch {
    return null;
  }
}
