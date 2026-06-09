import mongoose from 'mongoose';
import { createMongooseDb } from '../../../packages/shared-db/src/mongoose-session.mjs';
import { env } from './env';
import { logger } from './logger';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';

const db = createMongooseDb(mongoose);

async function assertTransactionSupport() {
  if (!mongoose.connection.db) {
    throw new AppError('MongoDB connection missing database handle', 500, ErrorCodes.InternalServerError);
  }

  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  const supportsTransactions = typeof hello.setName === 'string' || hello.msg === 'isdbgrid';
  const hasSessionTimeout = typeof hello.logicalSessionTimeoutMinutes === 'number';

  if (!supportsTransactions || !hasSessionTimeout) {
    throw new AppError('MongoDB replica set or sharded cluster with session support is required', 500, ErrorCodes.InternalServerError);
  }
}

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await db.connect(env.MONGODB_URI, {
    autoIndex: true,
  });
  await assertTransactionSupport();
  logger.info('mongo_connected');
}
