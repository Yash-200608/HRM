import type { ClientSession } from 'mongoose';
import { SubscriptionModel } from './subscription.model';

type DbOptions = { session?: ClientSession };

export const subscriptionRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    SubscriptionModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findById: (id: string, options?: DbOptions) => SubscriptionModel.findById(id).session(options?.session ?? null).populate(['plan']).lean(),
  findByOrganization: (organizationId: string, options?: DbOptions) => SubscriptionModel.findOne({ organization: organizationId }).session(options?.session ?? null).lean(),
  updateById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    SubscriptionModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
  updateByIdIfUpdatedAt: (id: string, expectedUpdatedAt: Date, update: Record<string, unknown>, options?: DbOptions) =>
    SubscriptionModel.findOneAndUpdate(
      {
        _id: id,
        updatedAt: expectedUpdatedAt,
      },
      update,
      { new: true, session: options?.session },
    ).lean(),
  updateByOrganization: (organizationId: string, update: Record<string, unknown>, options?: DbOptions) =>
    SubscriptionModel.findOneAndUpdate({ organization: organizationId }, update, { new: true, session: options?.session }).lean(),
  adjustCreditBalanceByOrganization: (organizationId: string, delta: number, options?: DbOptions) =>
    SubscriptionModel.findOneAndUpdate(
      {
        organization: organizationId,
        ...(delta < 0 ? { creditBalance: { $gte: Math.abs(delta) } } : {}),
      },
      {
        $inc: { creditBalance: delta },
      },
      { new: true, session: options?.session },
    ).lean(),
  adjustCreditBalanceById: (id: string, delta: number, options?: DbOptions) =>
    SubscriptionModel.findOneAndUpdate(
      {
        _id: id,
        ...(delta < 0 ? { creditBalance: { $gte: Math.abs(delta) } } : {}),
      },
      {
        $inc: { creditBalance: delta },
      },
      { new: true, session: options?.session },
    ).lean(),
  findRenewalsDue: (now: Date, options?: DbOptions) =>
    SubscriptionModel.find({
      status: { $in: ['ACTIVE', 'PAST_DUE'] },
      autoRenew: true,
      $or: [{ renewalLockedUntil: null }, { renewalLockedUntil: { $lte: now } }],
      currentPeriodEnd: { $lte: now },
    }).session(options?.session ?? null).lean(),
  findTrialExpiring: (now: Date, options?: DbOptions) =>
    SubscriptionModel.find({
      status: 'TRIAL',
      trialEndsAt: { $lte: now },
    }).session(options?.session ?? null).lean(),
  findActiveForRenewal: (now: Date, options?: DbOptions) =>
    SubscriptionModel.find({
      status: 'ACTIVE',
      autoRenew: true,
      $or: [{ renewalLockedUntil: null }, { renewalLockedUntil: { $lte: now } }],
      currentPeriodEnd: { $lte: now },
    }).session(options?.session ?? null).lean(),
  claimRenewalLock: (id: string, now: Date, lockedUntil: Date, options?: DbOptions) =>
    SubscriptionModel.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['ACTIVE', 'PAST_DUE'] },
        autoRenew: true,
        currentPeriodEnd: { $lte: now },
        $or: [{ renewalLockedUntil: null }, { renewalLockedUntil: { $lte: now } }],
      },
      {
        $set: {
          renewalLockedUntil: lockedUntil,
        },
      },
      { new: true, session: options?.session },
    ).lean(),
  releaseRenewalLock: (id: string, options?: DbOptions) =>
    SubscriptionModel.findByIdAndUpdate(id, { renewalLockedUntil: null }, { new: true, session: options?.session }).lean(),
};
