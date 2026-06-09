const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  hashResetToken,
  buildResetUrl,
  SUPPORTED_ACCOUNT_TYPES,
} = require("../service/passwordResetService.js");

test("hashResetToken is deterministic", () => {
  const first = hashResetToken("reset-token-123");
  const second = hashResetToken("reset-token-123");
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("buildResetUrl encodes token for frontend reset route", () => {
  const url = buildResetUrl("abc+token/value");
  assert.match(url, /\/reset-password\?token=/);
  assert.ok(url.includes(encodeURIComponent("abc+token/value")));
});

test("supported account types include admin employee and super_admin", () => {
  assert.equal(SUPPORTED_ACCOUNT_TYPES.has("admin"), true);
  assert.equal(SUPPORTED_ACCOUNT_TYPES.has("employee"), true);
  assert.equal(SUPPORTED_ACCOUNT_TYPES.has("super_admin"), true);
});