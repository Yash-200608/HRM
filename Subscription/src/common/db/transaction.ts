import mongoose from 'mongoose';
import { createMongooseDb } from '../../../../packages/shared-db/src/mongoose-session.mjs';

const db = createMongooseDb(mongoose);

export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>) {
  return db.withTransaction(fn);
}

export const startSession = db.startSession;
