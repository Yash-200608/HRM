function aiAdminGuard() {
  return function adminGuard(req, res, next) {
    const role = req.user?.role;
    if (role === "admin" || role === "super_admin") {
      return next();
    }

    return res.status(403).json({
      code: "AI_ADMIN_REQUIRED",
      message: "Admin access is required for this AI endpoint",
    });
  };
}

module.exports = {
  aiAdminGuard,
};