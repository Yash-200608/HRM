const AuditEvent = require("../../models/personalOffice/auditEventModel");
const AiActionDraft = require("../../models/personalOffice/aiActionDraftModel");
const AiConversation = require("../../models/personalOffice/aiConversationModel");
const { getOrganizationAiPolicy } = require("./aiPolicyEngine");

const AI_AUDIT_ACTIONS = [
  "AI_QUERY_STARTED",
  "AI_QUERY_COMPLETED",
  "AI_QUERY_FAILED",
  "AI_QUERY_DENIED",
  "AI_TOOL_EXECUTED",
  "AI_DRAFT_CREATED",
  "AI_DRAFT_CONFIRMED",
  "AI_DRAFT_CANCELLED",
  "AI_ACTION_EXECUTED",
  "AI_CONVERSATION_UPDATED",
];

function normalizeOrganizationId(organizationId) {
  return String(organizationId || "").trim();
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function buildDailySeries(rows, days = 14) {
  const map = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const key = row._id;
    if (map.has(key)) {
      map.set(key, row.count);
    }
  }

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

async function countAuditByAction(organizationId, since) {
  const orgId = normalizeOrganizationId(organizationId);
  const rows = await AuditEvent.aggregate([
    {
      $match: {
        companyId: orgId,
        action: { $in: AI_AUDIT_ACTIONS },
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: "$action", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return rows.map((r) => ({ action: r._id, count: r.count }));
}

async function countQueriesPerDay(organizationId, since) {
  const orgId = normalizeOrganizationId(organizationId);
  const rows = await AuditEvent.aggregate([
    {
      $match: {
        companyId: orgId,
        action: { $in: ["AI_QUERY_COMPLETED", "AI_QUERY_FAILED"] },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return buildDailySeries(rows, 14);
}

async function topTools(organizationId, since, limit = 8) {
  const orgId = normalizeOrganizationId(organizationId);
  const rows = await AuditEvent.aggregate([
    {
      $match: {
        companyId: orgId,
        action: "AI_TOOL_EXECUTED",
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: "$resourceId",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return rows
    .filter((r) => r._id)
    .map((r) => ({ toolName: r._id, count: r.count }));
}

async function draftStats(organizationId, since) {
  const orgId = normalizeOrganizationId(organizationId);
  const match = { organizationId: orgId, createdAt: { $gte: since } };

  const [pending, confirmed, cancelled, expired] = await Promise.all([
    AiActionDraft.countDocuments({ ...match, status: "pending" }),
    AiActionDraft.countDocuments({ ...match, status: "confirmed" }),
    AiActionDraft.countDocuments({ ...match, status: "cancelled" }),
    AiActionDraft.countDocuments({ ...match, status: "expired" }),
  ]);

  return { pending, confirmed, cancelled, expired, total: pending + confirmed + cancelled + expired };
}

async function conversationStats(organizationId, since) {
  const orgId = normalizeOrganizationId(organizationId);
  const match = {
    organizationId: orgId,
    lastMessageAt: { $gte: since },
  };

  const [activeConversations, messageAgg] = await Promise.all([
    AiConversation.countDocuments(match),
    AiConversation.aggregate([
      { $match: match },
      {
        $project: {
          messageCount: { $size: { $ifNull: ["$messages", []] } },
        },
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: "$messageCount" },
        },
      },
    ]),
  ]);

  const totalMessages = messageAgg[0]?.totalMessages || 0;

  return {
    activeConversations,
    totalMessages,
    avgMessagesPerConversation:
      activeConversations > 0 ? Math.round((totalMessages / activeConversations) * 10) / 10 : 0,
  };
}

async function failureRate(organizationId, since) {
  const orgId = normalizeOrganizationId(organizationId);
  const [completed, failed] = await Promise.all([
    AuditEvent.countDocuments({
      companyId: orgId,
      action: "AI_QUERY_COMPLETED",
      createdAt: { $gte: since },
    }),
    AuditEvent.countDocuments({
      companyId: orgId,
      action: "AI_QUERY_FAILED",
      createdAt: { $gte: since },
    }),
  ]);

  const total = completed + failed;
  return {
    completed,
    failed,
    failureRatePercent: total > 0 ? Math.round((failed / total) * 1000) / 10 : 0,
  };
}

async function getAdminAnalytics({ organizationId, windowDays = 30 }) {
  const orgId = normalizeOrganizationId(organizationId);
  const days = Math.min(Math.max(Number(windowDays) || 30, 7), 90);
  const since = daysAgo(days);

  const [
    policy,
    auditByAction,
    queriesPerDay,
    tools,
    drafts,
    conversations,
    queryOutcomes,
  ] = await Promise.all([
    getOrganizationAiPolicy(orgId),
    countAuditByAction(orgId, since),
    countQueriesPerDay(orgId, since),
    topTools(orgId, since),
    draftStats(orgId, since),
    conversationStats(orgId, since),
    failureRate(orgId, since),
  ]);

  const totalQueries =
    (auditByAction.find((a) => a.action === "AI_QUERY_COMPLETED")?.count || 0) +
    (auditByAction.find((a) => a.action === "AI_QUERY_FAILED")?.count || 0);

  const totalToolExecutions =
    auditByAction.find((a) => a.action === "AI_TOOL_EXECUTED")?.count || 0;

  return {
    windowDays: days,
    generatedAt: new Date().toISOString(),
    policy: {
      enabled: policy.enabled,
      defaultScope: policy.defaultScope,
      memoryEnabled: policy.memory?.enabled !== false,
      retentionDays: policy.memory?.retentionDays || 90,
      blockedToolsCount: (policy.blockedTools || []).length,
      allowedToolsCount: (policy.allowedTools || []).length,
    },
    summary: {
      totalQueries,
      totalToolExecutions,
      failureRatePercent: queryOutcomes.failureRatePercent,
      pendingDrafts: drafts.pending,
      activeConversations: conversations.activeConversations,
    },
    queriesPerDay,
    auditByAction,
    topTools: tools,
    drafts,
    conversations,
    queryOutcomes,
  };
}

module.exports = {
  getAdminAnalytics,
  AI_AUDIT_ACTIONS,
};