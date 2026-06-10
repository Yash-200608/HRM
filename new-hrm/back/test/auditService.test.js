const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  buildContentHash,
  resolveAuditChainState,
} = require("../service/auditService.js");
const AuditEvent = require("../models/personalOffice/auditEventModel.js");

test("buildContentHash chains previous hash and sequence number", () => {
  const hash = buildContentHash(
    {
      action: "auth.login.success",
      actorId: "user-1",
    },
    { sequenceNumber: 2, previousHash: "abc123" }
  );

  assert.equal(typeof hash, "string");
  assert.equal(hash.length, 64);
});

test("audit event schema blocks updates and deletes", async () => {
  await assert.rejects(
    () => AuditEvent.updateOne({}, { action: "tampered" }),
    /append-only/i
  );
  await assert.rejects(
    () => AuditEvent.deleteMany({}),
    /append-only/i
  );
});

test("resolveAuditChainState starts at sequence 1 without prior events", async () => {
  const originalFindOne = AuditEvent.findOne;
  AuditEvent.findOne = () => ({
    sort: () => ({
      select: () => ({
        lean: async () => null,
      }),
    }),
  });

  try {
    const chain = await resolveAuditChainState();
    assert.deepEqual(chain, { sequenceNumber: 1, previousHash: null });
  } finally {
    AuditEvent.findOne = originalFindOne;
  }
});