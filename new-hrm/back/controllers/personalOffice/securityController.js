const jwt = require("jsonwebtoken");
const {
  requestPasswordReset,
  confirmPasswordReset,
} = require("../../service/passwordResetService.js");
const {
  beginMfaSetup,
  beginMfaSetupForEnrollment,
  enableMfa,
  enableMfaForEnrollment,
  disableMfa,
  completeMfaLogin,
  buildMfaLoginChallenge,
  regenerateRecoveryCodes,
} = require("../../service/mfaService.js");
const { getAccountTypeFromRole } = require("../../service/sessionSecurityService.js");
const { buildComplianceExport } = require("../../service/complianceExportService.js");
const { issueAuthenticatedSession } = require("../../service/authLoginService.js");
const { recordSecurityAudit } = require("../../service/securityAuditService.js");

async function requestPasswordResetHandler(req, res) {
  try {
    const result = await requestPasswordReset({
      email: req.body?.email,
      accountType: req.body?.accountType,
      requestedIp: req.ip,
      correlationId: req.correlationId,
    });

    return res.status(200).json({
      message: "If the account exists, a reset email has been sent.",
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Password reset request failed" });
  }
}

async function confirmPasswordResetHandler(req, res) {
  try {
    const result = await confirmPasswordReset({
      token: req.body?.token,
      newPassword: req.body?.newPassword,
      correlationId: req.correlationId,
    });

    return res.status(200).json({
      message: "Password reset successful",
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Password reset failed" });
  }
}

async function setupMfaHandler(req, res) {
  try {
    const result = await beginMfaSetup(req.user);
    return res.status(200).json({ data: result });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "MFA setup failed" });
  }
}

async function enableMfaHandler(req, res) {
  try {
    const result = await enableMfa(req.user, req.body?.code);
    await recordSecurityAudit("auth.mfa.enabled", req, {
      resourceType: "account",
      resourceId: req.user?.id,
    });
    return res.status(200).json({ message: "MFA enabled", data: result });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "MFA enable failed" });
  }
}

async function disableMfaHandler(req, res) {
  try {
    const result = await disableMfa(req.user, req.body?.code);
    await recordSecurityAudit("auth.mfa.disabled", req, {
      resourceType: "account",
      resourceId: req.user?.id,
    });
    return res.status(200).json({ message: "MFA disabled", data: result });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "MFA disable failed" });
  }
}

async function regenerateRecoveryCodesHandler(req, res) {
  try {
    const result = await regenerateRecoveryCodes(req.user, req.body?.code);
    return res.status(200).json({
      message: "Recovery codes regenerated",
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Recovery code regeneration failed" });
  }
}

async function setupMfaEnrollmentHandler(req, res) {
  try {
    const result = await beginMfaSetupForEnrollment(req.body?.mfaEnrollmentToken);
    return res.status(200).json({ data: result });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "MFA enrollment session expired. Please login again." });
    }

    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "MFA setup failed" });
  }
}

async function enableMfaEnrollmentHandler(req, res) {
  try {
    const { account, recoveryCodes } = await enableMfaForEnrollment(
      req.body?.mfaEnrollmentToken,
      req.body?.code
    );
    const session = await issueAuthenticatedSession(req, res, account, {
      accountType: getAccountTypeFromRole(account.role),
      mfaUsed: true,
    });

    await recordSecurityAudit("auth.mfa.enabled", req, {
      resourceType: "account",
      resourceId: account._id,
      metadata: { source: "login_enrollment" },
    });

    return res.status(200).json({
      message: "MFA enabled",
      accessToken: session.accessToken,
      user: {
        ...session.userData,
        role: account.role,
        fullName: session.userData.username || session.userData.fullName,
        entitlements: session.subscriptionFields.entitlements,
        subscriptionPlan: session.subscriptionFields.subscriptionPlan,
      },
      data: {
        recoveryCodes,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "MFA enrollment session expired. Please login again." });
    }

    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "MFA enable failed" });
  }
}

async function verifyMfaLoginHandler(req, res) {
  try {
    const account = await completeMfaLogin(req.body?.mfaChallengeToken, req.body?.code);
    const session = await issueAuthenticatedSession(req, res, account, {
      accountType: getAccountTypeFromRole(account.role),
      mfaUsed: true,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken: session.accessToken,
      user: {
        ...session.userData,
        role: account.role,
        fullName: session.userData.username || session.userData.fullName,
        entitlements: session.subscriptionFields.entitlements,
        subscriptionPlan: session.subscriptionFields.subscriptionPlan,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "MFA challenge expired. Please login again." });
    }

    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "MFA verification failed" });
  }
}

async function exportComplianceHandler(req, res) {
  try {
    let organizationId = req.user?.companyId || null;

    if (req.user?.role === "super_admin") {
      organizationId = req.query?.companyId || req.query?.organizationId || organizationId;
    }

    if (!organizationId) {
      return res.status(400).json({ message: "organizationId is required" });
    }

    if (req.user?.role === "admin" && String(organizationId) !== String(req.user.companyId)) {
      return res.status(403).json({ message: "Cannot export another organization's compliance pack" });
    }

    const payload = await buildComplianceExport(organizationId, {
      actorId: req.user?.id,
      actorRole: req.user?.role,
      correlationId: req.correlationId,
    });

    res.setHeader("content-type", "application/json");
    res.setHeader(
      "content-disposition",
      `attachment; filename="compliance-export-${organizationId}.json"`
    );

    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Compliance export failed" });
  }
}

module.exports = {
  requestPasswordResetHandler,
  confirmPasswordResetHandler,
  setupMfaHandler,
  enableMfaHandler,
  disableMfaHandler,
  regenerateRecoveryCodesHandler,
  setupMfaEnrollmentHandler,
  enableMfaEnrollmentHandler,
  verifyMfaLoginHandler,
  exportComplianceHandler,
  buildMfaLoginChallenge,
};