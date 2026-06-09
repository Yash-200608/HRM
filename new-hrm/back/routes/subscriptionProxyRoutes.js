const express = require("express");

const DEFAULT_BILLING_API_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_TIMEOUT_MS = 30000;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const BLOCKED_CLIENT_HEADERS = new Set(["x-internal-api-key"]);

const billingProxyMounts = [
  { mountPath: "/api/subscriptions", upstreamPrefix: "/v1/subscriptions" },
  { mountPath: "/api/billing", upstreamPrefix: "/v1/billing" },
  { mountPath: "/api/invoices", upstreamPrefix: "/v1/billing/invoices" },
  { mountPath: "/api/payments", upstreamPrefix: "/v1/billing/payments" },
  { mountPath: "/api/credits", upstreamPrefix: "/v1/billing/credits" },
  { mountPath: "/api/plans", upstreamPrefix: "/v1/plans" },
  { mountPath: "/api/usage", upstreamPrefix: "/v1/usage" },
  { mountPath: "/api/limits", upstreamPrefix: "/v1/limits" },
  { mountPath: "/api/features", upstreamPrefix: "/v1/features" },
  { mountPath: "/api/events", upstreamPrefix: "/v1/events" },
];

function resolveBillingApiBaseUrl(baseUrl) {
  const configuredUrl =
    baseUrl ||
    process.env.SUBSCRIPTION_API_BASE_URL ||
    process.env.BILLING_API_BASE_URL ||
    DEFAULT_BILLING_API_BASE_URL;
  const parsedUrl = new URL(configuredUrl);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Billing API base URL must use http or https");
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

function resolveTimeoutMs(timeoutMs) {
  const configuredTimeoutMs =
    timeoutMs ||
    Number(process.env.SUBSCRIPTION_API_TIMEOUT_MS || process.env.BILLING_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  return Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_TIMEOUT_MS;
}

function buildUpstreamUrl(baseUrl, upstreamPrefix, requestUrl) {
  const suffix = requestUrl === "/" ? "" : requestUrl.startsWith("/?") ? requestUrl.slice(1) : requestUrl;
  return `${baseUrl}${upstreamPrefix}${suffix}`;
}

function copyRequestHeaders(req, options = {}) {
  const headers = {};
  const stripBlockedHeaders = options.stripBlockedHeaders !== false;

  for (const [key, value] of Object.entries(req.headers)) {
    const headerName = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(headerName) || value == null) {
      continue;
    }

    if (stripBlockedHeaders && BLOCKED_CLIENT_HEADERS.has(headerName)) {
      continue;
    }

    headers[key] = Array.isArray(value) ? value.join(",") : String(value);
  }

  return headers;
}

function copyResponseHeaders(upstreamResponse, res) {
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });
}

function shouldForwardBody(method) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

function serializeRequestBody(req, headers) {
  if (!shouldForwardBody(req.method)) {
    return undefined;
  }

  if (req.body == null || (typeof req.body === "object" && Object.keys(req.body).length === 0)) {
    return undefined;
  }

  if (!headers["content-type"] && !headers["Content-Type"]) {
    headers["content-type"] = "application/json";
  }

  return Buffer.isBuffer(req.body) || typeof req.body === "string"
    ? req.body
    : JSON.stringify(req.body);
}

function createSubscriptionProxyRouter(options) {
  const router = express.Router();
  const upstreamPrefix = options?.upstreamPrefix;

  if (!upstreamPrefix) {
    throw new Error("Subscription proxy upstreamPrefix is required");
  }

  router.use(async (req, res) => {
    const baseUrl = resolveBillingApiBaseUrl(options?.baseUrl);
    const timeoutMs = resolveTimeoutMs(options?.timeoutMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const headers = copyRequestHeaders(req);
    if (req.correlationId) {
      headers["x-correlation-id"] = req.correlationId;
    }
    const body = serializeRequestBody(req, headers);
    const upstreamUrl = buildUpstreamUrl(baseUrl, upstreamPrefix, req.url);

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body,
        signal: controller.signal,
      });
      const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());

      copyResponseHeaders(upstreamResponse, res);
      res.status(upstreamResponse.status);
      if (responseBody.length === 0) {
        res.end();
        return;
      }

      res.send(responseBody);
    } catch (error) {
      res.status(502).json({
        error: {
          code: "BILLING_UPSTREAM_UNAVAILABLE",
          message: "Billing service unavailable",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  return router;
}

function mountSubscriptionProxyRoutes(app, options = {}) {
  const { authMiddleware } = options;

  for (const mount of billingProxyMounts) {
    const middlewares = [];

    if (authMiddleware) {
      middlewares.push(authMiddleware);
    }

    middlewares.push(
      createSubscriptionProxyRouter({
        upstreamPrefix: mount.upstreamPrefix,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeoutMs,
      })
    );

    app.use(mount.mountPath, ...middlewares);
  }
}

module.exports = {
  BLOCKED_CLIENT_HEADERS,
  billingProxyMounts,
  copyRequestHeaders,
  createSubscriptionProxyRouter,
  mountSubscriptionProxyRoutes,
};