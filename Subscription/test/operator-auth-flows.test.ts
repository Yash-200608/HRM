import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-jwt-secret-test-admin-jwt-secret';
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
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'test-razorpay-webhook-secret';
process.env.Razorpay_KEY_ID = process.env.Razorpay_KEY_ID ?? 'test-razorpay-key-id';
process.env.Razorpay_KEY_SECRET = process.env.Razorpay_KEY_SECRET ?? 'test-razorpay-key-secret';

let mongoServer: MongoMemoryReplSet;
let createApp: typeof import('../src/app').createApp;
let organizationService: typeof import('../src/modules/organizations/organization.service').organizationService;
let operatorService: typeof import('../src/modules/auth/operator.service').operatorService;

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });
  process.env.MONGODB_URI = mongoServer.getUri();

  const appModule = await import('../src/app');
  const organizationModule = await import('../src/modules/organizations/organization.service');
  const operatorModule = await import('../src/modules/auth/operator.service');
  const mongoModule = await import('../src/config/mongo');

  createApp = appModule.createApp;
  organizationService = organizationModule.organizationService;
  operatorService = operatorModule.operatorService;

  await mongoModule.connectMongo();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

function extractToken(emailPayload: { html?: string; text?: string }) {
  const body = `${emailPayload.html ?? ''}\n${emailPayload.text ?? ''}`;
  const match = body.match(/((?:evt|prt)_[a-f0-9]+)\.([a-f0-9]+)/i);
  assert.ok(match, 'expected verification/reset token in email payload');
  return match[0];
}

test('email verification and password reset flows work for operators', async () => {
  const organization = await organizationService.create({
    name: 'Auth Flow Co',
    slug: 'auth-flow-co',
  });

  const app = createApp();
  const server = app.listen(0);
  const originalFetch = globalThis.fetch;
  const emails: Array<Record<string, unknown>> = [];

  try {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.resend.com/emails') {
        const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        emails.push(payload);
        return new Response(JSON.stringify({ id: `email_${emails.length}` }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };

    const userOperator = await operatorService.create({
      email: 'operator-auth@example.com',
      fullName: 'Operator Auth',
      password: 'initialpassword',
      role: 'USER',
      organizationId: String(organization._id),
    });

    const { port } = server.address() as AddressInfo;

    const blockedLogin = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
        password: 'initialpassword',
      }),
    });
    assert.equal(blockedLogin.status, 403);
    const blockedBody = await blockedLogin.json();
    assert.equal(blockedBody.error.code, 'EMAIL_NOT_VERIFIED');

    const verificationRequest = await originalFetch(`http://127.0.0.1:${port}/v1/auth/email-verification/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
      }),
    });
    assert.equal(verificationRequest.status, 200);

    assert.ok(emails.length >= 1);
    const verificationToken = extractToken(emails.at(-1) as { html?: string; text?: string });

    const verificationResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/email-verification/confirm?token=${encodeURIComponent(verificationToken)}`);
    assert.equal(verificationResponse.status, 200);

    const loginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
        password: 'initialpassword',
      }),
    });
    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.equal(typeof loginBody.token, 'string');
    assert.equal(typeof loginBody.data?.session?.sessionId, 'string');

    const sessionsResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/sessions`, {
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    assert.equal(sessionsResponse.status, 200);
    const sessionsBody = await sessionsResponse.json();
    assert.ok(Array.isArray(sessionsBody.data));
    assert.equal(sessionsBody.data[0].sessionId, loginBody.data.session.sessionId);

    const logoutResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/logout`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    assert.equal(logoutResponse.status, 200);

    const loggedOutMeResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    assert.equal(loggedOutMeResponse.status, 401);

    const preResetLoginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
        password: 'initialpassword',
      }),
    });
    assert.equal(preResetLoginResponse.status, 200);
    const preResetLoginBody = await preResetLoginResponse.json();
    assert.equal(typeof preResetLoginBody.token, 'string');

    const passwordResetRequest = await originalFetch(`http://127.0.0.1:${port}/v1/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
      }),
    });
    assert.equal(passwordResetRequest.status, 200);

    const resetToken = extractToken(emails.at(-1) as { html?: string; text?: string });

    const passwordResetConfirm = await originalFetch(`http://127.0.0.1:${port}/v1/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'updatedpassword',
      }),
    });
    assert.equal(passwordResetConfirm.status, 200);

    const revokedTokenMeResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${preResetLoginBody.token}`,
      },
    });
    assert.equal(revokedTokenMeResponse.status, 401);

    const oldPasswordLogin = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
        password: 'initialpassword',
      }),
    });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
        password: 'updatedpassword',
      }),
    });
    assert.equal(newPasswordLogin.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('admin endpoints can resend verification and force password resets', async () => {
  const organization = await organizationService.create({
    name: 'Admin Flow Co',
    slug: 'admin-flow-co',
  });

  const app = createApp();
  const server = app.listen(0);
  const originalFetch = globalThis.fetch;
  const emails: Array<Record<string, unknown>> = [];

  try {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.resend.com/emails') {
        const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        emails.push(payload);
        return new Response(JSON.stringify({ id: `email_${emails.length}` }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };

    const adminOperator = await operatorService.create({
      email: 'admin-flow@example.com',
      fullName: 'Admin Flow',
      password: 'adminpassword',
      role: 'ADMIN',
    });

    const targetOperator = await operatorService.create({
      email: 'target-flow@example.com',
      fullName: 'Target Flow',
      password: 'targetpassword',
      role: 'USER',
      organizationId: String(organization._id),
    });

    const { port } = server.address() as AddressInfo;
    const adminLoginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminOperator.email,
        password: 'adminpassword',
      }),
    });
    assert.equal(adminLoginResponse.status, 200);
    const adminLoginBody = await adminLoginResponse.json();

    const resendResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${targetOperator._id}/resend-verification`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminLoginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(resendResponse.status, 200);
    const resendBody = await resendResponse.json();
    assert.equal(resendBody.data.queued, true);
    assert.equal(resendBody.data.sent, true);
    assert.ok(emails.length >= 1);
    assert.match(String(emails.at(-1)?.html ?? ''), /\/v1\/auth\/email-verification\/confirm\?token=/);

    const verificationToken = extractToken(emails.at(-1) as { html?: string; text?: string });
    const verificationResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/email-verification/confirm?token=${encodeURIComponent(verificationToken)}`);
    assert.equal(verificationResponse.status, 200);

    const targetLoginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: targetOperator.email,
        password: 'targetpassword',
      }),
    });
    assert.equal(targetLoginResponse.status, 200);
    const targetLoginBody = await targetLoginResponse.json();

    const forceResetResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${targetOperator._id}/force-password-reset`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminLoginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(forceResetResponse.status, 200);
    const forceResetBody = await forceResetResponse.json();
    assert.equal(forceResetBody.data.queued, true);
    assert.equal(forceResetBody.data.sent, true);
    assert.match(String(emails.at(-1)?.html ?? ''), /\/reset-password\?token=/);

    const revokedTargetMeResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${targetLoginBody.token}`,
      },
    });
    assert.equal(revokedTargetMeResponse.status, 401);

    const resetToken = extractToken(emails.at(-1) as { html?: string; text?: string });
    const passwordResetConfirm = await originalFetch(`http://127.0.0.1:${port}/v1/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'adminforcedpassword',
      }),
    });
    assert.equal(passwordResetConfirm.status, 200);

    const loginWithNewPassword = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: targetOperator.email,
        password: 'adminforcedpassword',
      }),
    });
    assert.equal(loginWithNewPassword.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('admin endpoints can clear verification state and revoke pending password resets', async () => {
  const organization = await organizationService.create({
    name: 'Admin Maintenance Co',
    slug: 'admin-maintenance-co',
  });

  const app = createApp();
  const server = app.listen(0);
  const originalFetch = globalThis.fetch;
  const emails: Array<Record<string, unknown>> = [];

  try {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://api.resend.com/emails') {
        const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        emails.push(payload);
        return new Response(JSON.stringify({ id: `email_${emails.length}` }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };

    const adminOperator = await operatorService.create({
      email: 'admin-maintenance@example.com',
      fullName: 'Admin Maintenance',
      password: 'adminpassword',
      role: 'ADMIN',
    });

    const targetOperator = await operatorService.create({
      email: 'maintenance-target@example.com',
      fullName: 'Maintenance Target',
      password: 'targetpassword',
      role: 'USER',
      organizationId: String(organization._id),
    });

    const { port } = server.address() as AddressInfo;
    const adminLoginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminOperator.email,
        password: 'adminpassword',
      }),
    });
    const adminLoginBody = await adminLoginResponse.json();

    const resendResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${targetOperator._id}/resend-verification`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminLoginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(resendResponse.status, 200);

    const clearVerificationResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${targetOperator._id}/clear-verification-state`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminLoginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(clearVerificationResponse.status, 200);
    const clearVerificationBody = await clearVerificationResponse.json();
    assert.equal(clearVerificationBody.data.cleared, true);
    assert.equal(clearVerificationBody.data.operator.emailVerifiedAt, null);

    const forceResetResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${targetOperator._id}/force-password-reset`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminLoginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(forceResetResponse.status, 200);

    const revokeResetResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${targetOperator._id}/revoke-password-reset`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminLoginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(revokeResetResponse.status, 200);
    const revokeResetBody = await revokeResetResponse.json();
    assert.equal(revokeResetBody.data.revoked, true);
    assert.equal(revokeResetBody.data.operator.passwordResetTokenId, null);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
