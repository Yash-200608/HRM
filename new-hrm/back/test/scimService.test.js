const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  buildScimUser,
  hashScimToken,
  getSchemaById,
  SCIM_USER_SCHEMA,
} = require("../service/scimService.js");

test("buildScimUser maps employee fields to SCIM core schema", () => {
  const employee = {
    _id: "64f1c2ab3d9e4f5a6b7c8d90",
    fullName: "Jane Doe",
    email: "jane@example.com",
    employeeId: "EMP-001",
    scimExternalId: "idp-jane",
    designation: "Engineer",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  };

  const scimUser = buildScimUser(employee);

  assert.equal(scimUser.schemas[0], SCIM_USER_SCHEMA);
  assert.equal(scimUser.id, employee._id);
  assert.equal(scimUser.externalId, "idp-jane");
  assert.equal(scimUser.userName, "jane@example.com");
  assert.equal(scimUser.active, true);
  assert.equal(scimUser.name.givenName, "Jane");
  assert.equal(scimUser.name.familyName, "Doe");
});

test("hashScimToken is deterministic for the same token", () => {
  process.env.API_KEY_PEPPER = "test-pepper";
  const first = hashScimToken("scim_test_token");
  const second = hashScimToken("scim_test_token");
  assert.equal(first, second);
  assert.notEqual(first, hashScimToken("scim_other_token"));
});

test("getSchemaById returns the core User schema", () => {
  const schema = getSchemaById(SCIM_USER_SCHEMA);
  assert.equal(schema.id, SCIM_USER_SCHEMA);
  assert.equal(schema.name, "User");
});