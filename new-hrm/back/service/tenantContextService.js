const Company = require("../models/personalOffice/companyModel.js");
const SubscriptionSnapshot = require("../models/billing/subscriptionSnapshotModel.js");

const NON_WRITABLE_COMPANY_STATUSES = new Set(["SUSPENDED", "ARCHIVED", "PURGED"]);
const NON_WRITABLE_SUBSCRIPTION_STATUSES = new Set([
  "READ_ONLY",
  "SUSPENDED",
  "ARCHIVED",
  "PURGED",
]);

const tenantContextCache = new Map();
const CACHE_TTL_MS = 30_000;

function buildCacheKey(organizationId) {
  return String(organizationId);
}

function readCachedTenantContext(organizationId) {
  const cached = tenantContextCache.get(buildCacheKey(organizationId));
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    tenantContextCache.delete(buildCacheKey(organizationId));
    return null;
  }

  return cached.value;
}

function writeCachedTenantContext(organizationId, value) {
  tenantContextCache.set(buildCacheKey(organizationId), {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function resolveReadOnlyReason(companyStatus, subscriptionStatus) {
  if (NON_WRITABLE_COMPANY_STATUSES.has(companyStatus)) {
    return {
      code: "TENANT_READ_ONLY",
      message: "Organization is in read-only mode",
      source: "company",
      status: companyStatus,
    };
  }

  if (NON_WRITABLE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return {
      code: "SUBSCRIPTION_READ_ONLY",
      message: "Subscription is in read-only mode",
      source: "subscription",
      status: subscriptionStatus,
    };
  }

  return null;
}

async function resolveTenantContext(organizationId) {
  if (!organizationId) {
    return {
      organizationId: null,
      companyStatus: null,
      subscriptionStatus: null,
      writable: true,
      readOnlyReason: null,
    };
  }

  const cached = readCachedTenantContext(organizationId);
  if (cached) {
    return cached;
  }

  const [company, subscription] = await Promise.all([
    Company.findById(organizationId).select("status planCode").lean(),
    SubscriptionSnapshot.findOne({ organization: organizationId }).select("status planCode").lean(),
  ]);

  const companyStatus = company?.status || "ACTIVE";
  const subscriptionStatus = subscription?.status || null;
  const readOnlyReason = resolveReadOnlyReason(companyStatus, subscriptionStatus);
  const context = {
    organizationId: String(organizationId),
    companyStatus,
    subscriptionStatus,
    planCode: subscription?.planCode || company?.planCode || "free",
    writable: readOnlyReason == null,
    readOnlyReason,
  };

  writeCachedTenantContext(organizationId, context);
  return context;
}

function resolveOrganizationIdFromRequest(req) {
  if (!req.user) {
    return null;
  }

  if (req.user.role === "super_admin") {
    return (
      req.user.companyId ||
      req.body?.companyId ||
      req.body?.organizationId ||
      req.query?.companyId ||
      req.query?.organizationId ||
      req.params?.companyId ||
      null
    );
  }

  return req.user.companyId || null;
}

function isMutationMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

function clearTenantContextCacheForTests() {
  tenantContextCache.clear();
}

module.exports = {
  NON_WRITABLE_COMPANY_STATUSES,
  NON_WRITABLE_SUBSCRIPTION_STATUSES,
  clearTenantContextCacheForTests,
  isMutationMethod,
  resolveOrganizationIdFromRequest,
  resolveReadOnlyReason,
  resolveTenantContext,
};