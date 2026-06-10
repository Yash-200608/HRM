const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const {
  getRedisClient,
  getRedisUrl,
  redisIncrWithExpiry,
  resetRedisClientForTests,
} = require("../service/redisClient.js");
const { resolveRedisUrl } = require("../utils/resolveRedisUrl.js");

const originalRedisEnv = {
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_API_KEY: process.env.REDIS_API_KEY,
  REDIS_USERNAME: process.env.REDIS_USERNAME,
  REDIS_TLS: process.env.REDIS_TLS,
  RATE_LIMIT_USE_REDIS: process.env.RATE_LIMIT_USE_REDIS,
};

function restoreRedisEnv() {
  Object.entries(originalRedisEnv).forEach(([key, value]) => {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
  resetRedisClientForTests();
}

after(() => {
  restoreRedisEnv();
});

test("resolveRedisUrl builds a TLS connection string from host and api key", () => {
  const url = resolveRedisUrl({
    REDIS_HOST: "redis.example.com",
    REDIS_PORT: "6380",
    REDIS_API_KEY: "secret-key",
    REDIS_USERNAME: "default",
    REDIS_TLS: "true",
  });

  assert.equal(url, "rediss://default:secret-key@redis.example.com:6380");
});

test("getRedisClient returns null when redis rate limiting is disabled", async () => {
  resetRedisClientForTests();
  delete process.env.RATE_LIMIT_USE_REDIS;
  process.env.REDIS_HOST = "redis.example.com";
  process.env.REDIS_API_KEY = "secret-key";

  const client = await getRedisClient();
  assert.equal(client, null);
  assert.equal(getRedisUrl(), null);
});

test("redisIncrWithExpiry falls back when redis is unreachable", async () => {
  resetRedisClientForTests();
  process.env.RATE_LIMIT_USE_REDIS = "true";
  process.env.REDIS_URL = "redis://127.0.0.1:6399";

  const result = await redisIncrWithExpiry("test-key", 60_000);
  assert.equal(result, null);

  const secondAttempt = await getRedisClient();
  assert.equal(secondAttempt, null);
});