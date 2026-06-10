const { resolveAllowedOrigins } = require("../config/corsConfig.js");

function buildConnectSrc() {
  const sources = new Set(["'self'"]);

  for (const value of [
    ...resolveAllowedOrigins(),
    process.env.HRM_API_URL,
    process.env.VITE_API_URL,
    "http://localhost:5000",
    "ws://localhost:5000",
    "wss://localhost:5000",
  ]) {
    if (value) {
      sources.add(value);
      if (value.startsWith("http://")) {
        sources.add(value.replace("http://", "ws://"));
      }
      if (value.startsWith("https://")) {
        sources.add(value.replace("https://", "wss://"));
      }
    }
  }

  return Array.from(sources).join(" ");
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        `connect-src ${buildConnectSrc()}`,
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join("; ")
    );
  }

  next();
}

module.exports = securityHeaders;