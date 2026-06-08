import type { ClientSession } from 'mongoose';
import { SessionModel } from './session.model';

type DbOptions = { session?: ClientSession };

export const sessionRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    SessionModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findBySessionId: (sessionId: string) => SessionModel.findOne({ sessionId }).lean(),
  findActiveBySessionId: (sessionId: string) =>
    SessionModel.findOne({
      sessionId,
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
    }).lean(),
  listByOperatorId: (operatorId: string) => SessionModel.find({ operator: operatorId }).sort({ createdAt: -1 }).lean(),
  revokeBySessionId: (sessionId: string, revokedReason = 'REVOKED', options?: DbOptions) =>
    SessionModel.findOneAndUpdate(
      { sessionId },
      { status: 'REVOKED', revokedAt: new Date(), revokedReason },
      { new: true, session: options?.session },
    ).lean(),
  revokeAllByOperatorId: (operatorId: string, revokedReason = 'REVOKED', options?: DbOptions) =>
    SessionModel.updateMany(
      { operator: operatorId, status: 'ACTIVE' },
      { status: 'REVOKED', revokedAt: new Date(), revokedReason },
      { session: options?.session },
    ),
  expireBySessionId: (sessionId: string, options?: DbOptions) =>
    SessionModel.findOneAndUpdate(
      { sessionId },
      { status: 'EXPIRED', revokedAt: new Date(), revokedReason: 'EXPIRED' },
      { new: true, session: options?.session },
    ).lean(),
};
