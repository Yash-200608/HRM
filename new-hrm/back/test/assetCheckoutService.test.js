const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  assertAssetAvailableForCheckout,
  resolveCheckoutStatus,
} = require("../service/assetCheckoutService.js");

test("resolveCheckoutStatus marks overdue open checkouts", () => {
  const overdue = resolveCheckoutStatus(
    { dueAt: new Date("2020-01-01"), returnedAt: null },
    new Date("2026-01-01")
  );
  assert.equal(overdue, "OVERDUE");

  const open = resolveCheckoutStatus(
    { dueAt: new Date("2099-01-01"), returnedAt: null },
    new Date("2026-01-01")
  );
  assert.equal(open, "OPEN");
});

test("assertAssetAvailableForCheckout rejects assigned assets", () => {
  assert.throws(
    () =>
      assertAssetAvailableForCheckout({
        _id: "asset-1",
        status: "ASSIGNED",
        assignedTo: "employee-1",
      }),
    (error) => {
      assert.equal(error.status, 409);
      return true;
    }
  );
});