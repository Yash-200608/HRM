const jwt = require("jsonwebtoken");
const { getAccessTokenFromRequest } = require("../service/sessionSecurityService.js");

function requireUploadAccess(req, res, next) {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication required" });
  }
}

module.exports = requireUploadAccess;