import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/subscription_billing_test';
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

test('secret hashing and verification round trips', async () => {
  const { createSecretHash, verifySecret } = await import('../src/common/security/crypto');

  const secretHash = createSecretHash('my-secret-value');
  assert.equal(verifySecret('my-secret-value', secretHash), true);
  assert.equal(verifySecret('wrong-value', secretHash), false);
});

test('razorpay webhook signatures are verifiable', async () => {
  const { signRazorpayWebhookPayload, verifyRazorpayWebhookSignature } = await import('../src/integrations/razorpay/webhook');

  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: {} } }));
  const signature = signRazorpayWebhookPayload(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET as string);

  assert.equal(verifyRazorpayWebhookSignature(rawBody, signature), true);
  assert.equal(verifyRazorpayWebhookSignature(rawBody, 'bad-signature'), false);
});
