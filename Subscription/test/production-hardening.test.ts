import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

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

type ProviderState = {
  nextOrderCounter: number;
  failCapture: boolean;
  failRefund: boolean;
  captureResponseLost: boolean;
  refundResponseLost: boolean;
  captureOrderByPaymentId: Map<string, string>;
  paymentByPaymentId: Map<string, { orderId: string; amount: number; currency: string; status: 'authorized' | 'captured' | 'refunded' | 'failed'; refundId?: string }>;
  captureCallCountByPaymentId: Map<string, number>;
  refundCallCountByPaymentId: Map<string, number>;
};

let mongoReplSet: MongoMemoryReplSet;
let originalFetch: typeof globalThis.fetch;
let providerState: ProviderState;

let createApp: typeof import('../src/app').createApp;
let connectMongo: typeof import('../src/config/mongo').connectMongo;
let organizationService: typeof import('../src/modules/organizations/organization.service').organizationService;
let planService: typeof import('../src/modules/plans/plan.service').planService;
let planRepository: typeof import('../src/modules/plans/plan.repository').planRepository;
let subscriptionService: typeof import('../src/modules/subscriptions/subscription.service').subscriptionService;
let subscriptionRepository: typeof import('../src/modules/subscriptions/subscription.repository').subscriptionRepository;
let billingService: typeof import('../src/modules/billing/billing.service').billingService;
let billingRepository: typeof import('../src/modules/billing/billing.repository').billingRepository;
let creditLedgerService: typeof import('../src/modules/billing/credit-ledger.service').creditLedgerService;
let paymentSagaService: typeof import('../src/modules/billing/payment-saga.service').paymentSagaService;
let paymentSagaRepository: typeof import('../src/modules/billing/payment-saga.repository').paymentSagaRepository;
let webhookService: typeof import('../src/modules/webhooks/webhook.service').webhookService;
let webhookRepository: typeof import('../src/modules/webhooks/webhook.repository').webhookRepository;
let hrmReconciliationService: typeof import('../src/modules/usage/hrm-reconciliation.service').hrmReconciliationService;
let processInboxRecord: typeof import('../src/modules/usage/inbox.processor').processInboxRecord;
let processReconciliation: typeof import('../src/modules/usage/reconciliation.processor').processReconciliation;
let processRenewals: typeof import('../src/jobs/processors/renewals.processor').processRenewals;
let recoverPaymentSagas: typeof import('../src/modules/billing/payment-saga.processor').recoverPaymentSagas;
let processPaymentSagaRecord: typeof import('../src/modules/billing/payment-saga.processor').processPaymentSagaRecord;
let signRazorpayWebhookPayload: typeof import('../src/integrations/razorpay/webhook').signRazorpayWebhookPayload;
let withTransaction: typeof import('../src/common/db/transaction').withTransaction;

let InvoiceModel: typeof import('../src/modules/billing/invoice.model').InvoiceModel;
let PaymentModel: typeof import('../src/modules/billing/payment.model').PaymentModel;
let SubscriptionModel: typeof import('../src/modules/subscriptions/subscription.model').SubscriptionModel;
let WebhookEventModel: typeof import('../src/modules/webhooks/webhook-event.model').WebhookEventModel;
let EventInboxModel: typeof import('../src/modules/events/event-inbox.model').EventInboxModel;
let HrmEmployeeModel: typeof import('../src/modules/usage/hrm-employee.model').HrmEmployeeModel;
let UsageModel: typeof import('../src/modules/usage/usage.model').UsageModel;

function resetProviderState() {
  providerState = {
    nextOrderCounter: 0,
    failCapture: false,
    failRefund: false,
    captureResponseLost: false,
    refundResponseLost: false,
    captureOrderByPaymentId: new Map<string, string>(),
    paymentByPaymentId: new Map<string, { orderId: string; amount: number; currency: string; status: 'authorized' | 'captured' | 'refunded' | 'failed'; refundId?: string }>(),
    captureCallCountByPaymentId: new Map<string, number>(),
    refundCallCountByPaymentId: new Map<string, number>(),
  };
}

function setProviderPayment(paymentId: string, payment: { orderId?: string; amount?: number; currency?: string; status?: 'authorized' | 'captured' | 'refunded' | 'failed'; refundId?: string }) {
  providerState.paymentByPaymentId.set(paymentId, {
    orderId: payment.orderId ?? `order_${paymentId}`,
    amount: payment.amount ?? 0,
    currency: payment.currency ?? 'INR',
    status: payment.status ?? 'authorized',
    refundId: payment.refundId,
  });
}

function makeId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function extractPathParts(url: string) {
  const match = url.match(/\/payments\/([^/]+)(?:\/(capture|refund))?$/);
  if (!match) {
    return null;
  }

  return {
    paymentId: match[1],
    action: match[2] ?? 'fetch',
  } as const;
}

async function providerFetchStub(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method ?? 'GET';

  if (url.includes('api.razorpay.com/v1/orders') && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const orderId = `order_${++providerState.nextOrderCounter}`;
    return jsonResponse({
      id: orderId,
      amount: body.amount,
      currency: body.currency,
      receipt: body.receipt,
      status: 'created',
    });
  }

  const parts = extractPathParts(url);
  if (parts?.action === 'fetch' && method === 'GET') {
    const payment = providerState.paymentByPaymentId.get(parts.paymentId);
    const orderId = payment?.orderId ?? providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`;
    return jsonResponse({
      id: parts.paymentId,
      order_id: orderId,
      amount: payment?.amount ?? 0,
      currency: payment?.currency ?? 'INR',
      status: payment?.status ?? 'authorized',
      refund_id: payment?.refundId ?? null,
    });
  }

  if (parts?.action === 'capture' && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const nextCount = Number(providerState.captureCallCountByPaymentId.get(parts.paymentId) ?? 0) + 1;
    providerState.captureCallCountByPaymentId.set(parts.paymentId, nextCount);

    if (providerState.failCapture) {
      return jsonResponse({ error: 'capture_failed' }, 503);
    }

    const orderId = providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`;
    const record = {
      orderId,
      amount: body.amount ?? providerState.paymentByPaymentId.get(parts.paymentId)?.amount ?? 0,
      currency: body.currency ?? providerState.paymentByPaymentId.get(parts.paymentId)?.currency ?? 'INR',
      status: 'captured' as const,
    };

    providerState.paymentByPaymentId.set(parts.paymentId, record);

    if (providerState.captureResponseLost) {
      return jsonResponse({ error: 'capture_timeout_after_success' }, 503);
    }

    return jsonResponse({
      id: parts.paymentId,
      order_id: orderId,
      amount: record.amount,
      currency: record.currency,
      status: 'captured',
    });
  }

  if (parts?.action === 'refund' && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const nextCount = Number(providerState.refundCallCountByPaymentId.get(parts.paymentId) ?? 0) + 1;
    providerState.refundCallCountByPaymentId.set(parts.paymentId, nextCount);

    if (providerState.failRefund) {
      return jsonResponse({ error: 'refund_failed' }, 503);
    }

    const existing = providerState.paymentByPaymentId.get(parts.paymentId);
    providerState.paymentByPaymentId.set(parts.paymentId, {
      orderId: existing?.orderId ?? providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`,
      amount: body.amount ?? existing?.amount ?? 0,
      currency: existing?.currency ?? 'INR',
      status: 'refunded',
      refundId: `rf_${parts.paymentId}`,
    });

    if (providerState.refundResponseLost) {
      return jsonResponse({ error: 'refund_timeout_after_success' }, 503);
    }

    return jsonResponse({
      id: `rf_${parts.paymentId}`,
      status: 'processed',
      amount: body.amount,
    });
  }

  return originalFetch(input, init);
}

async function createBillingContext(planCode = 'starter', lineAmount = 1000) {
  const organization = await organizationService.create({
    name: `${planCode} ${makeId('org')}`,
    slug: `${planCode}-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode,
  });

  const invoice = await billingService.createInvoiceForSubscription(String(subscription._id), [
    {
      code: planCode,
      description: `${planCode} subscription`,
      quantity: 1,
      unitAmount: lineAmount,
    },
  ]);

  return { organization, subscription, invoice };
}

async function createAnnualPlan() {
  const starterPlan = await planRepository.findByCode('starter');
  assert.ok(starterPlan);

  return planRepository.upsertFromDefinition({
    code: `annual-${makeId('plan')}`.toLowerCase(),
    name: 'Annual Pro',
    version: 1,
    hidden: false,
    purchasable: true,
    systemManaged: false,
    employeeLimit: 500,
    billingInterval: 'year',
    priceMonthly: 5000,
    priceYearly: 60000,
    currency: 'INR',
    features: starterPlan.features,
  });
}

before(async () => {
  mongoReplSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  process.env.MONGODB_URI = mongoReplSet.getUri();

  const [
    appModule,
    mongoModule,
    organizationModule,
    planModule,
    planRepositoryModule,
    subscriptionModule,
    subscriptionRepositoryModule,
    billingModule,
    billingRepositoryModule,
    creditLedgerServiceModule,
    paymentSagaServiceModule,
    paymentSagaRepositoryModule,
    webhookServiceModule,
    webhookRepositoryModule,
    hrmModule,
    inboxModule,
    reconciliationModule,
    renewalsModule,
    sagaProcessorModule,
    transactionModule,
    webhookWebhookModule,
    invoiceModelModule,
    paymentModelModule,
    subscriptionModelModule,
    webhookEventModelModule,
    eventInboxModelModule,
    hrmEmployeeModelModule,
    usageModelModule,
  ] = await Promise.all([
    import('../src/app'),
    import('../src/config/mongo'),
    import('../src/modules/organizations/organization.service'),
    import('../src/modules/plans/plan.service'),
    import('../src/modules/plans/plan.repository'),
    import('../src/modules/subscriptions/subscription.service'),
    import('../src/modules/subscriptions/subscription.repository'),
    import('../src/modules/billing/billing.service'),
    import('../src/modules/billing/billing.repository'),
    import('../src/modules/billing/credit-ledger.service'),
    import('../src/modules/billing/payment-saga.service'),
    import('../src/modules/billing/payment-saga.repository'),
    import('../src/modules/webhooks/webhook.service'),
    import('../src/modules/webhooks/webhook.repository'),
    import('../src/modules/usage/hrm-reconciliation.service'),
    import('../src/modules/usage/inbox.processor'),
    import('../src/modules/usage/reconciliation.processor'),
    import('../src/jobs/processors/renewals.processor'),
    import('../src/modules/billing/payment-saga.processor'),
    import('../src/common/db/transaction'),
    import('../src/integrations/razorpay/webhook'),
    import('../src/modules/billing/invoice.model'),
    import('../src/modules/billing/payment.model'),
    import('../src/modules/subscriptions/subscription.model'),
    import('../src/modules/webhooks/webhook-event.model'),
    import('../src/modules/events/event-inbox.model'),
    import('../src/modules/usage/hrm-employee.model'),
    import('../src/modules/usage/usage.model'),
  ]);

  createApp = appModule.createApp;
  connectMongo = mongoModule.connectMongo;
  organizationService = organizationModule.organizationService;
  planService = planModule.planService;
  planRepository = planRepositoryModule.planRepository;
  subscriptionService = subscriptionModule.subscriptionService;
  subscriptionRepository = subscriptionRepositoryModule.subscriptionRepository;
  billingService = billingModule.billingService;
  billingRepository = billingRepositoryModule.billingRepository;
  creditLedgerService = creditLedgerServiceModule.creditLedgerService;
  paymentSagaService = paymentSagaServiceModule.paymentSagaService;
  paymentSagaRepository = paymentSagaRepositoryModule.paymentSagaRepository;
  webhookService = webhookServiceModule.webhookService;
  webhookRepository = webhookRepositoryModule.webhookRepository;
  hrmReconciliationService = hrmModule.hrmReconciliationService;
  processInboxRecord = inboxModule.processInboxRecord;
  processReconciliation = reconciliationModule.processReconciliation;
  processRenewals = renewalsModule.processRenewals;
  recoverPaymentSagas = sagaProcessorModule.recoverPaymentSagas;
  processPaymentSagaRecord = sagaProcessorModule.processPaymentSagaRecord;
  withTransaction = transactionModule.withTransaction;
  signRazorpayWebhookPayload = webhookWebhookModule.signRazorpayWebhookPayload;
  InvoiceModel = invoiceModelModule.InvoiceModel;
  PaymentModel = paymentModelModule.PaymentModel;
  SubscriptionModel = subscriptionModelModule.SubscriptionModel;
  WebhookEventModel = webhookEventModelModule.WebhookEventModel;
  EventInboxModel = eventInboxModelModule.EventInboxModel;
  HrmEmployeeModel = hrmEmployeeModelModule.HrmEmployeeModel;
  UsageModel = usageModelModule.UsageModel;

  await connectMongo();
  await planService.seedDefaults();

  originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = providerFetchStub;
});

beforeEach(async () => {
  resetProviderState();
  await mongoose.connection.dropDatabase();
  await planService.seedDefaults();
});

after(async () => {
  globalThis.fetch = originalFetch;
  await mongoose.connection.close();
  if (mongoReplSet) {
    await mongoReplSet.stop();
  }
});

test('metrics endpoint exposes the hardening counters', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.equal(response.status, 200);

    const body = await response.text();
    assert.match(body, /billing_payment_success_total/);
    assert.match(body, /webhook_duplicate_total/);
    assert.match(body, /billing_queue_backlog/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('provider failures bubble as payment failed errors', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  const orderedInvoice = await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  assert.ok(orderedInvoice.providerOrderId);
  setProviderPayment('pay_fail_1', {
    orderId: String(orderedInvoice.providerOrderId),
    amount: orderedInvoice.total * 100,
    currency: 'INR',
    status: 'authorized',
  });
  providerState.failCapture = true;

  await assert.rejects(
    () =>
      billingService.capturePayment({
        paymentId: 'pay_fail_1',
        amountInPaise: orderedInvoice.total * 100,
        currency: 'INR',
        invoiceId: String(invoice._id),
      }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'PAYMENT_FAILED');
      return true;
    },
  );
});

test('transaction rollback removes writes after a thrown error', async () => {
  const organization = await organizationService.create({
    name: `Rollback ${makeId('org')}`,
    slug: `rollback-${makeId('slug')}`.toLowerCase(),
  });
  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });
  const invoiceKey = `rollback:${makeId('key')}`;

  await assert.rejects(
    async () =>
      withTransaction(async (session) => {
        await billingRepository.createInvoice(
          {
            publicId: `inv_${makeId('inv')}`,
            invoiceNumber: `INV-${makeId('num')}`,
            invoiceKey,
            organization: organization._id,
            subscription: subscription._id,
            status: 'DRAFT',
            currency: 'INR',
            subtotal: 1000,
            tax: 180,
            total: 1180,
            creditAppliedAmount: 0,
            amountDue: 1180,
            lineItems: [],
            metadata: {},
          },
          { session },
        );

        throw new Error('rollback');
      }),
  );

  const invoice = await billingRepository.findInvoiceByInvoiceKey(invoiceKey);
  assert.equal(invoice, null);
});

test('monthly renewal locking is safe under concurrent workers', async () => {
  const organization = await organizationService.create({
    name: `Renewal ${makeId('org')}`,
    slug: `renewal-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  const periodStart = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(Date.now() - 1 * 60 * 1000);
  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    autoRenew: true,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    renewalLockedUntil: null,
  });

  const [first, second] = await Promise.all([processRenewals(), processRenewals()]);
  assert.ok(first.renewed + second.renewed <= 1);

  const invoices = await InvoiceModel.find({ subscription: subscription._id }).lean();
  assert.equal(invoices.length, 1);
  const updated = await subscriptionRepository.findById(String(subscription._id));
  assert.equal(updated?.renewalLockedUntil, null);
  assert.ok(new Date(String(updated?.currentPeriodEnd)).getTime() > Date.now());
});

test('annual renewal uses yearly pricing', async () => {
  const annualPlan = await createAnnualPlan();
  const organization = await organizationService.create({
    name: `Annual ${makeId('org')}`,
    slug: `annual-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: String(annualPlan.code),
  });

  const periodStart = new Date(Date.now() - 380 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(Date.now() - 1 * 60 * 1000);
  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    autoRenew: true,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    renewalLockedUntil: null,
  });

  const summary = await processRenewals();
  assert.equal(summary.renewed, 1);

  const invoice = await InvoiceModel.findOne({ subscription: subscription._id }).lean();
  assert.ok(invoice);
  assert.equal(invoice?.lineItems?.[0]?.unitAmount, 60000);
  assert.equal(invoice?.status, 'OPEN');
});

test('upgrade proration creates a charge invoice', async () => {
  const organization = await organizationService.create({
    name: `Upgrade ${makeId('org')}`,
    slug: `upgrade-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  const periodStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  const upgraded = await subscriptionService.upgrade(String(subscription._id), 'professional');
  assert.equal(upgraded?.planCode, 'professional');

  const invoiceKey = `proration-upgrade:${String(subscription._id)}:${periodEnd.toISOString()}:professional`;
  const prorationInvoice = await billingRepository.findInvoiceByInvoiceKey(invoiceKey);
  assert.ok(prorationInvoice);
  assert.equal(prorationInvoice?.status, 'OPEN');
  assert.ok(Number(prorationInvoice?.amountDue ?? 0) > 0);
});

test('downgrade proration issues credits instead of refunds', async () => {
  const organization = await organizationService.create({
    name: `Downgrade ${makeId('org')}`,
    slug: `downgrade-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'professional',
  });

  const periodStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  const downgraded = await subscriptionService.downgrade(String(subscription._id), 'starter');
  assert.equal(downgraded?.planCode, 'starter');

  const balance = await creditLedgerService.getMaterializedBalance(String(organization._id));
  assert.ok(balance > 0);

  const creditEntries = await billingRepository.findCreditsByOrganization(String(organization._id));
  assert.equal(creditEntries[0]?.sourceType, 'PRORATION');
});

test('credits are automatically applied to new invoices', async () => {
  const organization = await organizationService.create({
    name: `Credit ${makeId('org')}`,
    slug: `credit-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  await billingService.applyCredit({
    organizationId: String(organization._id),
    subscriptionId: String(subscription._id),
    amount: 1180,
    sourceType: 'MANUAL_ADJUSTMENT',
    entryKey: `manual-credit:${subscription._id}`,
    note: 'seed credit',
  });

  const invoice = await billingService.createInvoiceForSubscription(String(subscription._id), [
    {
      code: 'starter',
      description: 'Starter invoice',
      quantity: 1,
      unitAmount: 1000,
    },
  ]);

  assert.equal(invoice.amountDue, 0);
  assert.equal(invoice.creditAppliedAmount, 1180);

  const finalized = await billingService.finalizeInvoice(String(invoice._id));
  assert.equal(finalized?.status, 'PAID');

  const balance = await billingService.getCreditBalance(String(organization._id));
  assert.equal(balance, 0);
});

test('payment saga recovery resumes a captured saga after a crash', async () => {
  const { invoice } = await createBillingContext('starter', 1000);

  const orderedInvoice = await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  assert.ok(orderedInvoice.providerOrderId);

  const saga = await paymentSagaService.findByInvoice(String(invoice._id));
  assert.ok(saga);

  providerState.captureOrderByPaymentId.set('pay_recover_1', String(orderedInvoice.providerOrderId));
  setProviderPayment('pay_recover_1', {
    orderId: String(orderedInvoice.providerOrderId),
    amount: orderedInvoice.total * 100,
    currency: 'INR',
    status: 'captured',
  });
  await paymentSagaService.attachProviderPayment(String(saga?._id), {
    providerPaymentId: 'pay_recover_1',
    providerPayload: {
      id: 'pay_recover_1',
      order_id: orderedInvoice.providerOrderId,
    },
  });
  await paymentSagaService.markPaymentCaptured(String(saga?._id), {
    providerPaymentId: 'pay_recover_1',
    providerPayload: {
      id: 'pay_recover_1',
      order_id: orderedInvoice.providerOrderId,
    },
  });
  await paymentSagaRepository.updateById(String(saga?._id), {
    lockedUntil: new Date(Date.now() - 60_000),
  });

  const summary = await recoverPaymentSagas();
  assert.ok(summary.recovered >= 1);

  const payment = await billingRepository.findPaymentByProviderId('pay_recover_1');
  assert.equal(payment?.status, 'SUCCEEDED');

  const updatedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(updatedInvoice?.status, 'PAID');

  const updatedSaga = await paymentSagaService.findByInvoice(String(invoice._id));
  assert.equal(updatedSaga?.state, 'COMPLETED');
});

test('payment capture compensation refunds the provider when commit fails', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  const orderedInvoice = await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  assert.ok(orderedInvoice.providerOrderId);

  await billingRepository.updateInvoiceById(String(invoice._id), {
    status: 'REFUNDED',
    refundedAt: new Date(),
    refundAmount: orderedInvoice.total,
  });

  providerState.captureOrderByPaymentId.set('pay_comp_1', String(orderedInvoice.providerOrderId));

  const result = await billingService.capturePayment(
    {
      paymentId: 'pay_comp_1',
      amountInPaise: orderedInvoice.total * 100,
      currency: 'INR',
      invoiceId: String(invoice._id),
    },
    { idempotencyKey: `comp-${makeId('key')}` },
  );

  assert.equal(result.status, 'REFUNDED');

  const payment = await billingRepository.findPaymentByProviderId('pay_comp_1');
  assert.equal(payment?.status, 'REFUNDED');

  const updatedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(updatedInvoice?.status, 'REFUNDED');

  const saga = await paymentSagaService.findByInvoice(String(invoice._id));
  assert.equal(saga?.state, 'COMPENSATED');
});

test('duplicate webhook delivery is deduped by provider event id', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  await billingRepository.updateInvoiceById(String(invoice._id), {
    providerInvoiceId: 'inv_web_1',
  });

  const paymentEntity = {
    id: 'pay_web_1',
    order_id: 'order_web_1',
    amount: 118000,
    currency: 'INR',
    status: 'captured',
    notes: {
      invoice_id: 'inv_web_1',
    },
  };

  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: paymentEntity,
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = signRazorpayWebhookPayload(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET as string);

  const first = await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_1',
    eventType: 'payment.captured',
    payload,
    rawBody,
    signature,
  });

  const second = await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_1',
    eventType: 'payment.captured',
    payload,
    rawBody,
    signature,
  });

  assert.equal(first.deduped, false);
  assert.equal(second.deduped, true);

  const payments = await PaymentModel.find({ providerPaymentId: 'pay_web_1' }).lean();
  assert.equal(payments.length, 1);
  const processedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(processedInvoice?.status, 'PAID');
});

test('concurrent webhook delivery is race-safe', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  await billingRepository.updateInvoiceById(String(invoice._id), {
    providerInvoiceId: 'inv_web_2',
  });

  const paymentEntity = {
    id: 'pay_web_2',
    order_id: 'order_web_2',
    amount: 118000,
    currency: 'INR',
    status: 'captured',
    notes: {
      invoice_id: 'inv_web_2',
    },
  };

  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: paymentEntity,
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = signRazorpayWebhookPayload(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET as string);

  const [first, second] = await Promise.all([
    webhookService.processRazorpayWebhook({
      eventId: 'evt_web_2',
      eventType: 'payment.captured',
      payload,
      rawBody,
      signature,
    }),
    webhookService.processRazorpayWebhook({
      eventId: 'evt_web_2',
      eventType: 'payment.captured',
      payload,
      rawBody,
      signature,
    }),
  ]);

  assert.ok(first.deduped || second.deduped);
  const events = await WebhookEventModel.find({ providerEventId: 'evt_web_2' }).lean();
  assert.equal(events.length, 1);
  const payments = await PaymentModel.find({ providerPaymentId: 'pay_web_2' }).lean();
  assert.equal(payments.length, 1);
});

test('out-of-order webhook events do not regress a captured payment', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  await billingRepository.updateInvoiceById(String(invoice._id), {
    providerInvoiceId: 'inv_web_3',
  });

  const capturedPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_web_3',
          order_id: 'order_web_3',
          amount: 118000,
          currency: 'INR',
          status: 'captured',
          notes: { invoice_id: 'inv_web_3' },
        },
      },
    },
  };
  const authorizedPayload = {
    event: 'payment.authorized',
    payload: {
      payment: {
        entity: {
          id: 'pay_web_3',
          order_id: 'order_web_3',
          amount: 118000,
          currency: 'INR',
          status: 'authorized',
          notes: { invoice_id: 'inv_web_3' },
        },
      },
    },
  };

  const capturedRaw = Buffer.from(JSON.stringify(capturedPayload));
  const capturedSignature = signRazorpayWebhookPayload(capturedRaw, process.env.RAZORPAY_WEBHOOK_SECRET as string);
  await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_3_captured',
    eventType: 'payment.captured',
    payload: capturedPayload,
    rawBody: capturedRaw,
    signature: capturedSignature,
  });

  const authorizedRaw = Buffer.from(JSON.stringify(authorizedPayload));
  const authorizedSignature = signRazorpayWebhookPayload(authorizedRaw, process.env.RAZORPAY_WEBHOOK_SECRET as string);
  await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_3_authorized',
    eventType: 'payment.authorized',
    payload: authorizedPayload,
    rawBody: authorizedRaw,
    signature: authorizedSignature,
  });

  const updatedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(updatedInvoice?.status, 'PAID');

  const payment = await billingRepository.findPaymentByProviderId('pay_web_3');
  assert.equal(payment?.status, 'SUCCEEDED');
});

test('usage reconciliation processor corrects drift and honors event ordering', async () => {
  const organization = await organizationService.create({
    name: `Usage ${makeId('org')}`,
    slug: `usage-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    employeeLimit: 5,
  });

  await HrmEmployeeModel.create([
    {
      organizationId: String(organization._id),
      entityId: 'emp-1',
      state: 'ACTIVE',
      eventVersion: 2,
      lastEventId: 'evt-2',
      lastEventType: 'EmployeeDeleted',
      metadata: {},
    },
    {
      organizationId: String(organization._id),
      entityId: 'emp-2',
      state: 'ARCHIVED',
      eventVersion: 1,
      lastEventId: 'evt-1',
      lastEventType: 'EmployeeArchived',
      metadata: {},
    },
  ]);

  await UsageModel.create({
    organization: organization._id,
    activeEmployees: 0,
    archivedEmployees: 0,
    overageEmployees: 0,
    sourceVersion: 0,
    metadata: {},
  });

  const reports = await processReconciliation();
  assert.equal(reports.processed, 1);
  assert.equal(reports.reports[0].corrected, true);

  const usage = await UsageModel.findOne({ organization: organization._id }).lean();
  assert.equal(usage?.activeEmployees, 1);
  assert.equal(usage?.archivedEmployees, 1);
  assert.equal(usage?.overageEmployees, 0);

  const accepted = await hrmReconciliationService.applyEvent({
    eventId: 'evt-new-version',
    organizationId: String(organization._id),
    entityId: 'emp-1',
    eventVersion: 1,
    eventType: 'EmployeeCreated',
  });
  assert.equal(accepted.ignored, true);
});

test('inbox processor is duplicate-safe for the same event', async () => {
  const organization = await organizationService.create({
    name: `Inbox ${makeId('org')}`,
    slug: `inbox-${makeId('slug')}`.toLowerCase(),
  });

  const inbox = await hrmReconciliationService.ingestEvent({
    eventId: 'hrm-event-1',
    organizationId: String(organization._id),
    entityId: 'emp-1',
    eventVersion: 1,
    eventType: 'EmployeeCreated',
  });

  const first = await processInboxRecord(inbox as never);
  const second = await processInboxRecord(inbox as never);
  assert.ok(first);
  assert.equal(second, null);

  const inboxRecords = await EventInboxModel.find({ eventId: 'hrm-event-1' }).lean();
  assert.equal(inboxRecords.length, 1);
  assert.equal(inboxRecords[0]?.status, 'PROCESSED');
});

test('employee lifecycle inbox events update usage projection and reject stale replay', async () => {
  const organization = await organizationService.create({
    name: `Lifecycle ${makeId('org')}`,
    slug: `lifecycle-${makeId('slug')}`.toLowerCase(),
  });
  const organizationId = String(organization._id);
  const entityId = `emp-${makeId('entity')}`;

  const events = [
    { eventType: 'EmployeeCreated' as const, eventVersion: 1, activeEmployees: 1, archivedEmployees: 0 },
    { eventType: 'EmployeeArchived' as const, eventVersion: 2, activeEmployees: 0, archivedEmployees: 1 },
    { eventType: 'EmployeeRestored' as const, eventVersion: 3, activeEmployees: 1, archivedEmployees: 0 },
    { eventType: 'EmployeeDeleted' as const, eventVersion: 4, activeEmployees: 0, archivedEmployees: 0 },
  ];

  for (const event of events) {
    const inbox = await hrmReconciliationService.ingestEvent({
      eventId: `hrm-${event.eventType}-${event.eventVersion}-${entityId}`,
      organizationId,
      entityId,
      eventVersion: event.eventVersion,
      eventType: event.eventType,
    });

    await processInboxRecord(inbox as never);

    const usage = await UsageModel.findOne({ organization: organization._id }).lean();
    assert.equal(usage?.activeEmployees, event.activeEmployees);
    assert.equal(usage?.archivedEmployees, event.archivedEmployees);
  }

  const staleInbox = await hrmReconciliationService.ingestEvent({
    eventId: `hrm-stale-${entityId}`,
    organizationId,
    entityId,
    eventVersion: 2,
    eventType: 'EmployeeArchived',
  });

  await processInboxRecord(staleInbox as never);

  const usage = await UsageModel.findOne({ organization: organization._id }).lean();
  assert.equal(usage?.activeEmployees, 0);
  assert.equal(usage?.archivedEmployees, 0);
});

test('queue claim loss returns null instead of double processing', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  const orderedInvoice = await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  const saga = await paymentSagaService.findByInvoice(String(invoice._id));
  assert.ok(saga);

  await paymentSagaService.attachProviderPayment(String(saga?._id), {
    providerPaymentId: 'pay_queue_1',
    providerPayload: {
      id: 'pay_queue_1',
      order_id: orderedInvoice.providerOrderId,
    },
  });
  await paymentSagaService.markPaymentCaptured(String(saga?._id), {
    providerPaymentId: 'pay_queue_1',
    providerPayload: {
      id: 'pay_queue_1',
      order_id: orderedInvoice.providerOrderId,
    },
  });

  const capturedSaga = await paymentSagaService.findByInvoice(String(invoice._id));
  assert.ok(capturedSaga);

  await paymentSagaRepository.updateById(String(capturedSaga?._id), {
    lockedUntil: new Date(Date.now() + 60_000),
    lockedBy: 'another-worker',
  });

  const result = await processPaymentSagaRecord({
    _id: capturedSaga?._id,
    state: 'PAYMENT_CAPTURED',
    provider: 'razorpay',
    providerPaymentId: 'pay_queue_1',
    providerOrderId: orderedInvoice.providerOrderId,
    invoice: invoice._id,
    localPayload: {
      paymentId: 'pay_queue_1',
      amountInPaise: orderedInvoice.total * 100,
    },
  });

  assert.equal(result, null);
});

test('capture payment retries safely after a lost provider response', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  const orderedInvoice = await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  assert.ok(orderedInvoice.providerOrderId);

  setProviderPayment('pay_capture_retry_1', {
    orderId: String(orderedInvoice.providerOrderId),
    amount: orderedInvoice.total * 100,
    currency: 'INR',
    status: 'authorized',
  });

  providerState.captureResponseLost = true;
  await assert.rejects(
    () =>
      billingService.capturePayment(
        {
          paymentId: 'pay_capture_retry_1',
          amountInPaise: orderedInvoice.total * 100,
          currency: 'INR',
          invoiceId: String(invoice._id),
        },
        { idempotencyKey: `capture-retry-${makeId('key')}` },
      ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'PAYMENT_FAILED');
      return true;
    },
  );

  providerState.captureResponseLost = false;
  const result = await billingService.capturePayment(
    {
      paymentId: 'pay_capture_retry_1',
      amountInPaise: orderedInvoice.total * 100,
      currency: 'INR',
      invoiceId: String(invoice._id),
    },
    { idempotencyKey: `capture-retry-${makeId('key')}` },
  );

  assert.ok(result);
  const payment = await billingRepository.findPaymentByProviderId('pay_capture_retry_1');
  assert.equal(payment?.status, 'SUCCEEDED');
  const updatedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(updatedInvoice?.status, 'PAID');
  assert.equal(providerState.captureCallCountByPaymentId.get('pay_capture_retry_1'), 1);
});

test('refund payment retries safely after a lost provider response', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  const orderedInvoice = await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  assert.ok(orderedInvoice.providerOrderId);

  setProviderPayment('pay_refund_retry_1', {
    orderId: String(orderedInvoice.providerOrderId),
    amount: orderedInvoice.total * 100,
    currency: 'INR',
    status: 'authorized',
  });

  await billingService.capturePayment({
    paymentId: 'pay_refund_retry_1',
    amountInPaise: orderedInvoice.total * 100,
    currency: 'INR',
    invoiceId: String(invoice._id),
  });

  providerState.refundResponseLost = true;
  await assert.rejects(
    () =>
      billingService.refundPayment(
        {
          paymentId: 'pay_refund_retry_1',
          amountInPaise: orderedInvoice.total * 100,
          invoiceId: String(invoice._id),
        },
        { idempotencyKey: `refund-retry-${makeId('key')}` },
      ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'PAYMENT_FAILED');
      return true;
    },
  );

  providerState.refundResponseLost = false;
  const refund = await billingService.refundPayment(
    {
      paymentId: 'pay_refund_retry_1',
      amountInPaise: orderedInvoice.total * 100,
      invoiceId: String(invoice._id),
    },
    { idempotencyKey: `refund-retry-${makeId('key')}` },
  );

  assert.ok(refund);
  const payment = await billingRepository.findPaymentByProviderId('pay_refund_retry_1');
  assert.equal(payment?.status, 'REFUNDED');
  const updatedInvoice = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(updatedInvoice?.status, 'REFUNDED');
  assert.equal(providerState.refundCallCountByPaymentId.get('pay_refund_retry_1'), 1);
});

test('authorized and failed webhooks do not regress a captured invoice', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  await billingRepository.updateInvoiceById(String(invoice._id), {
    providerInvoiceId: 'inv_web_state_1',
  });

  const authorizedPayload = {
    event: 'payment.authorized',
    payload: {
      payment: {
        entity: {
          id: 'pay_web_state_1',
          order_id: 'order_web_state_1',
          amount: 118000,
          currency: 'INR',
          status: 'authorized',
          notes: { invoice_id: 'inv_web_state_1' },
        },
      },
    },
  };
  const capturedPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_web_state_1',
          order_id: 'order_web_state_1',
          amount: 118000,
          currency: 'INR',
          status: 'captured',
          notes: { invoice_id: 'inv_web_state_1' },
        },
      },
    },
  };
  const failedPayload = {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_web_state_1',
          order_id: 'order_web_state_1',
          amount: 118000,
          currency: 'INR',
          status: 'failed',
          notes: { invoice_id: 'inv_web_state_1' },
        },
      },
    },
  };

  const authorizedRaw = Buffer.from(JSON.stringify(authorizedPayload));
  const authorizedSignature = signRazorpayWebhookPayload(authorizedRaw, process.env.RAZORPAY_WEBHOOK_SECRET as string);
  await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_state_authorized',
    eventType: 'payment.authorized',
    payload: authorizedPayload,
    rawBody: authorizedRaw,
    signature: authorizedSignature,
  });

  const afterAuthorized = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(afterAuthorized?.status, 'DRAFT');

  const capturedRaw = Buffer.from(JSON.stringify(capturedPayload));
  const capturedSignature = signRazorpayWebhookPayload(capturedRaw, process.env.RAZORPAY_WEBHOOK_SECRET as string);
  await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_state_captured',
    eventType: 'payment.captured',
    payload: capturedPayload,
    rawBody: capturedRaw,
    signature: capturedSignature,
  });

  const afterCaptured = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(afterCaptured?.status, 'PAID');

  const failedRaw = Buffer.from(JSON.stringify(failedPayload));
  const failedSignature = signRazorpayWebhookPayload(failedRaw, process.env.RAZORPAY_WEBHOOK_SECRET as string);
  await webhookService.processRazorpayWebhook({
    eventId: 'evt_web_state_failed',
    eventType: 'payment.failed',
    payload: failedPayload,
    rawBody: failedRaw,
    signature: failedSignature,
  });

  const afterFailed = await billingRepository.findInvoiceById(String(invoice._id));
  assert.equal(afterFailed?.status, 'PAID');
  const payment = await billingRepository.findPaymentByProviderId('pay_web_state_1');
  assert.equal(payment?.status, 'SUCCEEDED');
});

test('payment saga rejects invalid transitions', async () => {
  const { invoice } = await createBillingContext('starter', 1000);
  await billingService.createRazorpayOrderForInvoice(String(invoice._id));
  const saga = await paymentSagaService.findByInvoice(String(invoice._id));
  assert.ok(saga);

  await assert.rejects(
    () => paymentSagaService.markCompleted(String(saga?._id)),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'CONFLICT');
      return true;
    },
  );
});

test('direct renewal locking prevents duplicate renewal requests', async () => {
  const organization = await organizationService.create({
    name: `Direct Renewal ${makeId('org')}`,
    slug: `direct-renewal-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    autoRenew: true,
    currentPeriodStart: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() - 60_000),
    renewalLockedUntil: null,
  });

  const [first, second] = await Promise.all([
    billingService.renewSubscription(String(subscription._id)),
    billingService.renewSubscription(String(subscription._id)),
  ]);

  assert.equal([first, second].filter(Boolean).length, 1);
  const invoices = await InvoiceModel.find({ subscription: subscription._id }).lean();
  assert.equal(invoices.length, 1);
  const updated = await subscriptionRepository.findById(String(subscription._id));
  assert.equal(updated?.renewalLockedUntil, null);
});

test('concurrent upgrade and downgrade resolve with optimistic concurrency control', async () => {
  const organization = await organizationService.create({
    name: `Plan Race ${makeId('org')}`,
    slug: `plan-race-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'professional',
  });

  await subscriptionRepository.updateById(String(subscription._id), {
    status: 'ACTIVE',
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  });

  const snapshot = await subscriptionRepository.findById(String(subscription._id));
  assert.ok(snapshot?.updatedAt);
  const expectedUpdatedAt = snapshot.updatedAt as Date;

  const results = await Promise.all([
    subscriptionRepository.updateByIdIfUpdatedAt(String(subscription._id), expectedUpdatedAt, {
      planCode: 'enterprise',
      metadata: { change: 'upgrade' },
    }),
    subscriptionRepository.updateByIdIfUpdatedAt(String(subscription._id), expectedUpdatedAt, {
      planCode: 'starter',
      metadata: { change: 'downgrade' },
    }),
  ]);

  assert.equal(results.filter((result) => result !== null).length, 1);
  assert.equal(results.filter((result) => result === null).length, 1);
  const updated = await subscriptionRepository.findById(String(subscription._id));
  assert.ok(updated);
  assert.ok(['enterprise', 'starter'].includes(String(updated?.planCode)));
});

test('concurrent credit consumers do not overspend the balance', async () => {
  const organization = await organizationService.create({
    name: `Credits ${makeId('org')}`,
    slug: `credits-${makeId('slug')}`.toLowerCase(),
  });

  const subscription = await subscriptionService.create({
    organizationId: String(organization._id),
    planCode: 'starter',
  });

  await billingService.applyCredit({
    organizationId: String(organization._id),
    subscriptionId: String(subscription._id),
    amount: 1500,
    sourceType: 'MANUAL_ADJUSTMENT',
    entryKey: `seed-credit:${subscription._id}`,
  });

  const results = await Promise.all([
    subscriptionRepository.adjustCreditBalanceById(String(subscription._id), -1000),
    subscriptionRepository.adjustCreditBalanceById(String(subscription._id), -1000),
  ]);

  assert.equal(results.filter((result) => result !== null).length, 1);
  assert.equal(results.filter((result) => result === null).length, 1);

  const balance = await creditLedgerService.getMaterializedBalance(String(organization._id));
  assert.equal(balance, 500);
});

test('connectMongo fails fast when transaction support is unavailable', async () => {
  const originalConnectDescriptor = Object.getOwnPropertyDescriptor(mongoose, 'connect');
  const originalDbDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');

  try {
    Object.defineProperty(mongoose, 'connect', {
      configurable: true,
      value: async () => mongoose,
    });

    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      value: {
        admin: () => ({
          command: async () => ({}),
        }),
      },
    });

    await assert.rejects(
      () => connectMongo(),
      (error: unknown) => {
        assert.match(String((error as { message?: string }).message ?? error), /replica set or sharded cluster/i);
        return true;
      },
    );
  } finally {
    if (originalConnectDescriptor) {
      Object.defineProperty(mongoose, 'connect', originalConnectDescriptor);
    }
    if (originalDbDescriptor) {
      Object.defineProperty(mongoose.connection, 'db', originalDbDescriptor);
    }
  }
});
