function createMongooseDb(mongoose) {
  const connect = (uri, options) => mongoose.connect(uri, options);
  const startSession = () => mongoose.startSession();

  const withTransaction = async (work) => {
    const session = await startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  };

  return {
    connect,
    startSession,
    withTransaction,
  };
}

module.exports = { createMongooseDb };
