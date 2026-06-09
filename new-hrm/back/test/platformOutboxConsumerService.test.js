const assert = require("node:assert/strict");
const crypto = require("crypto");
const { afterEach, before, test } = require("node:test");

let originalSecret = process.env.OUTBOX_DELIVERY_SECRET;

before(() => {
  process.env.OUTBOX_DELIVERY_SECRET = "outbox-test-secret";
});

afterEach(() => {
  process.env.OUTBOX_DELIVERY_SECRET = originalSecret;
});

function signBody(body) {
  return crypto.createHmac("sha256", process.env.OUTBOX_DELIVERY_SECRET).update(body).digest("hex");
}

test("verifyOutboxSignature validates HMAC signatures", () => {
  const { verifyOutboxSignature } = require("../service/platformOutboxConsumerService.js");
  const body = JSON.stringify({ eventId: "evt-1", topic: "invoice.paid" });

  assert.equal(verifyOutboxSignature(body, signBody(body)), true);
  assert.equal(verifyOutboxSignature(body, "invalid"), false);
});

test("consumePlatformOutboxEvent rejects invalid signatures", async () => {
  const { consumePlatformOutboxEvent } = require("../service/platformOutboxConsumerService.js");
  const body = JSON.stringify({
    eventId: "evt-bad-signature",
    topic: "invoice.paid",
    organizationId: "org-1",
    payload: { invoiceId: "inv-1" },
  });

  await assert.rejects(
    () => consumePlatformOutboxEvent(body, { "x-outbox-signature": "bad" }),
    (error) => {
      assert.equal(error.status, 401);
      return true;
    }
  );
});

test("consumePlatformOutboxEvent rejects unsupported payloads", async () => {
  const { consumePlatformOutboxEvent } = require("../service/platformOutboxConsumerService.js");
  const body = JSON.stringify({ topic: "invoice.paid" });

  await assert.rejects(
    () => consumePlatformOutboxEvent(body, { "x-outbox-signature": signBody(body) }),
    (error) => {
      assert.equal(error.status, 400);
      return true;
    }
  );
});