import type { ClientSession } from 'mongoose';
import { IdempotencyRecordModel } from './idempotency.model';

type DbOptions = { session?: ClientSession };

export const idempotencyRepository = {
  findByScopeAndKey: (scope: string, key: string) => IdempotencyRecordModel.findOne({ scope, key }).lean(),
  create: (payload: Record<string, unknown>, options?: DbOptions) => IdempotencyRecordModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  complete: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    IdempotencyRecordModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
  fail: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    IdempotencyRecordModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
};
