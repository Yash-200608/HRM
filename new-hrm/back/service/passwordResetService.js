const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { Admin } = require("../models/personalOffice/authModel.js");
const { Employee } = require("../models/personalOffice/employeeModel.js");
const { SuperAdmin } = require("../models/personalOffice/superadminModel.js");
const PasswordResetToken = require("../models/personalOffice/passwordResetTokenModel.js");
const { sendPlatformEmail } = require("./emailProviderService.js");
const { recordAuditEvent } = require("./auditService.js");

const RESET_TOKEN_TTL_MS = Number(process.env.PASSWORD_RESET_TTL_MS || 60 * 60 * 1000);
const SUPPORTED_ACCOUNT_TYPES = new Set(["admin", "employee", "super_admin"]);

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token) {
  const frontendBase =
    process.env.HRM_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:8080";
  return `${frontendBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

async function findAccountByEmail(accountType, email) {
  if (accountType === "super_admin") {
    return SuperAdmin.findOne({ email: email.toLowerCase() }).select("+password");
  }

  if (accountType === "admin") {
    return Admin.findOne({ email: email.toLowerCase() }).select("+password");
  }

  return Employee.findOne({ email: email.toLowerCase() }).select("+password");
}

async function requestPasswordReset(input) {
  const email = String(input.email || "").trim().toLowerCase();
  const accountType = String(input.accountType || "admin").trim().toLowerCase();

  if (!email) {
    const error = new Error("Email is required");
    error.status = 400;
    throw error;
  }

  if (!SUPPORTED_ACCOUNT_TYPES.has(accountType)) {
    const error = new Error("Invalid account type");
    error.status = 400;
    throw error;
  }

  const user = await findAccountByEmail(accountType, email);

  // Always return success shape to avoid account enumeration.
  if (!user || mongoose.connection.readyState !== 1) {
    return {
      accepted: true,
      delivered: false,
      reason: user ? "db_unavailable" : "account_not_found",
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await PasswordResetToken.updateMany(
    { userId: user._id, accountType, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  await PasswordResetToken.create({
    email,
    accountType,
    userId: user._id,
    tokenHash,
    expiresAt,
    requestedIp: input.requestedIp || null,
    correlationId: input.correlationId || null,
  });

  const resetUrl = buildResetUrl(rawToken);
  const emailResult = await sendPlatformEmail({
    to: email,
    subject: "Reset your HRM password",
    text: `Use this link to reset your password: ${resetUrl}`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 60 minutes.</p>`,
  });

  await recordAuditEvent({
    actorId: String(user._id),
    actorRole: accountType,
    companyId: user.companyId ? String(user.companyId) : user.createdBy ? String(user.createdBy) : null,
    action: "auth.password_reset.requested",
    resourceType: "Account",
    resourceId: String(user._id),
    metadata: {
      email,
      emailDelivered: emailResult.success,
      provider: emailResult.provider,
    },
    correlationId: input.correlationId || null,
  });

  return {
    accepted: true,
    delivered: emailResult.success,
    provider: emailResult.provider,
  };
}

async function confirmPasswordReset(input) {
  const token = String(input.token || "").trim();
  const newPassword = String(input.newPassword || "");

  if (!token || !newPassword) {
    const error = new Error("Token and newPassword are required");
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.status = 400;
    throw error;
  }

  if (mongoose.connection.readyState !== 1) {
    const error = new Error("Password reset storage unavailable");
    error.status = 503;
    throw error;
  }

  const tokenHash = hashResetToken(token);
  const resetRecord = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    const error = new Error("Invalid or expired reset token");
    error.status = 400;
    throw error;
  }

  const user = await findAccountByEmail(resetRecord.accountType, resetRecord.email);
  if (!user) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.sessionInvalidatedAt = new Date();
  user.refreshToken = null;
  await user.save();

  resetRecord.usedAt = new Date();
  await resetRecord.save();

  await recordAuditEvent({
    actorId: String(user._id),
    actorRole: resetRecord.accountType,
    companyId: user.companyId ? String(user.companyId) : user.createdBy ? String(user.createdBy) : null,
    action: "auth.password_reset.completed",
    resourceType: "Account",
    resourceId: String(user._id),
    metadata: {
      email: resetRecord.email,
    },
    correlationId: input.correlationId || null,
  });

  return {
    accountType: resetRecord.accountType,
    userId: String(user._id),
  };
}

module.exports = {
  SUPPORTED_ACCOUNT_TYPES,
  buildResetUrl,
  confirmPasswordReset,
  hashResetToken,
  requestPasswordReset,
};