import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
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
let planService: typeof import('../src/modules/plans/plan.service').planService;
let subscriptionService: typeof import('../src/modules/subscriptions/subscription.service').subscriptionService;
let usageService: typeof import('../src/modules/usage/usage.service').usageService;
let billingService: typeof import('../src/modules/billing/billing.service').billingService;
let operatorService: typeof import('../src/modules/auth/operator.service').operatorService;
let archiveService: typeof import('../src/modules/archive/archive.service').archiveService;

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

  const appModule = await import('../src/app');
  const organizationModule = await import('../src/modules/organizations/organization.service');
  const planModule = await import('../src/modules/plans/plan.service');
  const subscriptionModule = await import('../src/modules/subscriptions/subscription.service');
  const usageModule = await import('../src/modules/usage/usage.service');
  const billingModule = await import('../src/modules/billing/billing.service');
  const operatorModule = await import('../src/modules/auth/operator.service');
  const archiveModule = await import('../src/modules/archive/archive.service');
  const mongoModule = await import('../src/config/mongo');

  createApp = appModule.createApp;
  organizationService = organizationModule.organizationService;
  planService = planModule.planService;
  subscriptionService = subscriptionModule.subscriptionService;
  usageService = usageModule.usageService;
  billingService = billingModule.billingService;
  operatorService = operatorModule.operatorService;
  archiveService = archiveModule.archiveService;

  await mongoModule.connectMongo();
  await planService.seedDefaults();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('subscription and usage flows persist and enforce limits', async () => {
  const organization = await organizationService.create({
    name: 'Acme Corp',
    slug: 'acme-corp',
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'growth',
  });

  const upgraded = await subscriptionService.upgrade(String(subscription._id), 'professional');
  assert.equal(upgraded?.planCode, 'professional');

  const downgraded = await subscriptionService.downgrade(String(subscription._id), 'starter');
  assert.equal(downgraded?.planCode, 'starter');
  assert.equal(downgraded?.employeeLimit, 25);

  const usage = await usageService.sync({
    organizationId: String(organization._id),
    activeEmployees: 45,
    archivedEmployees: 3,
  });

  assert.equal(usage?.activeEmployees, 45);
  assert.equal(usage?.overageEmployees, 20);

  const limitCheck = await usageService.checkEmployeeLimit(String(organization._id), 30);
  assert.equal(limitCheck.allowed, false);
  assert.equal(limitCheck.reason, 'EMPLOYEE_LIMIT_EXCEEDED');
});

test('billing flow creates invoices, records payments, and tracks credits', async () => {
  const organization = await organizationService.create({
    name: 'Billing Co',
    slug: 'billing-co',
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  const invoice = await billingService.createInvoiceForSubscription(String(subscription._id), [
    {
      code: 'starter',
      description: 'Starter subscription',
      quantity: 1,
      unitAmount: 999,
    },
  ]);

  const finalized = await billingService.finalizeInvoice(String(invoice._id));
  assert.equal(finalized?.status, 'OPEN');

  const operator = await operatorService.create({
    email: 'billing-admin@example.com',
    fullName: 'Billing Admin',
    password: 'supersecurepass',
    role: 'ADMIN',
  });

  const app = createApp();
  const server = app.listen(0);
  const providerPayments = new Map<string, { orderId: string; amount: number; currency: string; status: 'authorized' | 'captured' | 'refunded' }>();

  let originalFetch = globalThis.fetch;
  try {
    const { port } = server.address() as AddressInfo;
    const appFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? (typeof input !== 'string' && 'method' in input ? input.method : 'GET');

      if (url.endsWith('/orders') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'order_test_1', status: 'created', receipt: 'INV-TEST' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/payments/') && method === 'GET') {
        const paymentId = url.split('/payments/')[1].split('?')[0];
        const payment = providerPayments.get(paymentId);
        return new Response(
          JSON.stringify({
            id: paymentId,
            order_id: payment?.orderId ?? 'order_test_1',
            amount: payment?.amount ?? 117800,
            currency: payment?.currency ?? 'INR',
            status: payment?.status ?? 'authorized',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      if (url.includes('/capture') && method === 'POST') {
        providerPayments.set('pay_provider_1', {
          orderId: 'order_test_1',
          amount: 117800,
          currency: 'INR',
          status: 'captured',
        });
        return new Response(
          JSON.stringify({
            id: 'pay_provider_1',
            order_id: 'order_test_1',
            amount: 117800,
            currency: 'INR',
            status: 'captured',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      if (url.includes('/refund') && method === 'POST') {
        providerPayments.set('pay_provider_1', {
          orderId: 'order_test_1',
          amount: 117800,
          currency: 'INR',
          status: 'refunded',
        });
        return new Response(JSON.stringify({ id: 'rfnd_1', status: 'processed', amount: 117800 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return appFetch(input, init);
    };

    const loginResponse = await appFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: operator.email,
        password: 'supersecurepass',
      }),
    });
    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.equal(typeof loginBody.token, 'string');

    const meResponse = await appFetch(`http://127.0.0.1:${port}/v1/auth/me`, {
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    assert.equal(meResponse.status, 200);
    const meBody = await meResponse.json();
    assert.equal(meBody.data.kind, 'admin');
    assert.equal(meBody.data.subject, String(operator._id));

    const orderResponse = await appFetch(`http://127.0.0.1:${port}/v1/billing/invoices/razorpay-order`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
        'idempotency-key': 'billing-order-test-1',
      },
      body: JSON.stringify({ invoiceId: String(invoice._id) }),
    });
    assert.equal(orderResponse.status, 200);
    const orderBody = await orderResponse.json();
    assert.equal(orderBody.data.providerOrderId, 'order_test_1');

    const captureResponse = await appFetch(`http://127.0.0.1:${port}/v1/billing/payments/capture`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
        'idempotency-key': 'billing-capture-test-1',
      },
      body: JSON.stringify({
        paymentId: 'pay_provider_1',
        amountInPaise: 117800,
        currency: 'INR',
        invoiceId: String(invoice._id),
      }),
    });
    assert.equal(captureResponse.status, 200);
    const captureBody = await captureResponse.json();
    assert.equal(captureBody.data.status, 'SUCCEEDED');

    const refundResponse = await appFetch(`http://127.0.0.1:${port}/v1/billing/payments/refund`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
        'idempotency-key': 'billing-refund-test-1',
      },
      body: JSON.stringify({
        paymentId: 'pay_provider_1',
        amountInPaise: 117800,
      }),
    });
    assert.equal(refundResponse.status, 200);
    const refundBody = await refundResponse.json();
    assert.equal(refundBody.data.status, 'REFUNDED');

    const pdfResponse = await appFetch(`http://127.0.0.1:${port}/v1/billing/invoices/${invoice._id}/pdf`, {
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    assert.equal(pdfResponse.status, 200);
    assert.equal(pdfResponse.headers.get('content-type'), 'application/pdf');

    const { billingRepository } = await import('../src/modules/billing/billing.repository');
    const storedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
    assert.equal(storedInvoice?.pdfS3Key, `invoice-pdfs/${storedInvoice?.publicId}.pdf`);
    assert.equal(storedInvoice?.pdfUploadedAt instanceof Date, true);

    const balance = await billingService.getCreditBalance(String(organization._id));
    assert.equal(balance, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('capture and refund failure endpoints surface provider errors', async () => {
  const app = createApp();
  const server = app.listen(0);
  const originalFetch = globalThis.fetch;
  const providerPayments = new Map<string, { orderId: string; amount: number; currency: string; status: 'authorized' | 'captured' | 'refunded' }>();

  try {
    const { port } = server.address() as AddressInfo;
    const providerStub = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.endsWith('/orders') && method === 'POST') {
        return new Response(JSON.stringify({ id: 'order_failure_1', status: 'created', receipt: 'INV-FAILURE' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/payments/') && method === 'GET') {
        const paymentId = url.split('/payments/')[1].split('?')[0];
        const payment = providerPayments.get(paymentId);
        return new Response(
          JSON.stringify({
            id: paymentId,
            order_id: payment?.orderId ?? 'order_failure_1',
            amount: payment?.amount ?? 1000,
            currency: payment?.currency ?? 'INR',
            status: payment?.status ?? 'authorized',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      if (url.includes('/capture') || url.includes('/refund')) {
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
        const paymentId = body.paymentId ?? 'unknown';
        const current = providerPayments.get(paymentId) ?? {
          orderId: 'order_failure_1',
          amount: body.amount ?? 1000,
          currency: body.currency ?? 'INR',
          status: 'authorized' as const,
        };

        if (url.includes('/capture') && paymentId === 'pay_failure_refund_1') {
          providerPayments.set(paymentId, {
            ...current,
            status: 'captured',
          });
          return new Response(
            JSON.stringify({
              id: paymentId,
              order_id: current.orderId,
              amount: current.amount,
              currency: current.currency,
              status: 'captured',
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          );
        }

        if (url.includes('/capture')) {
          providerPayments.set(paymentId, current);
        }

        if (url.includes('/refund')) {
          providerPayments.set(paymentId, {
            ...current,
            status: 'refunded',
          });
        }

        return new Response(JSON.stringify({ error: 'provider_down' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };

    globalThis.fetch = providerStub;

    const adminOperator = await operatorService.create({
      email: 'failure-admin@example.com',
      fullName: 'Failure Admin',
      password: 'supersecurepass',
      role: 'ADMIN',
    });

    const failureOrganization = await organizationService.create({
      name: 'Failure Billing Co',
      slug: 'failure-billing-co',
    });

    const failureSubscription = await subscriptionService.create({
      organizationId: String(failureOrganization._id),
      planCode: 'starter',
    });

    const failureInvoice = await billingService.createInvoiceForSubscription(String(failureSubscription._id), [
      {
        code: 'starter',
        description: 'Starter subscription',
        quantity: 1,
        unitAmount: 1000,
      },
    ]);

    const loginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminOperator.email,
        password: 'supersecurepass',
      }),
    });
    const loginBody = await loginResponse.json();

    const orderResponse = await originalFetch(`http://127.0.0.1:${port}/v1/billing/invoices/razorpay-order`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
        'idempotency-key': 'billing-failure-order-test-1',
      },
      body: JSON.stringify({ invoiceId: String(failureInvoice._id) }),
    });
    assert.equal(orderResponse.status, 200);
    const orderBody = await orderResponse.json();
    providerPayments.set('pay_failure_capture_1', {
      orderId: String(orderBody.data.providerOrderId),
      amount: 1000,
      currency: 'INR',
      status: 'authorized',
    });
    providerPayments.set('pay_failure_refund_1', {
      orderId: String(orderBody.data.providerOrderId),
      amount: 1000,
      currency: 'INR',
      status: 'authorized',
    });

    const captureResponse = await originalFetch(`http://127.0.0.1:${port}/v1/billing/payments/capture`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
        'idempotency-key': 'billing-capture-failure-test-1',
      },
      body: JSON.stringify({
        paymentId: 'pay_failure_capture_1',
        amountInPaise: 1000,
        currency: 'INR',
        invoiceId: String(failureInvoice._id),
      }),
    });
    assert.equal(captureResponse.status, 502);
    const captureBody = await captureResponse.json();
    assert.equal(captureBody.error.code, 'PAYMENT_FAILED');

    const refundResponse = await originalFetch(`http://127.0.0.1:${port}/v1/billing/payments/refund`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
        'idempotency-key': 'billing-refund-failure-test-1',
      },
      body: JSON.stringify({
        paymentId: 'pay_failure_refund_1',
        amountInPaise: 1000,
        invoiceId: String(failureInvoice._id),
      }),
    });
    assert.equal(refundResponse.status, 502);
    const refundBody = await refundResponse.json();
    assert.equal(refundBody.error.code, 'PAYMENT_FAILED');
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('operator suspension blocks future logins', async () => {
  const organization = await organizationService.create({
    name: 'Suspension Co',
    slug: 'suspension-co',
  });

  const adminOperator = await operatorService.create({
    email: 'suspension-admin@example.com',
    fullName: 'Suspension Admin',
    password: 'supersecurepass',
    role: 'ADMIN',
  });

  const userOperator = await operatorService.create({
    email: 'user@example.com',
    fullName: 'Suspended User',
    password: 'supersecurepass',
    role: 'USER',
    organizationId: String(organization._id),
  });

  const app = createApp();
  const server = app.listen(0);
  const originalFetch = globalThis.fetch;

  try {
    const { port } = server.address() as AddressInfo;
    const loginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminOperator.email,
        password: 'supersecurepass',
      }),
    });
    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();

    const suspendResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/operators/${userOperator._id}/suspend`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${loginBody.token}`,
        'content-type': 'application/json',
      },
    });
    assert.equal(suspendResponse.status, 200);

    const userLoginResponse = await originalFetch(`http://127.0.0.1:${port}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userOperator.email,
        password: 'supersecurepass',
      }),
    });
    assert.equal(userLoginResponse.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('archived organizations cannot create new subscriptions', async () => {
  const organization = await organizationService.create({
    name: 'Archive Block Co',
    slug: 'archive-block-co',
  });

  await archiveService.update(String(organization._id), {
    organizationId: String(organization._id),
    archiveStatus: 'ARCHIVED',
  });

  await assert.rejects(
    () =>
      subscriptionService.create({
        organizationId: String(organization._id),
        planCode: 'starter',
      }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'SUBSCRIPTION_READ_ONLY');
      return true;
    },
  );
});
