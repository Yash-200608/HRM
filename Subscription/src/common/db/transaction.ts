import mongoose from 'mongoose';

export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>) {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
