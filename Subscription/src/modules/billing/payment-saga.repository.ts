import type { ClientSession } from 'mongoose';
import { PaymentSagaModel, type PaymentSagaState } from './payment-saga.model';

type DbOptions = { session?: ClientSession };

const terminalStates: PaymentSagaState[] = ['COMPLETED', 'FAILED', 'COMPENSATED'];

export const paymentSagaRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    PaymentSagaModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  upsertByInvoice: (payload: Record<string, unknown>, options?: DbOptions) =>
    PaymentSagaModel.findOneAndUpdate(
      { invoice: payload.invoice, provider: payload.provider },
      { $setOnInsert: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true, session: options?.session },
    ).lean(),
  findById: (id: string, options?: DbOptions) => PaymentSagaModel.findById(id).session(options?.session ?? null).lean(),
  findByInvoice: (invoiceId: string, options?: DbOptions) => PaymentSagaModel.findOne({ invoice: invoiceId }).session(options?.session ?? null).lean(),
  findByProviderOrderId: (provider: string, providerOrderId: string, options?: DbOptions) =>
    PaymentSagaModel.findOne({ provider, providerOrderId }).session(options?.session ?? null).lean(),
  findByProviderPaymentId: (provider: string, providerPaymentId: string, options?: DbOptions) =>
    PaymentSagaModel.findOne({ provider, providerPaymentId }).session(options?.session ?? null).lean(),
  findStale: (now: Date, staleAfterMs = 15 * 60 * 1000, options?: DbOptions) => {
    const staleBefore = new Date(now.getTime() - staleAfterMs);
    return PaymentSagaModel.find({
      state: { $nin: terminalStates },
      $or: [
        { nextAttemptAt: { $lte: now } },
        { lockedUntil: { $lte: now } },
        { updatedAt: { $lte: staleBefore } },
      ],
    })
      .session(options?.session ?? null)
      .sort({ updatedAt: 1 })
      .lean();
  },
  claimForProcessing: (id: string, workerId: string, lockedUntil: Date, options?: DbOptions) =>
    PaymentSagaModel.findOneAndUpdate(
      {
        _id: id,
        state: { $nin: terminalStates },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: new Date() } }],
      },
      {
        $set: {
          lockedBy: workerId,
          lockedUntil,
          lastAttemptAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { new: true, session: options?.session },
    ).lean(),
  transitionById: (id: string, expectedStates: PaymentSagaState[], update: Record<string, unknown>, options?: DbOptions) =>
    PaymentSagaModel.findOneAndUpdate(
      { _id: id, state: { $in: expectedStates } },
      update,
      { new: true, session: options?.session },
    ).lean(),
  updateById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    PaymentSagaModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
};
