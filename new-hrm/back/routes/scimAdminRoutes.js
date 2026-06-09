const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");
const {
  getScimAdminConfig,
  rotateScimToken,
} = require("../service/scimService.js");

const router = express.Router();
const writeGuard = requireWritableTenant();

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

router.get("/config", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const config = await getScimAdminConfig(companyId);
    if (!config) {
      return res.status(404).json({ message: "Company not found" });
    }

    return res.json({ data: config });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Failed to load SCIM config" });
  }
});

router.post("/token/rotate", authMiddleware, writeGuard, requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const result = await rotateScimToken(companyId, {
      id: req.user.id,
      role: req.user.role,
      correlationId: req.correlationId,
    });

    return res.status(200).json({
      message: "SCIM token rotated",
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "SCIM token rotation failed" });
  }
});

module.exports = router;