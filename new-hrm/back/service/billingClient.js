const crypto = require("crypto");

const DEFAULT_BILLING_API_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_TIMEOUT_MS = 30000;

function resolveBillingApiBaseUrl(baseUrl) {
  const configuredUrl =
    baseUrl ||
    process.env.SUBSCRIPTION_API_BASE_URL ||
    process.env.BILLING_API_BASE_URL ||
    DEFAULT_BILLING_API_BASE_URL;

  return new URL(configuredUrl).toString().replace(/\/$/, "");
}

function resolveTimeoutMs(timeoutMs) {
  const configuredTimeoutMs =
    timeoutMs ||
    Number(process.env.SUBSCRIPTION_API_TIMEOUT_MS || process.env.BILLING_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  return Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_TIMEOUT_MS;
}

function buildIdempotencyKey(organizationId, operation, payload) {
  const payloadHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload ?? {}))
    .digest("hex")
    .slice(0, 16);

  return `${organizationId}:${operation}:${payloadHash}`;
}

async function callSubscription(path, options = {}) {
  const baseUrl = resolveBillingApiBaseUrl(options.baseUrl);
  const timeoutMs = resolveTimeoutMs(options.timeoutMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.useInternalKey !== false) {
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey) {
      throw new Error("INTERNAL_API_KEY is required for server-side Subscription calls");
    }
    headers["x-internal-api-key"] = internalApiKey;
  }

  if (options.authorization) {
    headers.authorization = options.authorization;
  }

  if (options.correlationId) {
    headers["x-correlation-id"] = String(options.correlationId);
  }

  let body;
  if (options.body != null) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const idempotencyKey =
    options.idempotencyKey ||
    (options.idempotent && options.organizationId && options.operation
      ? buildIdempotencyKey(options.organizationId, options.operation, options.body)
      : null);

  if (idempotencyKey) {
    headers["idempotency-key"] = idempotencyKey;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body,
      signal: controller.signal,
    });

    const responseText = await response.text();
    let data = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  buildIdempotencyKey,
  callSubscription,
};