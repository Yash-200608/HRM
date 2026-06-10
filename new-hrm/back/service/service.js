
const jwt = require("jsonwebtoken");
const { buildJwtClaimsV1 } = require("@hrm-subscription/shared-auth");

const generateAccessToken = (data, options = {}) => {
  const claims = buildJwtClaimsV1(data);

  return jwt.sign(claims, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: options.expiresIn || process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

const generateRefreshToken = (data) => {
  const payload = {
    id: String(data.id),
    sessionId: data.sessionId ? String(data.sessionId) : null,
    jti: data.jti || require("crypto").randomUUID(),
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

module.exports = { generateAccessToken, generateRefreshToken };