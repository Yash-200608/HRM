const crypto = require("crypto");
const AuthSession = require("../models/personalOffice/authSessionModel.js");

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function parseUserAgent(userAgent = "") {
  const value = String(userAgent || "").trim();
  if (!value) {
    return { label: "Unknown device", browser: null, os: null };
  }

  let browser = "Browser";
  if (/Edg\//i.test(value)) browser = "Edge";
  else if (/Chrome\//i.test(value)) browser = "Chrome";
  else if (/Firefox\//i.test(value)) browser = "Firefox";
  else if (/Safari\//i.test(value)) browser = "Safari";

  let os = "Unknown OS";
  if (/Windows/i.test(value)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(value)) os = "macOS";
  else if (/Android/i.test(value)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(value)) os = "iOS";
  else if (/Linux/i.test(value)) os = "Linux";

  return { label: `${browser} on ${os}`, browser, os };
}

async function createAuthSession({ userId, accountType, sessionId, req, refreshToken }) {
  const now = Date.now();
  const payload = {
    sessionId,
    userId: String(userId),
    accountType,
    userAgent: req?.headers?.["user-agent"] || null,
    ipAddress: req?.ip || null,
    lastActiveAt: new Date(now),
    expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
  };

  if (refreshToken) {
    payload.refreshTokenHash = hashRefreshToken(refreshToken);
  }

  return AuthSession.create(payload);
}

async function findActiveSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  return AuthSession.findOne({
    sessionId: String(sessionId),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

async function updateSessionRefreshToken(sessionId, refreshToken) {
  return AuthSession.findOneAndUpdate(
    { sessionId: String(sessionId), revokedAt: null },
    {
      $set: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        lastActiveAt: new Date(),
      },
    },
    { new: true }
  );
}

async function touchSession(sessionId) {
  return AuthSession.updateOne(
    { sessionId: String(sessionId), revokedAt: null },
    { $set: { lastActiveAt: new Date() } }
  );
}

async function revokeAuthSession(sessionId) {
  return AuthSession.findOneAndUpdate(
    { sessionId: String(sessionId), revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );
}

async function revokeOtherAuthSessions(userId, accountType, currentSessionId) {
  const result = await AuthSession.updateMany(
    {
      userId: String(userId),
      accountType,
      sessionId: { $ne: String(currentSessionId) },
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } }
  );

  return result.modifiedCount || 0;
}

async function revokeAllAuthSessionsForUser(userId, accountType) {
  const result = await AuthSession.updateMany(
    {
      userId: String(userId),
      accountType,
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } }
  );

  return result.modifiedCount || 0;
}

async function listAuthSessions(userId, accountType) {
  return AuthSession.find({
    userId: String(userId),
    accountType,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastActiveAt: -1 })
    .lean();
}

function verifySessionRefreshToken(session, refreshToken) {
  if (!session?.refreshTokenHash || !refreshToken) {
    return false;
  }

  return session.refreshTokenHash === hashRefreshToken(refreshToken);
}

function serializeAuthSession(session, currentSessionId) {
  const parsed = parseUserAgent(session.userAgent);
  return {
    sessionId: session.sessionId,
    current: String(session.sessionId) === String(currentSessionId),
    deviceLabel: parsed.label,
    browser: parsed.browser,
    os: parsed.os,
    ipAddress: session.ipAddress,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
  };
}

module.exports = {
  REFRESH_TOKEN_TTL_MS,
  createAuthSession,
  findActiveSession,
  hashRefreshToken,
  listAuthSessions,
  parseUserAgent,
  revokeAllAuthSessionsForUser,
  revokeAuthSession,
  revokeOtherAuthSessions,
  serializeAuthSession,
  touchSession,
  updateSessionRefreshToken,
  verifySessionRefreshToken,
};