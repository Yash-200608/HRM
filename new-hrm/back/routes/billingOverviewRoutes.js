const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const sendEmail = require("../service/mailService.js");
const Company = require("../models/personalOffice/companyModel.js");
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

router.post("/enterprise-inquiry", authMiddleware, requireAdminBillingAccess, async (req, res) => {
  try {
    const { contactName, contactEmail, message, companySize } = req.body || {};
    if (!contactName || !contactEmail || !message) {
      return res.status(400).json({ message: "contactName, contactEmail, and message are required" });
    }

    const company = await Company.findById(req.user.companyId).select("name email").lean();
    const salesInbox =
      process.env.BILLING_SALES_EMAIL ||
      process.env.SUPER_ADMIN_EMAIL ||
      process.env.SMTP_FROM_EMAIL;

    if (!salesInbox) {
      return res.status(503).json({
        message: "Sales inbox is not configured. Set BILLING_SALES_EMAIL or SUPER_ADMIN_EMAIL.",
      });
    }

    const subject = `Enterprise inquiry — ${company?.name || req.user.companyId}`;
    const text = [
      `Company: ${company?.name || "Unknown"} (${req.user.companyId})`,
      `Contact: ${contactName} <${contactEmail}>`,
      companySize ? `Company size: ${companySize}` : null,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const emailResult = await sendEmail({
      to: salesInbox,
      subject,
      text,
      html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${text}</pre>`,
    });

    if (!emailResult.success) {
      return res.status(502).json({
        message: emailResult.error || "Failed to deliver enterprise inquiry email",
      });
    }

    return res.status(200).json({
      message: "Enterprise inquiry submitted. Our team will contact you shortly.",
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "ENTERPRISE_INQUIRY_FAILED",
        message: error.message || "Failed to submit enterprise inquiry",
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

    const razorpayConfigured = Boolean(
      (process.env.Razorpay_KEY_ID || process.env.RAZORPAY_KEY_ID) &&
        (process.env.Razorpay_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    );

    if (!razorpayConfigured && planCode !== "free") {
      const overview = await getBillingOverview(req.user.companyId, {
        correlationId: req.correlationId,
      });
      const targetPlan = (overview.plans || []).find((plan) => plan.code === planCode);
      const monthlyPrice = targetPlan?.priceMonthly ?? 0;

      if (monthlyPrice > 0) {
        return res.status(503).json({
          error: {
            code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
            message:
              "Paid plan upgrades are disabled until Razorpay is configured. Contact support or complete setup.",
          },
        });
      }
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