const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const { exportComplianceHandler } = require("../controllers/personalOffice/securityController.js");

const router = express.Router();

function requireComplianceAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Compliance export requires admin access" });
  }

  return next();
}

router.get("/export", authMiddleware, requireComplianceAccess, exportComplianceHandler);

module.exports = router;