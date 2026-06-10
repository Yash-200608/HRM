const { getAdminAnalytics } = require("../services/aiAdminAnalyticsService.js");

async function analyticsHandler(req, res) {
  try {
    const organizationId = req.user?.companyId;
    if (!organizationId) {
      return res.status(403).json({
        code: "ORGANIZATION_REQUIRED",
        message: "Organization context is required",
      });
    }

    const windowDays = Number(req.query?.windowDays) || 30;
    const analytics = await getAdminAnalytics({ organizationId, windowDays });

    return res.json({ analytics });
  } catch (error) {
    return res.status(500).json({
      code: "AI_ANALYTICS_FAILED",
      message: error.message || "Failed to load AI analytics",
    });
  }
}

module.exports = {
  analyticsHandler,
};