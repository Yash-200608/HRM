const jwt = require("jsonwebtoken");
const { Admin } = require("../models/personalOffice/authModel");
const { Employee } = require("../models/personalOffice/employeeModel");
const { SuperAdmin } = require("../models/personalOffice/superadminModel");
const {
  isAccessTokenInvalidated,
} = require("../service/sessionSecurityService");
const {
  toSubscriptionPrincipal,
  validateJwtClaims,
} = require("@hrm-subscription/shared-auth");
const {
  isMutationMethod,
  resolveTenantContext,
} = require("../service/tenantContextService.js");
const {
  denyReadOnlyTenant,
  shouldBypassWritableCheck,
} = require("./requireWritableTenant.js");

async function resolveAuthenticatedUser(decoded) {
  const superAdmin = await SuperAdmin.findById(decoded.id);
  if (superAdmin) {
    return superAdmin;
  }

  const admin = await Admin.findById(decoded.id).populate("companyId", "name logo planCode status");
  if (admin) {
    return admin;
  }

  return Employee.findById(decoded.id)
    .populate("createdBy", "name logo planCode status")
    .populate("assignedRole");
}

function resolveCompanyId(user, decoded) {
  if (user.role === "super_admin") {
    return decoded.orgId || decoded.companyId || null;
  }

  if (user.role === "admin") {
    return (
      user.companyId?._id ||
      user.companyId ||
      decoded.orgId ||
      decoded.companyId ||
      null
    );
  }

  return (
    user.companyId?._id ||
    user.createdBy?._id ||
    user.companyId ||
    user.createdBy ||
    decoded.orgId ||
    decoded.companyId ||
    null
  );
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const claimValidation = validateJwtClaims(decoded);

    if (!claimValidation.valid) {
      return res.status(403).json({
        message: "Invalid token claims",
        errors: claimValidation.errors,
      });
    }

    const user = await resolveAuthenticatedUser(decoded);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (isAccessTokenInvalidated(decoded, user)) {
      return res.status(401).json({ message: "Session invalidated" });
    }

    const companyId = resolveCompanyId(user, claimValidation.claims);
    const subscriptionPrincipal = toSubscriptionPrincipal(
      {
        id: user._id.toString(),
        role: user.role,
        companyId: companyId ? companyId.toString() : null,
      },
      claimValidation.claims
    );

    req.user = {
      ...user.toObject(),
      id: user._id.toString(),
      role: user.role,
      companyId: companyId ? companyId.toString() : null,
      sessionId: claimValidation.claims.sessionId || null,
      tokenVersion: claimValidation.claims.tokenVersion ?? user.tokenVersion ?? 0,
      entitlements: claimValidation.claims.entitlements || [],
      subscriptionPlan: claimValidation.claims.subscriptionPlan || null,
      permissions: claimValidation.claims.permissions || null,
      jwtClaimsVersion: claimValidation.claims.ver || null,
      isLegacyToken: claimValidation.isLegacy,
    };

    req.subscriptionPrincipal = subscriptionPrincipal;
    req.authClaims = claimValidation.claims;

    if (companyId) {
      req.tenantContext = await resolveTenantContext(companyId.toString());
    }

    if (
      isMutationMethod(req.method) &&
      req.tenantContext &&
      !req.tenantContext.writable &&
      !shouldBypassWritableCheck(req.user)
    ) {
      return denyReadOnlyTenant(req, res, req.tenantContext);
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token expired" });
    }

    return res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;