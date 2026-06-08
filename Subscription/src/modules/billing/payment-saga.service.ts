import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { createPublicId } from '../../common/security/id';
import { paymentSagaRepository } from './payment-saga.repository';
import type { PaymentSagaState } from './payment-saga.model';

export type { PaymentSagaState } from './payment-saga.model';

const terminalStates: PaymentSagaState[] = ['COMPLETED', 'FAILED', 'COMPENSATED'];

const paymentSagaTransitionMap: Record<PaymentSagaState, PaymentSagaState[]> = {
  CREATED: ['ORDER_CREATED', 'FAILED'],
  ORDER_CREATED: ['PAYMENT_AUTHORIZED', 'FAILED', 'COMPENSATING'],
  PAYMENT_AUTHORIZED: ['PAYMENT_CAPTURED', 'FAILED', 'COMPENSATING'],
  PAYMENT_CAPTURED: ['DB_COMMIT_PENDING', 'FAILED', 'COMPENSATING'],
  DB_COMMIT_PENDING: ['COMPLETED', 'FAILED', 'COMPENSATING'],
  COMPLETED: ['COMPENSATING'],
  FAILED: ['COMPENSATING'],
  COMPENSATING: ['COMPENSATED', 'FAILED'],
  COMPENSATED: [],
};

function isTerminal(state: PaymentSagaState) {
  return terminalStates.includes(state);
}

function assertTransitionAllowed(from: PaymentSagaState, to: PaymentSagaState) {
  if (from === to) {
    return;
  }

  if (!paymentSagaTransitionMap[from].includes(to)) {
    throw new AppError(`Invalid payment saga transition from ${from} to ${to}`, 409, ErrorCodes.Conflict);
  }
}

async function transitionOrReturnExisting(
  sagaId: string,
  allowedStates: PaymentSagaState[],
  targetState: PaymentSagaState,
  update: Record<string, unknown>,
  options?: { session?: import('mongoose').ClientSession },
  compareField?: 'providerOrderId' | 'providerPaymentId' | 'providerRefundId',
  compareValue?: string,
) {
  const updated = await paymentSagaRepository.transitionById(sagaId, allowedStates, update, options);
  if (updated) {
    if (compareField && compareValue) {
      assertCompatibleProviderValue(updated, compareField, compareValue);
    }
    return updated;
  }

  const existing = await paymentSagaRepository.findById(sagaId, options);
  if (!existing) {
    return null;
  }

  if (existing.state === targetState) {
    if (compareField && compareValue) {
      assertCompatibleProviderValue(existing, compareField, compareValue);
    }
    return existing;
  }

  assertTransitionAllowed(existing.state, targetState);
  throw new AppError(`Payment saga transition from ${existing.state} to ${targetState} could not be applied`, 409, ErrorCodes.Conflict);
}

function assertCompatibleProviderValue(
  existing: Record<string, unknown> | null | undefined,
  field: 'providerOrderId' | 'providerPaymentId' | 'providerRefundId',
  value: string,
) {
  const currentValue = typeof existing?.[field] === 'string' ? String(existing?.[field]) : null;
  if (currentValue && currentValue !== value) {
    throw new AppError(`Conflicting ${field} for payment saga`, 409, ErrorCodes.Conflict);
  }
}

export const paymentSagaService = {
  isTerminal,
  ensureSagaForInvoice: async (input: {
    organizationId: string;
    subscriptionId: string;
    invoiceId: string;
    provider: string;
    localPayload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }, options?: { session?: import('mongoose').ClientSession }) => {
    const saga = await paymentSagaRepository.upsertByInvoice(
      {
        publicId: createPublicId('saga'),
        organization: input.organizationId,
        subscription: input.subscriptionId,
        invoice: input.invoiceId,
        provider: input.provider,
        state: 'CREATED',
        attempts: 0,
        compensationAttempts: 0,
        localPayload: input.localPayload ?? {},
        metadata: input.metadata ?? {},
      },
      options,
    );

    return saga;
  },
  attachProviderOrder: async (
    sagaId: string,
    input: { providerOrderId: string; providerPayload?: Record<string, unknown> },
    options?: { session?: import('mongoose').ClientSession },
  ) => {
    const updated = await transitionOrReturnExisting(
      sagaId,
      ['CREATED'],
      'ORDER_CREATED',
      {
        $set: {
          state: 'ORDER_CREATED',
          providerOrderId: input.providerOrderId,
          providerPayload: input.providerPayload ?? {},
          lastError: null,
          nextAttemptAt: null,
        },
      },
      options,
      'providerOrderId',
      input.providerOrderId,
    );

    return updated;
  },
  attachProviderPayment: async (
    sagaId: string,
    input: { providerPaymentId: string; providerPayload?: Record<string, unknown> },
    options?: { session?: import('mongoose').ClientSession },
  ) => {
    const updated = await transitionOrReturnExisting(
      sagaId,
      ['ORDER_CREATED'],
      'PAYMENT_AUTHORIZED',
      {
        $set: {
          state: 'PAYMENT_AUTHORIZED',
          providerPaymentId: input.providerPaymentId,
          providerPayload: input.providerPayload ?? {},
          lastError: null,
          nextAttemptAt: null,
        },
      },
      options,
      'providerPaymentId',
      input.providerPaymentId,
    );

    return updated;
  },
  markPaymentCaptured: async (
    sagaId: string,
    input: { providerPaymentId: string; providerPayload?: Record<string, unknown> },
    options?: { session?: import('mongoose').ClientSession },
  ) => {
    const updated = await transitionOrReturnExisting(
      sagaId,
      ['PAYMENT_AUTHORIZED'],
      'PAYMENT_CAPTURED',
      {
        $set: {
          state: 'PAYMENT_CAPTURED',
          providerPaymentId: input.providerPaymentId,
          providerPayload: input.providerPayload ?? {},
          lastError: null,
          nextAttemptAt: null,
        },
      },
      options,
      'providerPaymentId',
      input.providerPaymentId,
    );

    return updated;
  },
  markDbCommitPending: async (sagaId: string, options?: { session?: import('mongoose').ClientSession }) =>
    transitionOrReturnExisting(
      sagaId,
      ['PAYMENT_CAPTURED'],
      'DB_COMMIT_PENDING',
      {
        $set: {
          state: 'DB_COMMIT_PENDING',
          lastError: null,
          nextAttemptAt: null,
        },
      },
      options,
    ),
  markCompleted: async (sagaId: string, options?: { session?: import('mongoose').ClientSession }) =>
    transitionOrReturnExisting(
      sagaId,
      ['DB_COMMIT_PENDING'],
      'COMPLETED',
      {
        $set: {
          state: 'COMPLETED',
          completedAt: new Date(),
          lockedUntil: null,
          lockedBy: null,
          lastError: null,
          nextAttemptAt: null,
        },
      },
      options,
    ),
  markFailed: async (
    sagaId: string,
    input: { failureReason: string; nextAttemptAt?: Date | null },
    options?: { session?: import('mongoose').ClientSession },
  ) =>
    transitionOrReturnExisting(
      sagaId,
      ['CREATED', 'ORDER_CREATED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'DB_COMMIT_PENDING', 'COMPENSATING'],
      'FAILED',
      {
        $set: {
          state: 'FAILED',
          failedAt: new Date(),
          lastError: input.failureReason,
          nextAttemptAt: input.nextAttemptAt ?? null,
          lockedUntil: null,
          lockedBy: null,
        },
      },
      options,
    ),
  beginCompensation: async (
    sagaId: string,
    input: { failureReason: string; providerRefundId?: string | null },
    options?: { session?: import('mongoose').ClientSession },
  ) => {
    const updated = await transitionOrReturnExisting(
      sagaId,
      ['ORDER_CREATED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'DB_COMMIT_PENDING', 'COMPLETED', 'FAILED'],
      'COMPENSATING',
      {
        $set: {
          state: 'COMPENSATING',
          compensatingAt: new Date(),
          compensationError: input.failureReason,
          providerRefundId: input.providerRefundId ?? null,
          lockedUntil: null,
          lockedBy: null,
        },
        $inc: { compensationAttempts: 1 },
      },
      options,
      'providerRefundId',
      input.providerRefundId ?? undefined,
    );

    return updated;
  },
  markCompensated: async (
    sagaId: string,
    input: { providerRefundId?: string | null; providerPayload?: Record<string, unknown> },
    options?: { session?: import('mongoose').ClientSession },
  ) => {
    const updated = await transitionOrReturnExisting(
      sagaId,
      ['COMPENSATING'],
      'COMPENSATED',
      {
        $set: {
          state: 'COMPENSATED',
          compensatedAt: new Date(),
          providerRefundId: input.providerRefundId ?? null,
          providerPayload: input.providerPayload ?? {},
          lockedUntil: null,
          lockedBy: null,
          lastError: null,
          compensationError: null,
          nextAttemptAt: null,
        },
      },
      options,
      'providerRefundId',
      input.providerRefundId ?? undefined,
    );

    return updated;
  },
  lockForProcessing: async (sagaId: string, workerId: string, lockedUntil: Date, options?: { session?: import('mongoose').ClientSession }) =>
    paymentSagaRepository.claimForProcessing(sagaId, workerId, lockedUntil, options),
  findById: (sagaId: string, options?: { session?: import('mongoose').ClientSession }) => paymentSagaRepository.findById(sagaId, options),
  findByInvoice: (invoiceId: string, options?: { session?: import('mongoose').ClientSession }) => paymentSagaRepository.findByInvoice(invoiceId, options),
  findStaleSagas: (now: Date, staleAfterMs?: number, options?: { session?: import('mongoose').ClientSession }) =>
    paymentSagaRepository.findStale(now, staleAfterMs, options),
};
