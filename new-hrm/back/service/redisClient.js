const { resolveRedisUrl } = require("../utils/resolveRedisUrl.js");

let redisClient = null;
let redisReady = false;
let redisFailed = false;
let connectPromise = null;
let hasLoggedRedisFallback = false;

function isRedisRateLimitEnabled() {
  const flag = String(process.env.RATE_LIMIT_USE_REDIS || "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

function getRedisUrl() {
  if (!isRedisRateLimitEnabled()) {
    return null;
  }

  const explicitOverride = String(process.env.RATE_LIMIT_REDIS_URL || "").trim();
  if (explicitOverride) {
    return explicitOverride;
  }

  return resolveRedisUrl(process.env);
}

function logRedisFallback(reason) {
  if (hasLoggedRedisFallback) {
    return;
  }

  hasLoggedRedisFallback = true;
  const detail = reason ? `: ${reason}` : "";
  console.warn(`Redis unavailable, using in-memory rate limiting${detail}`);
}

async function destroyRedisClient() {
  if (!redisClient) {
    return;
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  } catch (error) {
    // ignore disconnect errors during fallback
  }

  redisClient = null;
  redisReady = false;
}

function markRedisUnavailable(reason) {
  redisFailed = true;
  redisReady = false;
  connectPromise = null;
  logRedisFallback(reason);
  return destroyRedisClient();
}

async function getRedisClient() {
  if (redisFailed || !getRedisUrl()) {
    return null;
  }

  if (redisClient && redisReady) {
    return redisClient;
  }

  if (connectPromise) {
    await connectPromise;
    return redisReady ? redisClient : null;
  }

  connectPromise = (async () => {
    try {
      const { createClient } = require("redis");
      const client = createClient({
        url: getRedisUrl(),
        socket: {
          reconnectStrategy: () => false,
        },
      });

      client.on("error", (error) => {
        markRedisUnavailable(error?.message || "connection error");
      });

      await client.connect();
      redisClient = client;
      redisReady = true;
      return redisClient;
    } catch (error) {
      await markRedisUnavailable(error?.message || "connection refused");
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  await connectPromise;
  return redisReady ? redisClient : null;
}

async function redisIncrWithExpiry(key, windowMs) {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    const count = await client.incr(key);
    if (count === 1) {
      await client.pExpire(key, windowMs);
    }

    const ttlMs = await client.pTTL(key);
    return {
      count,
      resetAt: Date.now() + Math.max(ttlMs, 0),
    };
  } catch (error) {
    await markRedisUnavailable(error?.message || "command failed");
    return null;
  }
}

function resetRedisClientForTests() {
  redisClient = null;
  redisReady = false;
  redisFailed = false;
  connectPromise = null;
  hasLoggedRedisFallback = false;
}

module.exports = {
  getRedisClient,
  getRedisUrl,
  redisIncrWithExpiry,
  resetRedisClientForTests,
};