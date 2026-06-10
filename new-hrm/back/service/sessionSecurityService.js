const jwt = require("jsonwebtoken");
const { Admin } = require("../models/personalOffice/authModel.js");
const { Employee } = require("../models/personalOffice/employeeModel.js");
const { SuperAdmin } = require("../models/personalOffice/superadminModel.js");

const REFRESH_TOKEN_COOKIE = "refreshToken";
const ACCESS_TOKEN_COOKIE = "accessToken";
const OAUTH_SESSION_COOKIE = "hrm_oauth_session";

const defaultModels = {
  admin: Admin,
  employee: Employee,
  super_admin: SuperAdmin,
};

const clearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const accessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: resolveAccessTokenMaxAgeMs(),
});

function resolveAccessTokenMaxAgeMs() {
  const configured = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
  const match = String(configured).trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 15 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}

const getAccessTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (cookieToken) {
    return cookieToken;
  }

  return getBearerToken(req);
};

const setAccessTokenCookie = (res, accessToken) => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, clearCookieOptions());
};

const issueAuthCookies = (res, { accessToken, refreshToken }) => {
  if (refreshToken) {
    setRefreshTokenCookie(res, refreshToken);
  }
  if (accessToken) {
    setAccessTokenCookie(res, accessToken);
  }
};

const getBearerToken = (req) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.split(" ")[1] || "";
};

const getAccountTypeFromRole = (role) => {
  if (role === "employee") {
    return "employee";
  }
  if (role === "super_admin") {
    return "super_admin";
  }
  return "admin";
};

const revokeRefreshToken = async (refreshToken, models = defaultModels) => {
  if (!refreshToken) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const results = await Promise.all(
    Object.values(models).map((model) => model.updateMany({ refreshToken }, { $set: { refreshToken: null } })),
  );

  return results.reduce(
    (total, result) => ({
      matchedCount: total.matchedCount + (result.matchedCount || result.n || 0),
      modifiedCount: total.modifiedCount + (result.modifiedCount || result.nModified || 0),
    }),
    { matchedCount: 0, modifiedCount: 0 },
  );
};

const revokeAccountRefreshToken = async ({ userId, role }, models = defaultModels) => {
  if (!userId) {
    return null;
  }

  const accountType = getAccountTypeFromRole(role);
  const model = models[accountType];
  if (!model) {
    return null;
  }

  return model.findByIdAndUpdate(userId, { $set: { refreshToken: null } });
};

const { isTokenVersionStale } = require("@hrm-subscription/shared-auth");

const isAccessTokenInvalidated = (decoded, user) => {
  if (isTokenVersionStale(decoded, user)) {
    return true;
  }

  if (!decoded?.iat || !user?.sessionInvalidatedAt) {
    return false;
  }

  return decoded.iat * 1000 < new Date(user.sessionInvalidatedAt).getTime();
};

const forceLogoutAllSessions = async (models = defaultModels, now = new Date()) => {
  const results = await Promise.all(
    Object.values(models).map((model) =>
      model.updateMany({}, { $set: { refreshToken: null, sessionInvalidatedAt: now }, $inc: { tokenVersion: 1 } }),
    ),
  );

  return results.reduce(
    (total, result) => ({
      matchedCount: total.matchedCount + (result.matchedCount || result.n || 0),
      modifiedCount: total.modifiedCount + (result.modifiedCount || result.nModified || 0),
    }),
    { matchedCount: 0, modifiedCount: 0 },
  );
};

const forceAccountReauthentication = async ({ userId, accountType }, models = defaultModels, now = new Date()) => {
  const model = models[accountType];
  if (!userId || !model) {
    return null;
  }

  return model.findByIdAndUpdate(
    userId,
    {
      $set: { refreshToken: null, sessionInvalidatedAt: now },
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );
};

const { revokeAuthSession } = require("./authSessionService.js");

const revokeRequestRefreshTokens = async (req, models = defaultModels) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  const refreshTokenResult = await revokeRefreshToken(refreshToken, models);
  let accountRevoked = false;
  let sessionRevoked = false;
  const bearerToken = getBearerToken(req);

  if (refreshToken) {
    try {
      const refreshDecoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      if (refreshDecoded?.sessionId) {
        sessionRevoked = Boolean(await revokeAuthSession(refreshDecoded.sessionId));
      }
    } catch (err) {
      sessionRevoked = false;
    }
  }

  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.ACCESS_TOKEN_SECRET);
      if (decoded?.sessionId) {
        sessionRevoked = sessionRevoked || Boolean(await revokeAuthSession(decoded.sessionId));
      }
      accountRevoked = Boolean(await revokeAccountRefreshToken({ userId: decoded.id, role: decoded.role }, models));
    } catch (err) {
      accountRevoked = false;
    }
  }

  return {
    refreshTokenRevoked: refreshTokenResult.modifiedCount > 0 || refreshTokenResult.matchedCount > 0,
    accountRevoked,
    sessionRevoked,
  };
};

const clearAuthCookies = (res) => {
  const options = clearCookieOptions();
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(OAUTH_SESSION_COOKIE, options);
};

module.exports = {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  OAUTH_SESSION_COOKIE,
  accessTokenCookieOptions,
  clearCookieOptions,
  getAccessTokenFromRequest,
  getBearerToken,
  issueAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  getAccountTypeFromRole,
  isAccessTokenInvalidated,
  revokeRefreshToken,
  revokeAccountRefreshToken,
  revokeRequestRefreshTokens,
  forceLogoutAllSessions,
  forceAccountReauthentication,
  clearAuthCookies,
};
