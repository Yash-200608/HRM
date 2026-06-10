import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { AuthPrincipal } from '../../common/types/auth';

type HrmJwtPayload = jwt.JwtPayload & {
  id?: unknown;
  role?: unknown;
  companyId?: unknown;
  orgId?: unknown;
  ver?: unknown;
  iss?: unknown;
  aud?: unknown;
  principalKind?: unknown;
  tokenVersion?: unknown;
  sessionId?: unknown;
  entitlements?: unknown;
  subscriptionPlan?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolvePrincipalKind(payload: HrmJwtPayload) {
  const principalKind = asString(payload.principalKind)?.toLowerCase();
  if (principalKind) {
    return principalKind;
  }

  return asString(payload.role)?.toLowerCase();
}

function resolveOrganizationId(payload: HrmJwtPayload) {
  return asString(payload.orgId) ?? asString(payload.companyId);
}

function buildRoles(principalKind: string | null, role: string | null) {
  if (!principalKind) {
    return role ? [role] : undefined;
  }

  if (principalKind === 'super_admin' || principalKind === 'admin') {
    return ['admin', ...(role ? [role] : [])];
  }

  return [principalKind, ...(role && role !== principalKind ? [role] : [])];
}

function validateIssuerAndAudience(payload: HrmJwtPayload) {
  if (payload.ver !== 'v1') {
    return true;
  }

  const issuer = asString(payload.iss);
  const audience = asString(payload.aud);

  return issuer === env.JWT_ISSUER && audience === env.JWT_AUDIENCE;
}

function toPrincipal(payload: HrmJwtPayload): AuthPrincipal | null {
  const subject = asString(payload.id);
  const principalKind = resolvePrincipalKind(payload);
  const role = asString(payload.role)?.toLowerCase();
  const organizationId = resolveOrganizationId(payload);
  const sessionId = asString(payload.sessionId) ?? undefined;
  const tokenVersion = asNumber(payload.tokenVersion);

  if (!subject || !principalKind) {
    return null;
  }

  if (principalKind === 'admin' || principalKind === 'super_admin') {
    return {
      kind: 'admin',
      subject,
      organizationId: organizationId ?? undefined,
      roles: buildRoles(principalKind, role),
      sessionId,
      tokenId: sessionId,
      tokenVersion,
    };
  }

  if (!organizationId) {
    return null;
  }

  return {
    kind: 'organization',
    subject,
    organizationId,
    roles: buildRoles(principalKind, role),
    sessionId,
    tokenId: sessionId,
    tokenVersion,
  };
}

export function verifyHrmBearerToken(token: string) {
  if (!env.HRM_ACCESS_TOKEN_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.HRM_ACCESS_TOKEN_SECRET) as HrmJwtPayload;

    if (!validateIssuerAndAudience(payload)) {
      return null;
    }

    const principal = toPrincipal(payload);
    return principal ? { payload: principal } : null;
  } catch {
    return null;
  }
}