import type { ClientSession } from 'mongoose';
import { EventInboxModel } from './event-inbox.model';
import { EventOutboxModel } from './event-outbox.model';

type DbOptions = { session?: ClientSession };

export const eventRepository = {
  createOutbox: (payload: Record<string, unknown>, options?: DbOptions) =>
    EventOutboxModel.findOneAndUpdate(
      { eventId: payload.eventId },
      { $setOnInsert: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true, session: options?.session },
    ).lean(),
  findOutboxById: (id: string) => EventOutboxModel.findById(id).lean(),
  findOutboxPending: (limit = 100) =>
    EventOutboxModel.find({
      $or: [
        { status: 'PENDING', $or: [{ availableAt: null }, { availableAt: { $lte: new Date() } }] },
        { status: 'PROCESSING', claimExpiresAt: { $lte: new Date() } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean(),
  claimNextOutbox: (workerId: string, visibilityTimeoutMs: number, options?: DbOptions) =>
    EventOutboxModel.findOneAndUpdate(
      {
        $or: [
          { status: 'PENDING', $or: [{ availableAt: null }, { availableAt: { $lte: new Date() } }] },
          { status: 'PROCESSING', claimExpiresAt: { $lte: new Date() } },
        ],
      },
      {
        $set: {
          status: 'PROCESSING',
          claimedAt: new Date(),
          claimedBy: workerId,
          claimExpiresAt: new Date(Date.now() + visibilityTimeoutMs),
          lastAttemptAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { createdAt: 1 }, session: options?.session },
    ).lean(),
  markOutboxPublished: (id: string, options?: DbOptions) =>
    EventOutboxModel.findByIdAndUpdate(
      id,
      {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        failureReason: null,
        nextAttemptAt: null,
        claimExpiresAt: null,
        claimedAt: null,
        claimedBy: null,
      },
      { new: true, session: options?.session },
    ).lean(),
  markOutboxRetry: (id: string, nextAttemptAt: Date, failureReason: string, options?: DbOptions) =>
    EventOutboxModel.findByIdAndUpdate(
      id,
      {
        status: 'PENDING',
        availableAt: nextAttemptAt,
        nextAttemptAt,
        failureReason,
        claimExpiresAt: null,
        claimedAt: null,
        claimedBy: null,
      },
      { new: true, session: options?.session },
    ).lean(),
  markOutboxDeadLetter: (id: string, deadLetterReason: string, options?: DbOptions) =>
    EventOutboxModel.findByIdAndUpdate(
      id,
      {
        status: 'DEAD_LETTER',
        deadLetterAt: new Date(),
        deadLetterReason,
        claimExpiresAt: null,
        claimedAt: null,
        claimedBy: null,
      },
      { new: true, session: options?.session },
    ).lean(),
  requeueOutbox: (id: string, options?: DbOptions) =>
    EventOutboxModel.findByIdAndUpdate(
      id,
      {
        status: 'PENDING',
        availableAt: new Date(),
        attempts: 0,
        nextAttemptAt: null,
        failureReason: null,
        deadLetterAt: null,
        deadLetterReason: null,
        claimExpiresAt: null,
        claimedAt: null,
        claimedBy: null,
      },
      { new: true, session: options?.session },
    ).lean(),
  markOutboxFailed: (id: string, failureReason: string, options?: DbOptions) =>
    EventOutboxModel.findByIdAndUpdate(id, { status: 'FAILED', failureReason }, { new: true, session: options?.session }).lean(),
  createInbox: (payload: Record<string, unknown>, options?: DbOptions) =>
    EventInboxModel.findOneAndUpdate(
      { organizationId: payload.organizationId, eventId: payload.eventId },
      { $setOnInsert: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true, session: options?.session },
    ).lean(),
  findInboxByEventId: (eventId: string, options?: DbOptions) => EventInboxModel.findOne({ eventId }).session(options?.session ?? null).lean(),
  findInboxByOrganizationEventId: (organizationId: string, eventId: string, options?: DbOptions) =>
    EventInboxModel.findOne({ organizationId, eventId }).session(options?.session ?? null).lean(),
  claimInbox: (id: string, workerId: string, claimExpiresAt: Date, options?: DbOptions) =>
    EventInboxModel.findOneAndUpdate(
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
  markInboxProcessed: (id: string, options?: DbOptions) =>
    EventInboxModel.findOneAndUpdate(
      { _id: id, status: 'PROCESSING' },
      {
        $set: {
          status: 'PROCESSED',
          processedAt: new Date(),
          claimExpiresAt: null,
          claimedAt: null,
          claimedBy: null,
        },
      },
      { new: true, session: options?.session },
    ).lean(),
  markInboxFailed: (id: string, failureReason: string, nextAttemptAt?: Date, options?: DbOptions) =>
    EventInboxModel.findByIdAndUpdate(
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
};
