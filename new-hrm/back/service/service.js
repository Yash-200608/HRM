
const jwt = require("jsonwebtoken");
const { buildJwtClaimsV1 } = require("@hrm-subscription/shared-auth");

const generateAccessToken = (data, options = {}) => {
  const claims = buildJwtClaimsV1(data);

  return jwt.sign(claims, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: options.expiresIn || "1d",
  });
};

const generateRefreshToken = (data) => {
  return jwt.sign({ id: data.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

module.exports = { generateAccessToken, generateRefreshToken };