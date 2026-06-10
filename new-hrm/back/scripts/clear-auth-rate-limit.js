/**
 * Clear admin/employee login rate-limit counters (Redis or in-memory).
 *
 * Usage (from new-hrm/back):
 *   node scripts/clear-auth-rate-limit.js
 *   npm run clear:auth-rate-limit
 */
require("dotenv").config();
const { getRedisClient } = require("../service/redisClient.js");
const { clearRateLimitBucketsForTests } = require("../middleware/rateLimit.js");

async function clearRedisAuthLoginKeys() {
  const client = await getRedisClient();
  if (!client) {
    return 0;
  }

  const keys = [];
  for await (const key of client.scanIterator({ MATCH: "auth-login:*", COUNT: 100 })) {
    keys.push(key);
  }

  if (keys.length > 0) {
    await client.del(keys);
  }

  return keys.length;
}

async function main() {
  const deleted = await clearRedisAuthLoginKeys();
  clearRateLimitBucketsForTests();

  if (deleted > 0) {
    console.log(`Cleared ${deleted} Redis auth-login rate-limit key(s).`);
  } else {
    console.log("Cleared in-memory auth-login rate-limit buckets.");
  }

  console.log("You can retry admin login at /admin/login.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});