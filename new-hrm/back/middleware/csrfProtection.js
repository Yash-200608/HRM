const crypto = require("crypto");

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";

const EXEMPT_PATH_PREFIXES = [
  "/api/auth/login",
  "/api/auth/refreshtoken",
  "/api/auth/logout",
  "/api/auth/password-reset",
  "/api/auth/mfa/verify-login",
  "/api/auth/mfa/enroll/setup",
  "/api/auth/mfa/enroll/enable",
  "/api/auth/google",
  "/api/auth/microsoft",
  "/api/auth/oauth",
  "/api/employees/login",
  "/api/superAdmin/auth",
  "/scim/v2",
  "/api/platform/outbox/inbound",
];

function isMutationMethod(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "").toUpperCase());
}

function isExemptPath(pathname) {
  const path = String(pathname || "");
  return EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function ensureCsrfCookie(req, res) {
  let token = req.cookies?.[CSRF_COOKIE];

  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  }

  res.setHeader(CSRF_HEADER, token);
  return token;
}

function csrfProtection(req, res, next) {
  if (!isMutationMethod(req.method) || isExemptPath(req.path)) {
    ensureCsrfCookie(req, res);
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] || req.headers[CSRF_HEADER.toUpperCase()];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      code: "CSRF_VALIDATION_FAILED",
      message: "CSRF validation failed",
    });
  }

  return next();
}

module.exports = {
  CSRF_COOKIE,
  CSRF_HEADER,
  csrfProtection,
  ensureCsrfCookie,
};