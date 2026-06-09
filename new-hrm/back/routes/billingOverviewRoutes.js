const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const {
  getBillingOverview,
  upgradeSubscription,
} = require("../service/billingOverviewService.js");

const router = express.Router();

function requireAdminBillingAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin billing access required" });
  }

  if (!req.user.companyId) {
    return res.status(400).json({ message: "Company context is required" });
  }

  return next();
}

router.get("/payment-config", authMiddleware, requireAdminBillingAccess, (req, res) => {
  const keyId = process.env.Razorpay_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
  return res.status(200).json({
    data: {
      provider: "razorpay",
      keyId,
      enabled: Boolean(keyId && (process.env.Razorpay_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)),
    },
  });
});

router.get("/overview", authMiddleware, requireAdminBillingAccess, async (req, res) => {
  try {
    const overview = await getBillingOverview(req.user.companyId, {
      correlationId: req.correlationId,
    });
    return res.status(200).json({ data: overview });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: {
        code: status === 404 ? "BILLING_OVERVIEW_NOT_FOUND" : "BILLING_OVERVIEW_FAILED",
        message: error.message || "Failed to load billing overview",
      },
    });
  }
});

router.patch("/upgrade", authMiddleware, requireAdminBillingAccess, async (req, res) => {
  try {
    const { planCode } = req.body || {};
    if (!planCode) {
      return res.status(400).json({ message: "planCode is required" });
    }

    const subscription = await upgradeSubscription(req.user.companyId, planCode, {
      actorId: req.user.id,
      actorRole: req.user.role,
      correlationId: req.correlationId,
      idempotencyKey: req.headers["idempotency-key"] || req.headers["Idempotency-Key"],
    });

    return res.status(200).json({
      message: "Subscription upgraded successfully",
      data: subscription,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: {
        code: "BILLING_UPGRADE_FAILED",
        message: error.message || "Failed to upgrade subscription",
        details: error.data ?? null,
      },
    });
  }
});

module.exports = router;