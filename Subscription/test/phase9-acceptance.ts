import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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

type ProviderPayment = {
  orderId: string;
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'refunded' | 'failed';
};

const providerState = {
  nextOrderCounter: 0,
  captureOrderByPaymentId: new Map<string, string>(),
  paymentByPaymentId: new Map<string, ProviderPayment>(),
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function extractPaymentPath(url: string) {
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
    const orderId = `order_phase9_${++providerState.nextOrderCounter}`;
    return jsonResponse({
      id: orderId,
      amount: body.amount,
      currency: body.currency,
      receipt: body.receipt,
      status: 'created',
    });
  }

  const parts = extractPaymentPath(url);
  if (parts?.action === 'fetch' && method === 'GET') {
    const payment = providerState.paymentByPaymentId.get(parts.paymentId);
    const orderId = payment?.orderId ?? providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`;
    return jsonResponse({
      id: parts.paymentId,
      order_id: orderId,
      amount: payment?.amount ?? 0,
      currency: payment?.currency ?? 'INR',
      status: payment?.status ?? 'authorized',
    });
  }

  if (parts?.action === 'capture' && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const orderId = providerState.captureOrderByPaymentId.get(parts.paymentId) ?? `order_${parts.paymentId}`;
    const payment = {
      orderId,
      amount: body.amount ?? 0,
      currency: body.currency ?? 'INR',
      status: 'captured' as const,
    };
    providerState.paymentByPaymentId.set(parts.paymentId, payment);
    return jsonResponse({
      id: parts.paymentId,
      order_id: orderId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    });
  }

  throw new Error(`Unexpected provider request: ${method} ${url}`);
}

function logStep(step: number, label: string, output: Record<string, unknown>) {
  console.log(JSON.stringify({ step, label, output }));
}

function oid(value: { _id?: unknown } | null | undefined) {
  assert.ok(value?._id);
  return String(value._id);
}

async function main() {
  const mongoReplSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });
  const originalFetch = globalThis.fetch;

  try {
    process.env.MONGODB_URI = mongoReplSet.getUri();
    globalThis.fetch = providerFetchStub as typeof fetch;

    const [
      mongoModule,
      organizationModule,
      planModule,
      subscriptionModule,
      subscriptionRepositoryModule,
      billingModule,
      billingRepositoryModule,
      webhookModule,
      hrmModule,
      inboxModule,
      usageModule,
      renewalsModule,
      webhookSigningModule,
    ] = await Promise.all([
      import('../src/config/mongo'),
      import('../src/modules/organizations/organization.service'),
      import('../src/modules/plans/plan.service'),
      import('../src/modules/subscriptions/subscription.service'),
      import('../src/modules/subscriptions/subscription.repository'),
      import('../src/modules/billing/billing.service'),
      import('../src/modules/billing/billing.repository'),
      import('../src/modules/webhooks/webhook.service'),
      import('../src/modules/usage/hrm-reconciliation.service'),
      import('../src/modules/usage/inbox.processor'),
      import('../src/modules/usage/usage.service'),
      import('../src/jobs/processors/renewals.processor'),
      import('../src/integrations/razorpay/webhook'),
    ]);

    await mongoModule.connectMongo();
    await planModule.planService.seedDefaults();

    const runId = randomUUID().slice(0, 8);
    const organization = await organizationModule.organizationService.create({
      name: `Phase 9 Acceptance ${runId}`,
      slug: `phase9-${runId}`.toLowerCase(),
    });
    const organizationId = oid(organization);
    logStep(1, 'HRM organization created', {
      organizationId,
      name: organization.name,
      slug: organization.slug,
    });

    const subscription = await subscriptionModule.subscriptionService.create({
      organizationId,
      planCode: 'starter',
    });
    logStep(2, 'Subscription attached to organization', {
      subscriptionId: oid(subscription),
      organizationId: String(subscription.organization),
      planCode: subscription.planCode,
      status: subscription.status,
    });

    const eventId = `phase9-employee-created-${runId}`;
    const inboxRecord = await hrmModule.hrmReconciliationService.ingestEvent({
      eventId,
      organizationId,
      entityId: `employee-${runId}`,
      eventVersion: 1,
      eventType: 'EmployeeCreated',
    });
    const processedInbox = await inboxModule.processInboxRecord(inboxRecord);
    logStep(3, 'Employee added to HRM', {
      eventId,
      inboxStatus: processedInbox?.status,
      organizationId,
    });

    const usage = await usageModule.usageService.getByOrganization(organizationId);
    assert.equal(usage?.activeEmployees, 1);
    logStep(4, 'Usage increases in subscription', {
      organizationId,
      activeEmployees: usage.activeEmployees,
      archivedEmployees: usage.archivedEmployees,
      overageEmployees: usage.overageEmployees,
    });

    const invoice = await billingModule.billingService.createInvoiceForSubscription(
      oid(subscription),
      [
        {
          code: 'starter',
          description: 'Phase 9 acceptance invoice',
          quantity: 1,
          unitAmount: 1000,
        },
      ],
      { idempotencyKey: `phase9-invoice-${runId}` },
    );
    const finalizedInvoice = await billingModule.billingService.finalizeInvoice(oid(invoice));
    logStep(5, 'Invoice generated', {
      invoiceId: oid(finalizedInvoice),
      invoiceNumber: finalizedInvoice.invoiceNumber,
      status: finalizedInvoice.status,
      total: finalizedInvoice.total,
      amountDue: finalizedInvoice.amountDue,
    });

    const orderedInvoice = await billingModule.billingService.createRazorpayOrderForInvoice(oid(finalizedInvoice), {
      idempotencyKey: `phase9-order-${runId}`,
    });
    assert.ok(orderedInvoice?.providerOrderId);
    const paymentId = `pay_phase9_${runId}`;
    const amountInPaise = Math.round(Number(orderedInvoice.amountDue ?? orderedInvoice.total) * 100);
    providerState.captureOrderByPaymentId.set(paymentId, String(orderedInvoice.providerOrderId));
    providerState.paymentByPaymentId.set(paymentId, {
      orderId: String(orderedInvoice.providerOrderId),
      amount: amountInPaise,
      currency: orderedInvoice.currency,
      status: 'authorized',
    });
    const capturedPayment = await billingModule.billingService.capturePayment(
      {
        paymentId,
        amountInPaise,
        currency: orderedInvoice.currency,
        invoiceId: oid(orderedInvoice),
      },
      { idempotencyKey: `phase9-capture-${runId}` },
    );
    logStep(6, 'Payment captured', {
      paymentId: oid(capturedPayment),
      providerPaymentId: capturedPayment.providerPaymentId,
      status: capturedPayment.status,
      amount: capturedPayment.amount,
    });

    const providerInvoiceId = `inv_phase9_${runId}`;
    await billingRepositoryModule.billingRepository.updateInvoiceById(oid(orderedInvoice), {
      providerInvoiceId,
    });
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderedInvoice.providerOrderId,
            amount: amountInPaise,
            currency: orderedInvoice.currency,
            status: 'captured',
            notes: { invoice_id: providerInvoiceId },
          },
        },
      },
    };
    const rawBody = Buffer.from(JSON.stringify(webhookPayload));
    const signature = webhookSigningModule.signRazorpayWebhookPayload(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET as string);
    const webhookResult = await webhookModule.webhookService.processRazorpayWebhook({
      eventId: `evt_phase9_${runId}`,
      eventType: 'payment.captured',
      payload: webhookPayload,
      rawBody,
      signature,
    });
    logStep(7, 'Webhook processed', {
      providerEventId: webhookResult.record.providerEventId,
      status: webhookResult.record.status,
      deduped: webhookResult.deduped,
    });

    const credit = await billingModule.billingService.applyCredit({
      organizationId,
      subscriptionId: oid(subscription),
      amount: 250,
      sourceType: 'GOODWILL',
      note: 'Phase 9 acceptance credit',
    });
    logStep(8, 'Credit applied', {
      creditId: oid(credit),
      organizationId: String(credit.organization),
      amount: credit.amount,
      sourceType: credit.sourceType,
    });

    const periodStart = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(Date.now() - 60 * 1000);
    await subscriptionRepositoryModule.subscriptionRepository.updateById(oid(subscription), {
      status: 'ACTIVE',
      autoRenew: true,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      renewalLockedUntil: null,
    });
    const renewalSummary = await renewalsModule.processRenewals();
    logStep(9, 'Renewal job executed', renewalSummary);
  } finally {
    globalThis.fetch = originalFetch;
    await mongoose.connection.close();
    await mongoReplSet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
