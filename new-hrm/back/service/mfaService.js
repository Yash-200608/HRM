const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { generateSecret, generateSync, verifySync, generateURI } = require("otplib");
const { Admin } = require("../models/personalOffice/authModel.js");
const { SuperAdmin } = require("../models/personalOffice/superadminModel.js");

const MFA_ISSUER = process.env.MFA_ISSUER || "HRM Platform";
const MFA_CHALLENGE_TTL = process.env.MFA_CHALLENGE_TTL || "5m";
const MFA_RECOVERY_CODE_COUNT = Number(process.env.MFA_RECOVERY_CODE_COUNT || 10);
const SUPPORTED_MFA_ROLES = new Set(["admin", "super_admin"]);

function isMfaRole(role) {
  return SUPPORTED_MFA_ROLES.has(role);
}

async function resolveMfaAccount(role, userId) {
  if (role === "super_admin") {
    return SuperAdmin.findById(userId).select("+mfaSecret +mfaPendingSecret +mfaRecoveryCodeHashes");
  }

  if (role === "admin") {
    return Admin.findById(userId).select("+mfaSecret +mfaPendingSecret +mfaRecoveryCodeHashes");
  }

  return null;
}

function hashRecoveryCode(code) {
  const pepper = process.env.API_KEY_PEPPER || process.env.AUTH_TOKEN_PEPPER || "";
  return crypto.createHash("sha256").update(`${pepper}:${String(code).trim().toLowerCase()}`).digest("hex");
}

function normalizeRecoveryCode(code) {
  return String(code || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isTotpCode(code) {
  return /^\d{6}$/.test(String(code || "").trim());
}

function generateRecoveryCodes(count = MFA_RECOVERY_CODE_COUNT) {
  const codes = [];
  for (let index = 0; index < count; index += 1) {
    const raw = crypto.randomBytes(4).toString("hex");
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

function buildRecoveryCodeHashes(codes) {
  return codes.map((code) => hashRecoveryCode(code));
}

async function assignRecoveryCodes(account) {
  const recoveryCodes = generateRecoveryCodes();
  account.mfaRecoveryCodeHashes = buildRecoveryCodeHashes(recoveryCodes);
  await account.save();
  return recoveryCodes;
}

function consumeRecoveryCode(account, code) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) {
    return false;
  }

  const hashed = hashRecoveryCode(normalized);
  const index = (account.mfaRecoveryCodeHashes || []).indexOf(hashed);
  if (index === -1) {
    return false;
  }

  account.mfaRecoveryCodeHashes.splice(index, 1);
  return true;
}

function buildOtpAuthUrl(email, secret) {
  return generateURI({
    issuer: MFA_ISSUER,
    label: email,
    secret,
  });
}

function verifyTotpCode(secret, code) {
  const result = verifySync({ secret, token: String(code), window: 1 });
  return Boolean(result?.valid);
}

async function beginMfaSetup(user) {
  if (!isMfaRole(user.role)) {
    const error = new Error("MFA is only available for admin accounts");
    error.status = 403;
    throw error;
  }

  const account = await resolveMfaAccount(user.role, user.id || user._id);
  if (!account) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }

  const pendingSecret = generateSecret();
  account.mfaPendingSecret = pendingSecret;
  await account.save();

  return {
    secret: pendingSecret,
    otpauthUrl: buildOtpAuthUrl(account.email, pendingSecret),
    issuer: MFA_ISSUER,
  };
}

async function enableMfa(user, code) {
  const account = await resolveMfaAccount(user.role, user.id || user._id);
  if (!account?.mfaPendingSecret) {
    const error = new Error("MFA setup has not been started");
    error.status = 400;
    throw error;
  }

  const valid = verifyTotpCode(account.mfaPendingSecret, code);
  if (!valid) {
    const error = new Error("Invalid MFA code");
    error.status = 400;
    throw error;
  }

  account.mfaSecret = account.mfaPendingSecret;
  account.mfaPendingSecret = null;
  account.mfaEnabled = true;
  account.mfaEnrolledAt = new Date();
  const recoveryCodes = generateRecoveryCodes();
  account.mfaRecoveryCodeHashes = buildRecoveryCodeHashes(recoveryCodes);
  await account.save();

  return { enabled: true, recoveryCodes };
}

async function disableMfa(user, code) {
  const account = await resolveMfaAccount(user.role, user.id || user._id);
  if (!account?.mfaEnabled || !account.mfaSecret) {
    const error = new Error("MFA is not enabled");
    error.status = 400;
    throw error;
  }

  const valid = verifyTotpCode(account.mfaSecret, code);
  if (!valid) {
    const error = new Error("Invalid MFA code");
    error.status = 400;
    throw error;
  }

  account.mfaEnabled = false;
  account.mfaSecret = null;
  account.mfaPendingSecret = null;
  account.mfaRecoveryCodeHashes = [];
  account.mfaEnrolledAt = null;
  await account.save();

  return { enabled: false };
}

async function regenerateRecoveryCodes(user, code) {
  const account = await resolveMfaAccount(user.role, user.id || user._id);
  if (!account?.mfaEnabled || !account.mfaSecret) {
    const error = new Error("MFA is not enabled");
    error.status = 400;
    throw error;
  }

  const valid = verifyTotpCode(account.mfaSecret, code);
  if (!valid) {
    const error = new Error("Invalid MFA code");
    error.status = 400;
    throw error;
  }

  const recoveryCodes = await assignRecoveryCodes(account);
  return { recoveryCodes, remainingCount: recoveryCodes.length };
}

function issueMfaChallengeToken(account) {
  return jwt.sign(
    {
      purpose: "mfa_challenge",
      userId: String(account._id),
      role: account.role,
      email: account.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: MFA_CHALLENGE_TTL }
  );
}

function verifyMfaChallengeToken(token) {
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  if (decoded.purpose !== "mfa_challenge") {
    throw new Error("Invalid MFA challenge token");
  }
  return decoded;
}

async function buildMfaLoginChallenge(account) {
  return {
    mfaRequired: true,
    mfaChallengeToken: issueMfaChallengeToken(account),
    accountType: account.role,
    email: account.email,
  };
}

async function completeMfaLogin(challengeToken, code) {
  const decoded = verifyMfaChallengeToken(challengeToken);
  const account = await resolveMfaAccount(decoded.role, decoded.userId);

  if (!account?.mfaEnabled || !account.mfaSecret) {
    const error = new Error("MFA is not enabled for this account");
    error.status = 400;
    throw error;
  }

  if (isTotpCode(code)) {
    const valid = verifyTotpCode(account.mfaSecret, code);
    if (!valid) {
      const error = new Error("Invalid MFA code");
      error.status = 401;
      throw error;
    }
    return account;
  }

  const consumed = consumeRecoveryCode(account, code);
  if (!consumed) {
    const error = new Error("Invalid MFA code or recovery code");
    error.status = 401;
    throw error;
  }

  await account.save();
  return account;
}

function shouldRequireMfa(account) {
  return Boolean(account?.mfaEnabled && account?.mfaSecret && isMfaRole(account.role));
}

module.exports = {
  SUPPORTED_MFA_ROLES,
  MFA_RECOVERY_CODE_COUNT,
  beginMfaSetup,
  buildMfaLoginChallenge,
  buildRecoveryCodeHashes,
  completeMfaLogin,
  consumeRecoveryCode,
  disableMfa,
  enableMfa,
  generateRecoveryCodes,
  hashRecoveryCode,
  isMfaRole,
  isTotpCode,
  regenerateRecoveryCodes,
  shouldRequireMfa,
};