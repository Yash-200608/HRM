const { redisIncrWithExpiry } = require("../service/redisClient.js");

const buckets = new Map();

function isLocalDevRequest(req) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const ip = String(req.ip || req.socket?.remoteAddress || "").trim();
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.endsWith("127.0.0.1")
  );
}

function pruneExpiredBuckets(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function incrementMemoryBucket(key, windowMs, now) {
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket;
}

function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = "Too many requests, please try again later",
  keyFn = (req) => req.ip || req.socket?.remoteAddress || "unknown",
  prefix = "rate-limit",
  skipLocalDev = false,
} = {}) {
  return async (req, res, next) => {
    if (skipLocalDev && isLocalDevRequest(req)) {
      return next();
    }

    const now = Date.now();
    pruneExpiredBuckets(now);

    const key = `${prefix}:${keyFn(req)}`;
    let bucket = null;

    try {
      const redisBucket = await redisIncrWithExpiry(key, windowMs);
      if (redisBucket) {
        bucket = redisBucket;
      }
    } catch (error) {
      console.error("Redis rate limiter error:", error.message);
    }

    if (!bucket) {
      bucket = incrementMemoryBucket(key, windowMs, now);
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      return res.status(429).json({ message });
    }

    return next();
  };
}

const authLoginLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  message: "Too many login attempts, please try again later",
  prefix: "auth-login",
  skipLocalDev: true,
});

const passwordResetLimiter = createRateLimiter({
  windowMs: Number(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || 5),
  message: "Too many password reset requests, please try again later",
  prefix: "password-reset",
});

function clearRateLimitBucketsForTests() {
  buckets.clear();
}

module.exports = {
  authLoginLimiter,
  clearRateLimitBucketsForTests,
  createRateLimiter,
  passwordResetLimiter,
};