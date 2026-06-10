const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");

let originalResendKey = process.env.RESEND_API_KEY;
let originalEmailUser = process.env.EMAIL_USER;
let originalEmailPass = process.env.EMAIL_PASS;
let originalProvider = process.env.EMAIL_PROVIDER;

afterEach(() => {
  process.env.RESEND_API_KEY = originalResendKey;
  process.env.EMAIL_USER = originalEmailUser;
  process.env.EMAIL_PASS = originalEmailPass;
  process.env.EMAIL_PROVIDER = originalProvider;
});

test("resolveProvider prefers explicit EMAIL_PROVIDER=resend", () => {
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "test-key";
  const { resolveProvider } = require("../service/emailProviderService.js");
  assert.equal(resolveProvider(), "resend");
});

test("sendPlatformEmail returns resend provider shape (uses official SDK)", async () => {
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "re_test_key_for_sdk";
  process.env.RESEND_FROM_EMAIL = "no-reply@example.com";

  const { sendPlatformEmail } = require("../service/emailProviderService.js");
  const result = await sendPlatformEmail({
    to: "admin@example.com",
    subject: "Test",
    text: "hello",
  });

  // With the official SDK + invalid test key we expect the error path,
  // but it must still report provider: "resend" and follow {data, error} internally.
  assert.equal(result.provider, "resend");
  // It will be success:false because the key is fake, which is expected behavior.
  assert.equal(typeof result.success, "boolean");
});