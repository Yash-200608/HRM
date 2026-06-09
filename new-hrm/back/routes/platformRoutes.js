const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const requireSuperAdmin = require("../middleware/requireSuperAdmin.js");
const { consumePlatformOutboxEvent } = require("../service/platformOutboxConsumerService.js");
const {
  getPlatformMetrics,
  getPlatformOpsMetrics,
} = require("../service/billingOverviewService.js");
const { getSlaDashboard } = require("../service/platformSlaService.js");
const {
  getRunbook,
  listRunbooks,
} = require("../service/incidentRunbookService.js");
const { recordAuditEvent } = require("../service/auditService.js");

const router = express.Router();

async function handleOutboxInbound(req, res) {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body ?? {});
    const result = await consumePlatformOutboxEvent(rawBody, req.headers);
    return res.status(200).json({ data: result });
  } catch (error) {
    const status = error.status || 500;
    await recordAuditEvent({
      actorRole: "system",
      action: "platform.outbox.consume_failed",
      resourceType: "OutboxEvent",
      metadata: {
        status,
        message: error.message || "Failed to consume outbox event",
      },
      correlationId: req.correlationId || null,
    });
    return res.status(status).json({
      error: {
        code: status === 401 ? "OUTBOX_SIGNATURE_INVALID" : "OUTBOX_CONSUME_FAILED",
        message: error.message || "Failed to consume outbox event",
      },
    });
  }
}

router.get("/ops/metrics", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const data = await getPlatformOpsMetrics({ correlationId: req.correlationId });
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "PLATFORM_OPS_METRICS_FAILED",
        message: error.message || "Failed to load operational metrics",
      },
    });
  }
});

router.get("/sla/dashboard", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const data = await getSlaDashboard({ correlationId: req.correlationId });
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "PLATFORM_SLA_DASHBOARD_FAILED",
        message: error.message || "Failed to load SLA dashboard",
      },
    });
  }
});

router.get("/incidents/runbooks", authMiddleware, requireSuperAdmin, async (_req, res) => {
  return res.status(200).json({ data: listRunbooks() });
});

router.get("/incidents/runbooks/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
  const runbook = getRunbook(req.params.id);
  if (!runbook) {
    return res.status(404).json({ message: "Runbook not found" });
  }
  return res.status(200).json({ data: runbook });
});

router.get("/metrics", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const data = await getPlatformMetrics({ correlationId: req.correlationId });
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "PLATFORM_METRICS_FAILED",
        message: error.message || "Failed to load platform metrics",
      },
    });
  }
});

module.exports = {
  router,
  handleOutboxInbound,
};