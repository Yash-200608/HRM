import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
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

test('invoice pdf generator emits a valid pdf header and invoice content', async () => {
  const { generateInvoicePdfBuffer } = await import('../src/modules/billing/invoice-pdf.service');

  const pdf = generateInvoicePdfBuffer({
    invoiceNumber: 'INV-001',
    publicId: 'inv_abc123',
    status: 'OPEN',
    currency: 'INR',
    subtotal: 1000,
    tax: 180,
    total: 1180,
    lineItems: [
      {
        code: 'starter',
        description: 'Starter subscription',
        quantity: 1,
        unitAmount: 1000,
        totalAmount: 1000,
      },
    ],
  });

  assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
  assert.match(pdf.toString('utf8'), /INV-001/);
  assert.match(pdf.toString('utf8'), /Starter subscription/);
});
