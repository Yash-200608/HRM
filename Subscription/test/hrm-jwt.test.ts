import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/subscription_billing_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-jwt-secret-test-admin-jwt-secret';
process.env.HRM_ACCESS_TOKEN_SECRET = process.env.HRM_ACCESS_TOKEN_SECRET ?? 'test-hrm-access-token-secret';
process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-api-key';
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'test-api-key-pepper';
process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER ?? 'test-password-pepper';
process.env.AUTH_TOKEN_PEPPER = process.env.AUTH_TOKEN_PEPPER ?? 'test-auth-token-pepper';

test('verifyHrmBearerToken accepts legacy HRM JWT claims', async () => {
  const { verifyHrmBearerToken } = await import('../src/modules/auth/hrm-jwt.service');
  const token = jwt.sign(
    {
      id: 'legacy-admin',
      role: 'admin',
      companyId: 'org-legacy',
    },
    process.env.HRM_ACCESS_TOKEN_SECRET as string,
  );

  const verified = verifyHrmBearerToken(token);
  assert.ok(verified);
  assert.equal(verified?.payload.kind, 'admin');
  assert.equal(verified?.payload.subject, 'legacy-admin');
  assert.equal(verified?.payload.organizationId, 'org-legacy');
  assert.deepEqual(verified?.payload.roles, ['admin', 'admin']);
});

test('verifyHrmBearerToken accepts v1 JWT claims with principalKind and session metadata', async () => {
  const { verifyHrmBearerToken } = await import('../src/modules/auth/hrm-jwt.service');
  const token = jwt.sign(
    {
      ver: 'v1',
      id: 'emp-1',
      role: 'employee',
      companyId: 'org-1',
      orgId: 'org-1',
      principalKind: 'employee',
      tokenVersion: 4,
      sessionId: 'session-123',
      entitlements: ['payroll'],
      subscriptionPlan: 'growth',
    },
    process.env.HRM_ACCESS_TOKEN_SECRET as string,
  );

  const verified = verifyHrmBearerToken(token);
  assert.ok(verified);
  assert.equal(verified?.payload.kind, 'organization');
  assert.equal(verified?.payload.subject, 'emp-1');
  assert.equal(verified?.payload.organizationId, 'org-1');
  assert.equal(verified?.payload.sessionId, 'session-123');
  assert.equal(verified?.payload.tokenVersion, 4);
  assert.deepEqual(verified?.payload.roles, ['employee']);
});