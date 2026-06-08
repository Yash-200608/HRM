import type { ClientSession } from 'mongoose';
import { WebhookEventModel } from './webhook-event.model';

type DbOptions = { session?: ClientSession };

export const webhookRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    WebhookEventModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  createOrGet: (payload: Record<string, unknown>, options?: DbOptions) =>
    WebhookEventModel.findOneAndUpdate(
      { provider: payload.provider, providerEventId: payload.providerEventId },
      { $setOnInsert: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true, session: options?.session },
    ).lean(),
  findByProviderEventId: (provider: string, providerEventId: string, options?: DbOptions) =>
    WebhookEventModel.findOne({ provider, providerEventId }).session(options?.session ?? null).lean(),
  claimForProcessing: (id: string, workerId: string, claimExpiresAt: Date, options?: DbOptions) =>
    WebhookEventModel.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['RECEIVED', 'FAILED'] },
        $or: [{ claimExpiresAt: null }, { claimExpiresAt: { $lte: new Date() } }],
      },
      {
        $set: {
          status: 'PROCESSING',
          claimedAt: new Date(),
          claimedBy: workerId,
          claimExpiresAt,
          lastAttemptAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { new: true, session: options?.session },
    ).lean(),
  markProcessed: (id: string, options?: DbOptions) =>
    WebhookEventModel.findOneAndUpdate(
      { _id: id, status: 'PROCESSING' },
      { $set: { status: 'PROCESSED', processedAt: new Date(), claimExpiresAt: null, claimedAt: null, claimedBy: null } },
      { new: true, session: options?.session },
    ).lean(),
  markFailed: (id: string, failureReason: string, nextAttemptAt?: Date, options?: DbOptions) =>
    WebhookEventModel.findByIdAndUpdate(
      id,
      {
        status: 'FAILED',
        failureReason,
        nextAttemptAt: nextAttemptAt ?? null,
        claimExpiresAt: null,
        claimedAt: null,
        claimedBy: null,
      },
      { new: true, session: options?.session },
    ).lean(),
  listRetryable: (now: Date, options?: DbOptions) =>
    WebhookEventModel.find({
      status: 'FAILED',
      $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
    })
      .session(options?.session ?? null)
      .sort({ updatedAt: 1 })
      .lean(),
};
