import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/subscription_billing_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-jwt-secret-test-admin-jwt-secret';
process.env.HRM_ACCESS_TOKEN_SECRET = process.env.HRM_ACCESS_TOKEN_SECRET ?? 'test-hrm-access-token-secret';
process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-api-key';
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'test-api-key-pepper';
process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER ?? 'test-password-pepper';
process.env.AUTH_TOKEN_PEPPER = process.env.AUTH_TOKEN_PEPPER ?? 'test-auth-token-pepper';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'test-resend-api-key';
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com';
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://127.0.0.1:3000';
process.env.SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@example.com';
process.env.SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? 'supersecurepass';
process.env.SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

test('health and docs endpoints respond without authentication', async () => {
  const { createApp } = await import('../src/app');
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(healthResponse.status, 200);

    const healthBody = await healthResponse.json();
    assert.equal(healthBody.ok, true);

    const docsResponse = await fetch(`http://127.0.0.1:${port}/docs/openapi.yaml`);
    assert.equal(docsResponse.status, 200);

    const docsBody = await docsResponse.text();
    assert.match(docsBody, /openapi:\s*3\.1\.0/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('billing routes reject unauthorized access', async () => {
  const { createApp } = await import('../src/app');
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/v1/billing/invoices/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('HRM access tokens authenticate as subscription principals without local operator records', async () => {
  const { createApp } = await import('../src/app');
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const token = jwt.sign(
      {
        id: '65f000000000000000000001',
        role: 'admin',
        companyId: '65f000000000000000000002',
      },
      process.env.HRM_ACCESS_TOKEN_SECRET as string,
      { expiresIn: '1h' },
    );

    const response = await fetch(`http://127.0.0.1:${port}/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.kind, 'admin');
    assert.equal(body.data.subject, '65f000000000000000000001');
    assert.equal(body.data.organizationId, '65f000000000000000000002');
    assert.deepEqual(body.data.roles, ['admin', 'admin']);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
