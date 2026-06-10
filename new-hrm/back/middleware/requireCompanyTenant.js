function requireCompanyTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role === "super_admin") {
    return next();
  }

  const requestedCompanyId = String(
    req.query.companyId || req.body?.companyId || req.params.companyId || ""
  );

  const userCompanyId = String(req.user.companyId || "");

  if (!userCompanyId) {
    return res.status(403).json({ message: "Company context is required" });
  }

  if (requestedCompanyId && requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ message: "Access denied for this company" });
  }

  return next();
}

module.exports = requireCompanyTenant;