const assert = require("node:assert/strict");
const { test } = require("node:test");
const { generateSecret, generateSync, verifySync } = require("otplib");
const {
  isMfaRole,
  SUPPORTED_MFA_ROLES,
  shouldRequireMfa,
  assessMfaAtLogin,
  isMfaEnrollmentRequired,
  generateRecoveryCodes,
  hashRecoveryCode,
  consumeRecoveryCode,
  isTotpCode,
  buildRecoveryCodeHashes,
} = require("../service/mfaService.js");

test("isMfaRole allows admin and super_admin only", () => {
  assert.equal(isMfaRole("admin"), true);
  assert.equal(isMfaRole("super_admin"), true);
  assert.equal(isMfaRole("employee"), false);
  assert.equal(SUPPORTED_MFA_ROLES.has("admin"), true);
});

test("isMfaEnrollmentRequired is true when mandatory policy enabled and MFA not enrolled", () => {
  const original = process.env.REQUIRE_ADMIN_MFA;
  process.env.REQUIRE_ADMIN_MFA = "true";

  assert.equal(
    isMfaEnrollmentRequired({ role: "admin", mfaEnabled: false }),
    true
  );
  assert.equal(
    isMfaEnrollmentRequired({ role: "admin", mfaEnabled: true }),
    false
  );

  process.env.REQUIRE_ADMIN_MFA = original;
});

test("assessMfaAtLogin reports enrollment and challenge states", () => {
  const original = process.env.REQUIRE_ADMIN_MFA;
  process.env.REQUIRE_ADMIN_MFA = "true";

  assert.equal(
    assessMfaAtLogin({ role: "admin", mfaEnabled: false }).status,
    "enrollment_required"
  );
  assert.equal(
    assessMfaAtLogin({
      role: "admin",
      mfaEnabled: true,
      mfaSecret: "SECRET",
    }).status,
    "challenge_required"
  );

  process.env.REQUIRE_ADMIN_MFA = original;
});

test("shouldRequireMfa requires enabled secret and supported role", () => {
  assert.equal(
    shouldRequireMfa({ role: "admin", mfaEnabled: true, mfaSecret: "SECRET" }),
    true
  );
  assert.equal(
    shouldRequireMfa({ role: "employee", mfaEnabled: true, mfaSecret: "SECRET" }),
    false
  );
  assert.equal(
    shouldRequireMfa({ role: "admin", mfaEnabled: false, mfaSecret: "SECRET" }),
    false
  );
});

test("otplib verifies generated TOTP codes", () => {
  const secret = generateSecret();
  const token = generateSync({ secret });
  assert.equal(verifySync({ secret, token }).valid, true);
});

test("generateRecoveryCodes returns formatted one-time codes", () => {
  const codes = generateRecoveryCodes(3);
  assert.equal(codes.length, 3);
  codes.forEach((code) => assert.match(code, /^[a-f0-9]{4}-[a-f0-9]{4}$/));
});

test("consumeRecoveryCode removes a matching hash once", () => {
  process.env.API_KEY_PEPPER = "test-pepper";
  const codes = ["abcd-efgh"];
  const account = { mfaRecoveryCodeHashes: buildRecoveryCodeHashes(codes) };

  assert.equal(consumeRecoveryCode(account, "abcd-efgh"), true);
  assert.equal(account.mfaRecoveryCodeHashes.length, 0);
  assert.equal(consumeRecoveryCode(account, "abcd-efgh"), false);
});

test("isTotpCode distinguishes authenticator and recovery codes", () => {
  assert.equal(isTotpCode("123456"), true);
  assert.equal(isTotpCode("abcd-efgh"), false);
  assert.equal(hashRecoveryCode("abcd-efgh"), hashRecoveryCode("ABCD-EFGH"));
});