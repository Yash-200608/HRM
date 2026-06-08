type MongooseLike = {
  connect: (...args: any[]) => Promise<any>;
  startSession: (...args: any[]) => Promise<any>;
};

export function createMongooseDb<TMongoose extends MongooseLike>(mongooseInstance: TMongoose): {
  connect: TMongoose['connect'];
  startSession: TMongoose['startSession'];
  withTransaction<T>(work: (session: Awaited<ReturnType<TMongoose['startSession']>>) => Promise<T>): Promise<T>;
};
