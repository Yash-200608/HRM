const DEFAULT_DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
];

function parseConfiguredOrigins(value = "") {
  return String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigins() {
  const configured = parseConfiguredOrigins(process.env.CORS_ALLOWED_ORIGINS);

  if (configured.length > 0) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return [
      process.env.HRM_FRONTEND_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean);
  }

  return DEFAULT_DEV_ORIGINS;
}

function createCorsOptions() {
  const allowedOrigins = new Set(resolveAllowedOrigins());

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    exposedHeaders: ["X-CSRF-Token"],
  };
}

function resolveSocketCorsOrigins() {
  return resolveAllowedOrigins();
}

module.exports = {
  DEFAULT_DEV_ORIGINS,
  createCorsOptions,
  resolveAllowedOrigins,
  resolveSocketCorsOrigins,
};