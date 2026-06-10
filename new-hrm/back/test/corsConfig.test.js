const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const {
  resolveAllowedOrigins,
  createCorsOptions,
} = require("../config/corsConfig.js");

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test("resolveAllowedOrigins uses CORS_ALLOWED_ORIGINS when configured", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com,https://admin.example.com";

  assert.deepEqual(resolveAllowedOrigins(), [
    "https://app.example.com",
    "https://admin.example.com",
  ]);
});

test("createCorsOptions rejects unknown origins in production", async () => {
  process.env.NODE_ENV = "production";
  process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com";

  const options = createCorsOptions();

  await new Promise((resolve, reject) => {
    options.origin("https://evil.example.com", (err, result) => {
      try {
        assert.ok(err);
        assert.notEqual(result, true);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
});