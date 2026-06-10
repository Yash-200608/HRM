const crypto = require("crypto");
const { generateAccessToken, generateRefreshToken } = require("./service.js");
const { buildAccessTokenInput, buildUserSubscriptionFields } = require("./tokenClaimsService.js");
const {
  getAccountTypeFromRole,
  issueAuthCookies,
} = require("./sessionSecurityService.js");
const { createAuthSession } = require("./authSessionService.js");
const { recordLoginSuccess } = require("./securityAuditService.js");

async function issueAuthenticatedSession(req, res, user, options = {}) {
  const accountType = options.accountType || getAccountTypeFromRole(user.role);
  const sessionId = options.sessionId || crypto.randomUUID();
  const subscriptionFields = await buildUserSubscriptionFields(user, {
    accountType,
    sessionId,
  });
  const refreshToken = generateRefreshToken({
    id: user._id,
    sessionId,
  });
  const accessToken = generateAccessToken(subscriptionFields.tokenInput);

  user.refreshToken = refreshToken;
  await user.save();

  await createAuthSession({
    userId: user._id,
    accountType,
    sessionId,
    req,
    refreshToken,
  });

  issueAuthCookies(res, { accessToken, refreshToken });

  await recordLoginSuccess(req, user, {
    sessionId,
    accountType,
    mfaUsed: Boolean(options.mfaUsed),
  });

  const userData = user.toObject();
  delete userData.password;
  delete userData.mfaSecret;
  delete userData.mfaPendingSecret;

  return {
    accessToken,
    refreshToken,
    sessionId,
    subscriptionFields,
    userData,
  };
}

module.exports = {
  issueAuthenticatedSession,
};