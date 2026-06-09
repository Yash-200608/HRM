import type { ClientSession } from 'mongoose';
import { createPublicId } from '../../common/security/id';
import { withTransaction } from '../../common/db/transaction';
import { billingRepository } from './billing.repository';
import { eventRepository } from '../events/event.repository';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { planRepository } from '../plans/plan.repository';
import { subscriptionRepository } from '../subscriptions/subscription.repository';
import { generateInvoicePdfBuffer } from './invoice-pdf.service';
import { createRazorpayOrder, captureRazorpayPayment, fetchRazorpayPayment, refundRazorpayPayment } from '../../integrations/razorpay/client';
import { uploadObject } from '../../integrations/s3';
import { runIdempotentOperation } from '../idempotency/idempotency.service';
import { archiveService } from '../archive/archive.service';
import { metrics } from '../../common/observability/metrics';
import { creditLedgerService } from './credit-ledger.service';
import { paymentSagaService } from './payment-saga.service';
import { assertHrmOrganizationExists, assertSameHrmOrganization } from '../organizations/organization-ownership.service';

function makeInvoiceNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function asId(value: unknown) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const candidate = (value as { _id?: unknown; id?: unknown })._id ?? (value as { _id?: unknown; id?: unknown }).id;
    if (candidate && candidate !== value) {
      return asId(candidate);
    }

    if (typeof (value as { toHexString?: () => string }).toHexString === 'function') {
      return (value as { toHexString: () => string }).toHexString();
    }

    if (typeof (value as { toString?: () => string }).toString === 'function') {
      const stringified = (value as { toString: () => string }).toString();
      if (stringified && stringified !== '[object Object]') {
        return stringified;
      }
    }
  }

  return String(value);
}

type InvoiceLineItem = {
  code: string;
  description: string;
  quantity: number;
  unitAmount: number;
};

type BillingPlanRecord = {
  code: string;
  name: string;
  billingInterval: 'month' | 'year';
  priceMonthly: number;
  priceYearly: number;
};

type BillingSubscriptionRecord = {
  _id: unknown;
  organization: unknown;
  plan: unknown;
  planCode: string;
  currency: string;
  status: string;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  renewalLockedUntil?: Date | null;
  metadata?: Record<string, unknown> | null;
  creditBalance?: number | null;
  employeeLimit?: number | null;
  updatedAt?: Date | null;
};

type BillingInvoiceRecord = {
  _id: unknown;
  organization: unknown;
  subscription: unknown;
  publicId: string;
  invoiceNumber: string;
  invoiceKey?: string | null;
  provider?: string | null;
  providerInvoiceId?: string | null;
  providerOrderId?: string | null;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'CANCELLED' | 'PAST_DUE' | 'REFUNDED';
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  creditAppliedAmount?: number | null;
  amountDue?: number | null;
  dueAt?: Date | null;
  paidAt?: Date | null;
  refundedAt?: Date | null;
  refundAmount?: number | null;
  metadata?: Record<string, unknown> | null;
  pdfS3Key?: string | null;
  pdfUploadedAt?: Date | null;
};

type BillingPaymentRecord = {
  _id: unknown;
  organization: unknown;
  invoice: unknown;
  publicId: string;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  providerRefundId?: string | null;
  status: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: string;
  failureCode?: string | null;
  failureReason?: string | null;
  rawPayload?: Record<string, unknown> | null;
  authorizedAt?: Date | null;
  capturedAt?: Date | null;
  refundedAt?: Date | null;
  refundAmount?: number | null;
  rawRefundPayload?: Record<string, unknown> | null;
};

function isBillingPlanRecord(value: unknown): value is BillingPlanRecord {
  return value !== null && typeof value === 'object' && 'billingInterval' in value && 'priceMonthly' in value && 'priceYearly' in value;
}

function addBillingInterval(base: Date, billingInterval: string) {
  const next = new Date(base.getTime());
  if (billingInterval === 'year') {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    return next;
  }

  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function getInvoiceAmountDue(invoice: { amountDue?: number | null; total: number }) {
  return Math.max(Number(invoice.amountDue ?? invoice.total ?? 0), 0);
}

function buildDeterministicEventId(prefix: string, ...parts: Array<string | number | null | undefined>) {
  return [prefix, ...parts.map((part) => (part == null ? 'none' : String(part)))].join(':');
}

async function rollSubscriptionPeriodForInvoice(invoice: {
  _id: unknown;
  subscription: unknown;
  organization: unknown;
  currency: string;
}, session?: ClientSession) {
  const subscription = (await subscriptionRepository.findById(String(invoice.subscription), { session })) as BillingSubscriptionRecord | null;
  if (!subscription) {
    return null;
  }

  const lastPaidInvoiceId = String(subscription.metadata?.lastPaidInvoiceId ?? '');
  if (lastPaidInvoiceId === String(invoice._id)) {
    return subscription;
  }

  const plan = isBillingPlanRecord(subscription.plan)
    ? subscription.plan
    : ((await planRepository.findByCode(subscription.planCode, { session })) as BillingPlanRecord | null);
  if (!plan) {
    throw new AppError('Plan not found for subscription period roll-forward', 404, ErrorCodes.NotFound);
  }

  const now = new Date();
  const periodStart = subscription.currentPeriodEnd instanceof Date && subscription.currentPeriodEnd > now ? subscription.currentPeriodEnd : now;
  const periodEnd = addBillingInterval(periodStart, plan.billingInterval);

  return subscriptionRepository.updateById(
    String(subscription._id),
    {
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      status: 'ACTIVE',
      renewalLockedUntil: null,
      metadata: {
        ...(subscription.metadata ?? {}),
        lastPaidInvoiceId: String(invoice._id),
        lastPaidAt: now,
        lastPeriodRollStart: periodStart.toISOString(),
        lastPeriodRollEnd: periodEnd.toISOString(),
      },
    },
    { session },
  );
}

async function commitCapturedPaymentTransaction(input: {
  invoice: {
    _id: unknown;
    organization: unknown;
    subscription: unknown;
    publicId: string;
    total: number;
    currency: string;
    creditAppliedAmount?: number | null;
    amountDue?: number | null;
    status: string;
    metadata?: Record<string, unknown> | null;
  };
  providerPayment: Record<string, unknown>;
  paymentId?: string;
  amountInPaise: number;
  session?: ClientSession;
  currency?: string;
  provider?: string;
}) {
  const providerPaymentId = typeof input.providerPayment.id === 'string' ? input.providerPayment.id : input.paymentId ?? null;
  if (!providerPaymentId) {
    throw new AppError('Provider payment id missing from capture response', 500, ErrorCodes.InternalServerError);
  }

  const invoice = input.invoice;
  const paymentAmount = Math.round(input.amountInPaise / 100);
  const invoiceDueAmount = getInvoiceAmountDue(invoice);
  const existingPayment = (await billingRepository.findPaymentByProviderId(providerPaymentId, { session: input.session })) as BillingPaymentRecord | null;
  const shouldCountSuccess = existingPayment?.status !== 'SUCCEEDED' || invoice.status !== 'PAID';

  let payment: BillingPaymentRecord | null = existingPayment;
  if (existingPayment?.status !== 'SUCCEEDED') {
    if (existingPayment) {
      payment = (await billingRepository.updatePaymentById(
        String(existingPayment._id),
        {
          status: 'SUCCEEDED',
          capturedAt: new Date(),
          amount: paymentAmount,
          currency: input.currency ?? invoice.currency,
          providerOrderId:
            typeof input.providerPayment.order_id === 'string'
              ? input.providerPayment.order_id
              : existingPayment.providerOrderId ?? null,
          rawPayload: input.providerPayment,
        },
        { session: input.session },
      )) as BillingPaymentRecord | null;
    } else {
      try {
        payment = (await billingRepository.createPayment(
          {
            publicId: createPublicId('pay'),
            invoice: invoice._id,
            organization: invoice.organization,
            provider: input.provider ?? 'razorpay',
            providerPaymentId,
            providerOrderId: typeof input.providerPayment.order_id === 'string' ? input.providerPayment.order_id : null,
            status: 'SUCCEEDED',
            amount: paymentAmount,
            currency: input.currency ?? invoice.currency,
            capturedAt: new Date(),
            rawPayload: input.providerPayment,
          },
          { session: input.session },
        )) as BillingPaymentRecord;
      } catch (error) {
        const duplicatePayment = (await billingRepository.findPaymentByProviderId(providerPaymentId, { session: input.session })) as BillingPaymentRecord | null;
        if (!duplicatePayment) {
          throw error;
        }

        payment = duplicatePayment;
      }
    }
  }

  const updatedInvoice =
    invoice.status === 'PAID'
      ? invoice
      : await billingRepository.updateInvoiceIfStatusIn(
          String(invoice._id),
          ['DRAFT', 'OPEN', 'PAST_DUE'],
          {
            status: 'PAID',
            paidAt: new Date(),
          },
          { session: input.session },
        );

  let settledInvoice = updatedInvoice ?? invoice;
  if (!updatedInvoice && invoice.status !== 'PAID') {
    const latestInvoice = await billingRepository.findInvoiceById(String(invoice._id), { session: input.session });
    if (latestInvoice?.status === 'PAID') {
      settledInvoice = latestInvoice;
    } else {
      throw new AppError('Invoice is not eligible for payment capture', 409, ErrorCodes.Conflict);
    }
  }

  const subscription = await rollSubscriptionPeriodForInvoice(settledInvoice, input.session);

  const overpayment = Math.max(paymentAmount - invoiceDueAmount, 0);
  if (overpayment > 0) {
    await creditLedgerService.addCredit(
      {
        organizationId: asId(invoice.organization),
        subscriptionId: String(invoice.subscription),
        amount: overpayment,
        sourceType: 'OVERPAYMENT',
        note: 'Overpayment credit from payment capture',
        invoiceId: String(invoice._id),
        entryKey: `payment-overpay:${String(invoice._id)}:${providerPaymentId}`,
        currency: input.currency ?? invoice.currency,
      },
      { session: input.session },
    );
  }

  await eventRepository.createOutbox(
    {
      eventId: buildDeterministicEventId('invoice.paid', String(invoice._id)),
      topic: 'invoice.paid',
      aggregateType: 'Invoice',
      aggregateId: String(invoice._id),
      organization: invoice.organization,
      payload: {
        invoiceId: String(invoice._id),
        publicId: invoice.publicId,
        status: settledInvoice.status,
        total: settledInvoice.total,
        amountDue: invoiceDueAmount,
        creditAppliedAmount: Number(invoice.creditAppliedAmount ?? 0),
        providerPaymentId,
      },
      headers: {},
      status: 'PENDING',
    },
    { session: input.session },
  );

  if (shouldCountSuccess) {
    metrics.increment('billing_payment_success_total', { provider: input.provider ?? 'razorpay' });
  }

  return {
    payment,
    invoice: settledInvoice,
    subscription,
  };
}

export const billingService = {
  createInvoiceForSubscription: async (
    subscriptionId: string,
    lineItems: InvoiceLineItem[],
    options?: { idempotencyKey?: string; session?: ClientSession; invoiceKey?: string },
  ) => {
    const execute = async (session?: ClientSession) => {
      const subscription = (await subscriptionRepository.findById(subscriptionId, { session })) as BillingSubscriptionRecord | null;
      if (!subscription) {
        throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
      }

      const subtotal = lineItems.reduce((sum, line) => sum + line.quantity * line.unitAmount, 0);
      const tax = Math.round(subtotal * 0.18);
      const total = subtotal + tax;
      const organizationId = asId(subscription.organization);
      await assertHrmOrganizationExists(organizationId, { session });
      await archiveService.assertOrganizationWritable(organizationId);

      const invoiceKey = options?.invoiceKey ?? options?.idempotencyKey ?? null;
      let invoice: BillingInvoiceRecord | null = invoiceKey
        ? ((await billingRepository.findInvoiceByInvoiceKey(invoiceKey, { session })) as BillingInvoiceRecord | null)
        : null;
      if (!invoice) {
        invoice = (await billingRepository.createInvoice(
          {
            publicId: createPublicId('inv'),
            invoiceNumber: makeInvoiceNumber(),
            invoiceKey,
            organization: organizationId,
            subscription: subscription._id,
            status: 'DRAFT',
            currency: subscription.currency,
            subtotal,
            tax,
            total,
            creditAppliedAmount: 0,
            amountDue: total,
            lineItems: lineItems.map((line) => ({
              ...line,
              totalAmount: line.quantity * line.unitAmount,
            })),
            metadata: { generatedBy: 'billing-service' },
          },
          { session },
        )) as BillingInvoiceRecord;
      }

      if (!invoice) {
        throw new AppError('Invoice creation failed', 500, ErrorCodes.InternalServerError);
      }

      const amountDueBeforeCredits = getInvoiceAmountDue(invoice);
      const creditApplication = await creditLedgerService.consumeCreditsForInvoice(
        {
          organizationId,
          subscriptionId: String(subscription._id),
          invoiceId: String(invoice._id),
          currency: subscription.currency,
          amountDue: amountDueBeforeCredits,
        },
        { session },
      );

      const updatedInvoice: BillingInvoiceRecord | null =
        Number(invoice.creditAppliedAmount ?? 0) !== creditApplication.creditAppliedAmount ||
        Number(invoice.amountDue ?? invoice.total) !== creditApplication.amountDue
          ? ((await billingRepository.updateInvoiceById(
              String(invoice._id),
              {
                creditAppliedAmount: creditApplication.creditAppliedAmount,
                amountDue: creditApplication.amountDue,
                metadata: {
                  ...(invoice.metadata ?? {}),
                  billingAppliedAt: new Date(),
                  billingApplicationKey: invoiceKey,
                },
              },
              { session },
            )) as BillingInvoiceRecord | null)
          : invoice;

      await subscriptionRepository.updateById(
        String(subscription._id),
        {
          metadata: {
            ...(subscription.metadata ?? {}),
            lastInvoiceId: String(updatedInvoice?._id ?? invoice._id),
            lastInvoiceAt: new Date(),
            lastInvoiceKey: invoiceKey,
          },
        },
        { session },
      );

      await eventRepository.createOutbox(
        {
          eventId: buildDeterministicEventId('invoice.created', String(updatedInvoice?._id ?? invoice._id)),
          topic: 'invoice.created',
          aggregateType: 'Invoice',
          aggregateId: String(updatedInvoice?._id ?? invoice._id),
          organization: organizationId,
          payload: {
            invoiceId: String(updatedInvoice?._id ?? invoice._id),
            publicId: updatedInvoice?.publicId ?? invoice.publicId,
            status: updatedInvoice?.status ?? invoice.status,
            total: updatedInvoice?.total ?? invoice.total,
            amountDue: creditApplication.amountDue,
            creditAppliedAmount: creditApplication.creditAppliedAmount,
          },
          headers: {},
          status: 'PENDING',
        },
        { session },
      );

      metrics.increment('invoice_created_total', { currency: subscription.currency });

      return (updatedInvoice ?? invoice) as BillingInvoiceRecord;
    };

    if (options?.session) {
      return execute(options.session);
    }

    const work = async () => withTransaction(async (session) => execute(session));

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'billing:create-invoice',
        key: options.idempotencyKey,
        payload: { subscriptionId, lineItems, invoiceKey: options.invoiceKey ?? options.idempotencyKey },
        operation: work,
      });
    }

    return work();
  },
  finalizeInvoice: async (invoiceId: string, options?: { session?: ClientSession }) => {
    const execute = async (session?: ClientSession) => {
      const invoice = await billingRepository.findInvoiceById(invoiceId, { session });
      if (!invoice) {
        throw new AppError('Invoice not found', 404, ErrorCodes.NotFound);
      }
      await assertHrmOrganizationExists(asId(invoice.organization), { session });

      if (invoice.status !== 'DRAFT') {
        return invoice;
      }

      if (getInvoiceAmountDue(invoice) <= 0) {
        return billingRepository.updateInvoiceIfStatusIn(
          invoiceId,
          ['DRAFT', 'OPEN', 'PAST_DUE'],
          {
            status: 'PAID',
            paidAt: new Date(),
          },
          { session },
        );
      }

      return billingRepository.updateInvoiceIfStatusIn(
        invoiceId,
        ['DRAFT'],
        {
          status: 'OPEN',
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { session },
      );
    };

    if (options?.session) {
      return execute(options.session);
    }

    return execute();
  },
  getInvoicePdf: async (invoiceId: string) => {
    const invoice = await billingRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, ErrorCodes.NotFound);
    }
    await assertHrmOrganizationExists(asId(invoice.organization));

    const pdf = generateInvoicePdfBuffer({
      invoiceNumber: invoice.invoiceNumber,
      publicId: invoice.publicId,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      lineItems: invoice.lineItems ?? [],
    });

    if (invoice.pdfS3Key && invoice.pdfUploadedAt) {
      return pdf;
    }

    const storageKey = `invoice-pdfs/${invoice.publicId}.pdf`;
    const upload = await uploadObject({
      key: storageKey,
      body: pdf,
      contentType: 'application/pdf',
    });

    await billingRepository.updateInvoiceById(String(invoice._id), {
      pdfS3Key: upload.key,
      pdfS3Url: upload.url,
      pdfUploadedAt: new Date(),
      metadata: {
        ...(invoice.metadata ?? {}),
        pdfStorage: upload,
      },
    });

    metrics.increment('invoice_pdf_uploaded_total', { provider: 's3' });

    return pdf;
  },
  createRazorpayOrderForInvoice: async (invoiceId: string, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const invoice = await billingRepository.findInvoiceById(invoiceId);
      if (!invoice) {
        throw new AppError('Invoice not found', 404, ErrorCodes.NotFound);
      }
      await assertHrmOrganizationExists(asId(invoice.organization));

      if (invoice.providerOrderId) {
        const saga = await paymentSagaService.ensureSagaForInvoice({
          organizationId: asId(invoice.organization),
          subscriptionId: String(invoice.subscription),
          invoiceId: String(invoice._id),
          provider: 'razorpay',
          localPayload: {
            invoiceId: String(invoice._id),
            amountDue: getInvoiceAmountDue(invoice),
          },
        });
        await paymentSagaService.attachProviderOrder(String(saga._id), {
          providerOrderId: invoice.providerOrderId,
          providerPayload: {
            existing: true,
            invoiceId: String(invoice._id),
          },
        });
        return invoice;
      }

      if (getInvoiceAmountDue(invoice) <= 0) {
        return billingService.finalizeInvoice(invoiceId);
      }

      const saga = await paymentSagaService.ensureSagaForInvoice({
        organizationId: asId(invoice.organization),
        subscriptionId: String(invoice.subscription),
        invoiceId: String(invoice._id),
        provider: 'razorpay',
        localPayload: {
          invoiceId: String(invoice._id),
          amountDue: getInvoiceAmountDue(invoice),
        },
      });

      const order = await createRazorpayOrder({
        amountInPaise: getInvoiceAmountDue(invoice) * 100,
        currency: invoice.currency,
        receipt: invoice.invoiceNumber,
        notes: {
          invoiceId: String(invoice._id),
          organizationId: String(invoice.organization),
        },
      });

      await paymentSagaService.attachProviderOrder(String(saga._id), {
        providerOrderId: order.id,
        providerPayload: order,
      });

      return billingRepository.updateInvoiceById(String(invoice._id), {
        providerOrderId: order.id,
        metadata: {
          ...(invoice.metadata ?? {}),
          razorpayOrderStatus: order.status,
        },
      });
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'billing:create-razorpay-order',
        key: options.idempotencyKey,
        payload: { invoiceId },
        operation: work,
      });
    }

    return work();
  },
  capturePayment: async (input: { paymentId: string; amountInPaise: number; currency?: string; invoiceId?: string }, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const existingPayment = await billingRepository.findPaymentByProviderId(input.paymentId);
      const invoice = existingPayment
        ? ((await billingRepository.findInvoiceById(String(existingPayment.invoice))) as BillingInvoiceRecord | null)
        : input.invoiceId
          ? ((await billingRepository.findInvoiceById(input.invoiceId)) as BillingInvoiceRecord | null)
          : null;

      if (!invoice) {
        throw new AppError('Invoice not found for payment capture', 404, ErrorCodes.NotFound);
      }
      await assertHrmOrganizationExists(asId(invoice.organization));

      if (existingPayment?.status === 'REFUNDED' && invoice.status === 'REFUNDED') {
        return existingPayment;
      }

      const saga = await paymentSagaService.ensureSagaForInvoice({
        organizationId: asId(invoice.organization),
        subscriptionId: String(invoice.subscription),
        invoiceId: String(invoice._id),
        provider: 'razorpay',
        localPayload: {
          paymentId: input.paymentId,
          amountInPaise: input.amountInPaise,
          currency: input.currency ?? invoice.currency,
        },
      });

      if (paymentSagaService.isTerminal(saga.state)) {
        if (existingPayment?.status === 'SUCCEEDED' && invoice.status === 'PAID') {
          return existingPayment;
        }

        if (existingPayment?.status === 'REFUNDED' && invoice.status === 'REFUNDED') {
          return existingPayment;
        }
      }

      if (saga.state === 'DB_COMMIT_PENDING' && existingPayment?.status === 'SUCCEEDED' && invoice.status === 'PAID') {
        await paymentSagaService.markCompleted(String(saga._id));
        return existingPayment;
      }

      await paymentSagaService.attachProviderPayment(String(saga._id), {
        providerPaymentId: input.paymentId,
        providerPayload: {
          paymentId: input.paymentId,
          amountInPaise: input.amountInPaise,
          currency: input.currency ?? invoice.currency,
        },
      });

      let providerPayment: Record<string, unknown>;
      try {
        const providerTruth = (await fetchRazorpayPayment(input.paymentId)) as Record<string, unknown>;
        const providerTruthStatus = typeof providerTruth.status === 'string' ? providerTruth.status : null;

        if (providerTruthStatus === 'captured') {
          providerPayment = providerTruth;
        } else if (providerTruthStatus === 'authorized') {
          providerPayment = await captureRazorpayPayment({
            paymentId: input.paymentId,
            amountInPaise: input.amountInPaise,
            currency: input.currency ?? invoice.currency,
          });
        } else if (providerTruthStatus === 'refunded') {
          return billingService.refundPayment(
            {
              paymentId: input.paymentId,
              amountInPaise: input.amountInPaise,
              invoiceId: String(invoice._id),
            },
            {
              idempotencyKey: `capture-refunded:${input.paymentId}:${input.amountInPaise}:${String(invoice._id)}`,
            },
          );
        } else if (providerTruthStatus === 'failed') {
          await paymentSagaService.markFailed(String(saga._id), {
            failureReason: 'provider_payment_failed',
            nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
          });
          throw new AppError('Payment failed', 402, ErrorCodes.PaymentFailed);
        } else {
          throw new AppError('Unsupported provider payment state', 502, ErrorCodes.PaymentFailed);
        }
      } catch (error) {
        throw error;
      }

      const paymentId = typeof providerPayment.id === 'string' ? providerPayment.id : input.paymentId;
      const providerAmountInPaise = typeof providerPayment.amount === 'number' ? providerPayment.amount : input.amountInPaise;

      await paymentSagaService.attachProviderPayment(String(saga._id), {
        providerPaymentId: paymentId,
        providerPayload: providerPayment,
      });
      await paymentSagaService.markPaymentCaptured(String(saga._id), {
        providerPaymentId: paymentId,
        providerPayload: providerPayment,
      });

      try {
        const result = await withTransaction(async (session) => {
          await paymentSagaService.markDbCommitPending(String(saga._id), { session });
          const settled = await commitCapturedPaymentTransaction({
            invoice,
            providerPayment,
            paymentId,
            amountInPaise: providerAmountInPaise,
            currency: input.currency ?? invoice.currency,
            session,
            provider: 'razorpay',
          });

          await paymentSagaService.markCompleted(String(saga._id), { session });
          return settled.payment ?? settled.invoice;
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'payment_capture_failed';
        await paymentSagaService.beginCompensation(String(saga._id), {
          failureReason: message,
        });

        try {
          const refund = await billingService.refundPayment(
            {
              paymentId,
              amountInPaise: providerAmountInPaise,
              invoiceId: String(invoice._id),
            },
            {
              idempotencyKey: `capture-compensate:${paymentId}:${providerAmountInPaise}:${String(invoice._id)}`,
            },
          );

          await paymentSagaService.markCompensated(String(saga._id), {
            providerRefundId: typeof refund?.providerRefundId === 'string' ? refund.providerRefundId : null,
            providerPayload: { refund },
          });
          metrics.increment('billing_saga_compensation_total', { provider: 'razorpay' });
          metrics.increment('billing_payment_failure_total', { provider: 'razorpay' });
          return refund;
        } catch (compensationError) {
          await paymentSagaService.markFailed(String(saga._id), {
            failureReason: compensationError instanceof Error ? compensationError.message : 'payment_compensation_failed',
          });
          metrics.increment('billing_payment_failure_total', { provider: 'razorpay' });
          throw compensationError;
        }
      }
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'billing:capture-payment',
        key: options.idempotencyKey,
        payload: input,
        operation: work,
      });
    }

    return work();
  },
  refundPayment: async (input: { paymentId: string; amountInPaise?: number; invoiceId?: string }, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const currentPayment = (await billingRepository.findPaymentByProviderId(input.paymentId)) as BillingPaymentRecord | null;
      const invoice: BillingInvoiceRecord | null = currentPayment
        ? ((await billingRepository.findInvoiceById(String(currentPayment.invoice))) as BillingInvoiceRecord | null)
        : input.invoiceId
          ? ((await billingRepository.findInvoiceById(input.invoiceId)) as BillingInvoiceRecord | null)
          : null;

      if (!invoice) {
        throw new AppError('Invoice not found for refund', 404, ErrorCodes.NotFound);
      }
      await assertHrmOrganizationExists(asId(invoice.organization));

      if (currentPayment?.status === 'REFUNDED' && invoice.status === 'REFUNDED') {
        return currentPayment;
      }

      if (currentPayment && (currentPayment.status === 'FAILED' || currentPayment.status === 'AUTHORIZED' || currentPayment.status === 'PENDING')) {
        throw new AppError('Refund requires a captured payment', 409, ErrorCodes.Conflict);
      }

      const refundAmount =
        typeof input.amountInPaise === 'number' ? Math.round(input.amountInPaise / 100) : Math.round(currentPayment?.amount ?? invoice.total);
      if (currentPayment && refundAmount > Math.round(currentPayment.amount)) {
        throw new AppError('Refund amount exceeds captured amount', 409, ErrorCodes.Conflict);
      }

      const saga = await paymentSagaService.ensureSagaForInvoice({
        organizationId: asId(invoice.organization),
        subscriptionId: String(invoice.subscription),
        invoiceId: String(invoice._id),
        provider: 'razorpay',
        localPayload: {
          paymentId: input.paymentId,
          amountInPaise: refundAmount * 100,
          currency: invoice.currency,
        },
      });
      await paymentSagaService.beginCompensation(String(saga._id), {
        failureReason: 'refund_provider_intent',
      });

      let providerRefund: Record<string, unknown>;
      try {
        const providerTruth = (await fetchRazorpayPayment(input.paymentId)) as Record<string, unknown>;
        const providerTruthStatus = typeof providerTruth.status === 'string' ? providerTruth.status : null;

        if (providerTruthStatus === 'refunded') {
          providerRefund = {
            id: currentPayment?.providerRefundId ?? `refund-${input.paymentId}`,
            status: 'processed',
            amount: refundAmount * 100,
            payment: providerTruth,
          };
        } else if (providerTruthStatus === 'captured' || providerTruthStatus === 'authorized') {
          providerRefund = await refundRazorpayPayment({
            paymentId: input.paymentId,
            amountInPaise: refundAmount * 100,
          });
        } else {
          throw new AppError('Refund requires a captured payment', 409, ErrorCodes.Conflict);
        }
      } catch (error) {
        throw error;
      }

      return withTransaction(async (session) => {
        const currentPaymentInTx = (await billingRepository.findPaymentByProviderId(input.paymentId, { session })) as BillingPaymentRecord | null;
        let paymentInTx: BillingPaymentRecord | null = currentPaymentInTx;

        if (!paymentInTx) {
          paymentInTx = (await billingRepository.createPayment(
            {
              publicId: createPublicId('pay'),
              invoice: invoice._id,
              organization: invoice.organization,
              provider: 'razorpay',
              providerPaymentId: input.paymentId,
              providerOrderId: invoice.providerOrderId ?? null,
              status: 'REFUNDED',
              amount: refundAmount,
              currency: invoice.currency,
              refundedAt: new Date(),
              refundAmount,
              providerRefundId: typeof providerRefund.id === 'string' ? providerRefund.id : null,
              rawPayload: {
                compensation: true,
                source: 'refund-payment',
              },
              rawRefundPayload: providerRefund,
            },
            { session },
          )) as BillingPaymentRecord;
        } else if (currentPaymentInTx && currentPaymentInTx.status !== 'REFUNDED') {
          paymentInTx = (await billingRepository.updatePaymentById(
            String(currentPaymentInTx._id),
            {
              status: 'REFUNDED',
              refundedAt: new Date(),
              refundAmount,
              providerRefundId: typeof providerRefund.id === 'string' ? providerRefund.id : null,
              rawRefundPayload: providerRefund,
            },
            { session },
          )) as BillingPaymentRecord | null;
        }

        if (!paymentInTx) {
          throw new AppError('Payment not found', 404, ErrorCodes.NotFound);
        }

        const invoiceInTx = (await billingRepository.findInvoiceById(String(invoice._id), { session })) as BillingInvoiceRecord | null;
        if (!invoiceInTx) {
          throw new AppError('Invoice not found for refund', 404, ErrorCodes.NotFound);
        }

        await billingRepository.updateInvoiceIfStatusIn(
          String(invoiceInTx._id),
          ['DRAFT', 'OPEN', 'PAID', 'PAST_DUE'],
          {
            status: 'REFUNDED',
            refundedAt: new Date(),
            refundAmount,
          },
          { session },
        );

        await eventRepository.createOutbox(
          {
            eventId: buildDeterministicEventId('payment.refunded', String(paymentInTx.providerPaymentId ?? input.paymentId), refundAmount),
            topic: 'payment.refunded',
            aggregateType: 'Payment',
            aggregateId: String(paymentInTx._id),
            organization: paymentInTx.organization,
            payload: {
              paymentId: String(paymentInTx._id),
              providerRefundId: typeof providerRefund.id === 'string' ? providerRefund.id : null,
              refundAmount,
            },
            headers: {},
            status: 'PENDING',
          },
          { session },
        );

        await paymentSagaService.markCompensated(String(saga._id), {
          providerRefundId: typeof providerRefund.id === 'string' ? providerRefund.id : null,
          providerPayload: { refund: providerRefund },
        }, { session });

        metrics.increment('payment_refunded_total', { provider: 'razorpay' });

        return paymentInTx;
      });
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'billing:refund-payment',
        key: options.idempotencyKey,
        payload: input,
        operation: work,
      });
    }

    return work();
  },
  markInvoicePastDue: async (invoiceId: string, reason?: string, options?: { session?: ClientSession }) => {
    const execute = async (session?: ClientSession) => {
      const invoice = (await billingRepository.findInvoiceById(invoiceId, { session })) as BillingInvoiceRecord | null;
      if (!invoice) {
        throw new AppError('Invoice not found', 404, ErrorCodes.NotFound);
      }
      await assertHrmOrganizationExists(asId(invoice.organization), { session });

      if (invoice.status === 'PAID' || invoice.status === 'VOID' || invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
        return invoice;
      }

      const updatedInvoice = (await billingRepository.updateInvoiceIfStatusIn(
        invoiceId,
        ['DRAFT', 'OPEN', 'PAST_DUE'],
        {
          status: 'PAST_DUE',
          metadata: {
            ...(invoice.metadata ?? {}),
            reason: reason ?? 'payment_failed',
          },
        },
        { session },
      )) as BillingInvoiceRecord | null;

      await subscriptionRepository.updateByOrganization(
        String(invoice.organization),
        {
          status: 'PAST_DUE',
        },
        { session },
      );

      return updatedInvoice;
    };

    if (options?.session) {
      return execute(options.session);
    }

    return withTransaction(async (session) => execute(session));
  },
  markInvoicePaid: async (invoiceId: string, payment: { amount: number; providerPaymentId?: string }, options?: { session?: ClientSession }) => {
    const execute = async (session?: ClientSession) => {
      const invoice = (await billingRepository.findInvoiceById(invoiceId, { session })) as BillingInvoiceRecord | null;
      if (!invoice) {
        throw new AppError('Invoice not found', 404, ErrorCodes.NotFound);
      }
      await assertHrmOrganizationExists(asId(invoice.organization), { session });

      const providerPaymentId = payment.providerPaymentId ?? `manual:${String(invoice._id)}`;
      const result = await commitCapturedPaymentTransaction(
        {
          invoice,
          providerPayment: { id: providerPaymentId },
          paymentId: providerPaymentId,
          amountInPaise: Math.round(payment.amount * 100),
          session,
          provider: payment.providerPaymentId ? 'razorpay' : 'manual',
        },
      );

      await subscriptionRepository.updateByOrganization(
        String(invoice.organization),
        {
          status: 'ACTIVE',
        },
        { session },
      );

      return result.invoice ?? invoice;
    };

    if (options?.session) {
      return execute(options.session);
    }

    return withTransaction(async (session) => execute(session));
  },
  recordPayment: async (input: { invoiceId: string; organizationId: string; amount: number; providerPaymentId?: string }) => {
    await assertHrmOrganizationExists(input.organizationId);
    const invoice = await billingRepository.findInvoiceById(input.invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, ErrorCodes.NotFound);
    }
    assertSameHrmOrganization(input.organizationId, asId(invoice.organization));

    return billingRepository.createPayment({
      publicId: createPublicId('pay'),
      invoice: input.invoiceId,
      organization: input.organizationId,
      provider: 'razorpay',
      providerPaymentId: input.providerPaymentId ?? null,
      status: 'SUCCEEDED',
      amount: input.amount,
      currency: 'INR',
      capturedAt: new Date(),
    });
  },
  applyCredit: async (input: { organizationId: string; subscriptionId?: string; amount: number; sourceType: 'PRORATION' | 'MANUAL_ADJUSTMENT' | 'GOODWILL' | 'REFUND' | 'OVERPAYMENT' | 'INVOICE_APPLIED' | 'RECONCILIATION'; note?: string; invoiceId?: string }) => {
    await assertHrmOrganizationExists(input.organizationId);
    return creditLedgerService.addCredit({
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId,
      amount: input.amount,
      sourceType: input.sourceType,
      note: input.note ?? null,
      invoiceId: input.invoiceId ?? null,
    });
  },
  getCreditBalance: async (organizationId: string) => {
    await assertHrmOrganizationExists(organizationId);
    return creditLedgerService.getMaterializedBalance(organizationId);
  },
  renewSubscription: async (subscriptionId: string) => {
    return withTransaction(async (session) => {
      const now = new Date();
      const subscription = (await subscriptionRepository.findById(subscriptionId, { session })) as BillingSubscriptionRecord | null;
      if (!subscription) {
        throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
      }

      const locked = await subscriptionRepository.claimRenewalLock(
        String(subscription._id),
        now,
        new Date(Date.now() + 10 * 60 * 1000),
        { session },
      );
      if (!locked) {
        return null;
      }

      const plan = await planRepository.findByCode(subscription.planCode, { session });
      if (!plan) {
        throw new AppError('Plan not found', 404, ErrorCodes.NotFound);
      }

      const periodStart = subscription.currentPeriodEnd instanceof Date && subscription.currentPeriodEnd > now ? subscription.currentPeriodEnd : now;
      const periodEnd = addBillingInterval(periodStart, plan.billingInterval);
      const invoice = await billingService.createRenewalInvoiceForSubscription(String(subscription._id), {
        session,
        finalize: false,
        now,
      });

      if (!invoice) {
        throw new AppError('Invoice creation failed', 500, ErrorCodes.InternalServerError);
      }

      const updatedSubscription = (await subscriptionRepository.updateById(
        String(subscription._id),
        {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          status: 'ACTIVE',
          renewalLockedUntil: null,
          metadata: {
            ...(subscription.metadata ?? {}),
            lastRenewalInvoiceId: String(invoice._id),
            lastRenewalProcessedAt: now,
            renewalPeriodStart: periodStart.toISOString(),
            renewalPeriodEnd: periodEnd.toISOString(),
          },
        },
        { session },
      )) as BillingSubscriptionRecord | null;

      await eventRepository.createOutbox(
        {
          eventId: `subscription.renewed:${String(subscription._id)}:${String(invoice._id)}`,
          topic: 'subscription.renewed',
          aggregateType: 'Subscription',
          aggregateId: String(subscription._id),
          organization: subscription.organization,
          payload: {
            subscriptionId: String(subscription._id),
            invoiceId: String(invoice._id),
            status: 'ACTIVE',
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
          headers: {},
          status: 'PENDING',
        },
        { session },
      );

      const finalizedInvoice = (await billingService.finalizeInvoice(String(invoice._id), { session })) as BillingInvoiceRecord | null;

      return {
        invoice: finalizedInvoice ?? invoice,
        subscription: updatedSubscription ?? subscription,
        periodStart,
        periodEnd,
      };
    });
  },
  createRenewalInvoiceForSubscription: async (
    subscriptionId: string,
    options?: { session?: ClientSession; finalize?: boolean; now?: Date },
  ) => {
    const subscription = (await subscriptionRepository.findById(subscriptionId, { session: options?.session })) as BillingSubscriptionRecord | null;
    if (!subscription) {
      throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
    }

    const plan = await planRepository.findByCode(subscription.planCode, { session: options?.session });
    if (!plan) {
      throw new AppError('Plan not found', 404, ErrorCodes.NotFound);
    }

    const price = plan.billingInterval === 'year' ? plan.priceYearly : plan.priceMonthly;
    const renewalKey = `renewal:${subscriptionId}:${
      subscription.currentPeriodEnd instanceof Date
        ? subscription.currentPeriodEnd.toISOString()
        : subscription.currentPeriodStart instanceof Date
          ? subscription.currentPeriodStart.toISOString()
          : options?.now?.toISOString() ?? new Date().toISOString()
    }`;

    const invoice = (await billingService.createInvoiceForSubscription(
      subscriptionId,
      [
        {
          code: plan.code,
          description: `Renewal for ${plan.name}`,
          quantity: 1,
          unitAmount: price,
        },
      ],
      {
        session: options?.session,
        invoiceKey: renewalKey,
        idempotencyKey: options?.session ? undefined : renewalKey,
      },
    )) as BillingInvoiceRecord | null;

    if (!invoice) {
      throw new AppError('Invoice creation failed', 500, ErrorCodes.InternalServerError);
    }

    if (options?.finalize === false) {
      return invoice;
    }

    return billingService.finalizeInvoice(String(invoice._id), options?.session ? { session: options.session } : undefined);
  },
};
