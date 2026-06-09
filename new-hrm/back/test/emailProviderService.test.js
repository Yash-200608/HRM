const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");

let originalFetch = global.fetch;
let originalResendKey = process.env.RESEND_API_KEY;
let originalEmailUser = process.env.EMAIL_USER;
let originalEmailPass = process.env.EMAIL_PASS;
let originalProvider = process.env.EMAIL_PROVIDER;

afterEach(() => {
  global.fetch = originalFetch;
  process.env.RESEND_API_KEY = originalResendKey;
  process.env.EMAIL_USER = originalEmailUser;
  process.env.EMAIL_PASS = originalEmailPass;
  process.env.EMAIL_PROVIDER = originalProvider;
});

test("resolveProvider prefers explicit EMAIL_PROVIDER", () => {
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "test-key";
  const { resolveProvider } = require("../service/emailProviderService.js");
  assert.equal(resolveProvider(), "resend");
});

test("sendPlatformEmail uses Resend when configured", async () => {
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "no-reply@example.com";

  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  };

  const { sendPlatformEmail } = require("../service/emailProviderService.js");
  const result = await sendPlatformEmail({
    to: "admin@example.com",
    subject: "Test",
    text: "hello",
  });

  assert.equal(result.success, true);
  assert.equal(result.provider, "resend");
  assert.equal(calls[0].url, "https://api.resend.com/emails");
});