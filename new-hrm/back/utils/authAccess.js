function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

function resolveActorCompanyId(user) {
  if (!user?.companyId) {
    return null;
  }
  return String(user.companyId);
}

function isSelf(actor, targetUserId) {
  return actor && targetUserId && String(actor.id) === String(targetUserId);
}

function sendDeny(res, status, message) {
  res.status(status).json({ message });
  return false;
}

function assertAuthenticated(req, res) {
  if (!req.user) {
    return sendDeny(res, 401, "Authentication required");
  }
  return true;
}

function assertSuperAdmin(req, res) {
  if (!assertAuthenticated(req, res)) {
    return false;
  }
  if (!isSuperAdmin(req.user)) {
    return sendDeny(res, 403, "Super admin access required");
  }
  return true;
}

function assertSameCompany(req, res, companyId) {
  if (!assertAuthenticated(req, res)) {
    return false;
  }
  if (isSuperAdmin(req.user)) {
    return true;
  }
  const actorCompanyId = resolveActorCompanyId(req.user);
  if (!companyId || !actorCompanyId || String(companyId) !== actorCompanyId) {
    return sendDeny(res, 403, "Access denied for this company");
  }
  return true;
}

function assertSelfOrSuperAdmin(req, res, targetUserId) {
  if (!assertAuthenticated(req, res)) {
    return false;
  }
  if (isSuperAdmin(req.user) || isSelf(req.user, targetUserId)) {
    return true;
  }
  return sendDeny(res, 403, "Access denied");
}

function resolveEffectiveCompanyId(req, requestedCompanyId) {
  if (isSuperAdmin(req.user)) {
    return requestedCompanyId ? String(requestedCompanyId) : resolveActorCompanyId(req.user);
  }
  return resolveActorCompanyId(req.user);
}

function resolveEffectiveUserId(req, requestedUserId) {
  if (isSuperAdmin(req.user)) {
    return requestedUserId ? String(requestedUserId) : String(req.user.id);
  }
  if (req.user.role === "admin") {
    return requestedUserId ? String(requestedUserId) : String(req.user.id);
  }
  return String(req.user.id);
}

function assertCanViewUserProfile(req, res, targetUserId, companyId) {
  if (!assertAuthenticated(req, res)) {
    return false;
  }
  if (isSuperAdmin(req.user)) {
    return true;
  }
  if (isSelf(req.user, targetUserId)) {
    return assertSameCompany(req, res, companyId);
  }
  if (req.user.role === "admin") {
    return assertSameCompany(req, res, companyId);
  }
  return sendDeny(res, 403, "Access denied");
}

function assertCanUpdateUserProfile(req, res, targetUserId, companyId) {
  if (!assertAuthenticated(req, res)) {
    return false;
  }
  if (isSuperAdmin(req.user)) {
    return true;
  }
  if (isSelf(req.user, targetUserId)) {
    return true;
  }
  if (req.user.role === "admin") {
    return assertSameCompany(req, res, companyId);
  }
  return sendDeny(res, 403, "Access denied");
}

module.exports = {
  assertAuthenticated,
  assertCanUpdateUserProfile,
  assertCanViewUserProfile,
  assertSameCompany,
  assertSelfOrSuperAdmin,
  assertSuperAdmin,
  isSelf,
  isSuperAdmin,
  resolveActorCompanyId,
  resolveEffectiveCompanyId,
  resolveEffectiveUserId,
};