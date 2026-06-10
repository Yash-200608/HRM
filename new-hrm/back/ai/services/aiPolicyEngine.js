const AiPolicy = require("../../models/personalOffice/aiPolicyModel.js");

const DEFAULT_POLICY = {
  enabled: true,
  scopes: {
    command_center: {
      enabled: true,
      allowActionTools: true,
      allowPredictiveIntelligence: true,
    },
    employee_copilot: {
      enabled: true,
      allowActionTools: true,
      allowPredictiveIntelligence: false,
    },
    manager_copilot: {
      enabled: true,
      allowActionTools: true,
      allowPredictiveIntelligence: true,
    },
  },
  blockedTools: [],
  allowedTools: null,
  employeeRestrictions: {
    blockActionTools: true,
    blockPredictiveIntelligence: true,
    blockSeatUtilization: true,
  },
  memory: {
    enabled: true,
    retentionDays: 30,
    maxMessagesPerConversation: 50,
    contextWindowMessages: 10,
  },
};

const PREDICTIVE_TOOLS = new Set([
  "getAttritionRisk",
  "getBurnoutRisk",
  "getPayrollAnomalies",
  "getSeatUtilization",
]);

const ACTION_TOOL_PREFIXES = ["draft", "create", "schedule"];

const EMPLOYEE_COPILOT_TOOLS = new Set([
  "getAvailableCapabilities",
  "getEmployeeProfileSummary",
  "getPendingLeaves",
  "draftLeaveRequest",
]);

function mergePolicy(stored) {
  if (!stored) {
    return { ...DEFAULT_POLICY, organizationId: null, isDefault: true };
  }

  return {
    organizationId: stored.organizationId,
    enabled: stored.enabled ?? DEFAULT_POLICY.enabled,
    scopes: {
      command_center: {
        ...DEFAULT_POLICY.scopes.command_center,
        ...(stored.scopes?.command_center || {}),
      },
      employee_copilot: {
        ...DEFAULT_POLICY.scopes.employee_copilot,
        ...(stored.scopes?.employee_copilot || {}),
      },
      manager_copilot: {
        ...DEFAULT_POLICY.scopes.manager_copilot,
        ...(stored.scopes?.manager_copilot || {}),
      },
    },
    blockedTools: Array.isArray(stored.blockedTools) ? stored.blockedTools : [],
    allowedTools: Array.isArray(stored.allowedTools) ? stored.allowedTools : null,
    employeeRestrictions: {
      ...DEFAULT_POLICY.employeeRestrictions,
      ...(stored.employeeRestrictions || {}),
    },
    memory: {
      ...DEFAULT_POLICY.memory,
      ...(stored.memory || {}),
    },
    isDefault: false,
    updatedBy: stored.updatedBy || null,
    updatedAt: stored.updatedAt || null,
  };
}

async function getOrganizationAiPolicy(organizationId) {
  if (!organizationId) {
    return mergePolicy(null);
  }

  const stored = await AiPolicy.findOne({ organizationId: String(organizationId) }).lean();
  return mergePolicy(stored);
}

async function upsertOrganizationAiPolicy(organizationId, payload, updatedBy) {
  const update = {
    organizationId: String(organizationId),
    enabled: payload.enabled ?? true,
    scopes: payload.scopes || DEFAULT_POLICY.scopes,
    blockedTools: Array.isArray(payload.blockedTools) ? payload.blockedTools : [],
    allowedTools: Array.isArray(payload.allowedTools) ? payload.allowedTools : null,
    employeeRestrictions: {
      ...DEFAULT_POLICY.employeeRestrictions,
      ...(payload.employeeRestrictions || {}),
    },
    memory: {
      ...DEFAULT_POLICY.memory,
      ...(payload.memory || {}),
    },
    updatedBy: updatedBy || null,
  };

  const policy = await AiPolicy.findOneAndUpdate(
    { organizationId: String(organizationId) },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return mergePolicy(policy);
}

function isActionToolName(toolName) {
  if (!toolName) {
    return false;
  }
  if (toolName.startsWith("draft") || toolName.startsWith("create") || toolName.startsWith("schedule")) {
    return true;
  }
  return false;
}

function isPredictiveToolName(toolName) {
  return PREDICTIVE_TOOLS.has(toolName);
}

function evaluateToolAgainstPolicy({ tool, ctx, policy, scope }) {
  if (!policy.enabled) {
    return { allowed: false, reason: "AI is disabled by organization policy" };
  }

  const scopePolicy = policy.scopes?.[scope] || policy.scopes?.command_center;
  if (!scopePolicy?.enabled) {
    return { allowed: false, reason: `AI scope ${scope} is disabled` };
  }

  if (Array.isArray(policy.allowedTools) && policy.allowedTools.length) {
    if (!policy.allowedTools.includes(tool.name)) {
      return { allowed: false, reason: "Tool not in organization allowlist" };
    }
  }

  if (policy.blockedTools.includes(tool.name)) {
    return { allowed: false, reason: "Tool blocked by organization policy" };
  }

  if (tool.kind === "action" || isActionToolName(tool.name)) {
    if (!scopePolicy.allowActionTools) {
      return { allowed: false, reason: "Action tools disabled for this scope" };
    }
  }

  if (isPredictiveToolName(tool.name) && !scopePolicy.allowPredictiveIntelligence) {
    return { allowed: false, reason: "Predictive intelligence disabled for this scope" };
  }

  if (ctx.role === "employee") {
    const restrictions = policy.employeeRestrictions || {};
    const scopeAllowlisted =
      scope === "employee_copilot" && EMPLOYEE_COPILOT_TOOLS.has(tool.name);
    if (
      restrictions.blockActionTools &&
      !scopeAllowlisted &&
      (tool.kind === "action" || isActionToolName(tool.name))
    ) {
      return { allowed: false, reason: "Action tools blocked for employees by policy" };
    }
    if (restrictions.blockPredictiveIntelligence && isPredictiveToolName(tool.name)) {
      return { allowed: false, reason: "Predictive intelligence blocked for employees by policy" };
    }
    if (restrictions.blockSeatUtilization && tool.name === "getSeatUtilization") {
      return { allowed: false, reason: "Seat utilization blocked for employees by policy" };
    }
  }

  return { allowed: true, reason: null };
}

function evaluateQueryAgainstPolicy({ policy, scope }) {
  if (!policy.enabled) {
    return { allowed: false, reason: "AI is disabled by organization policy" };
  }

  const scopePolicy = policy.scopes?.[scope] || policy.scopes?.command_center;
  if (!scopePolicy?.enabled) {
    return { allowed: false, reason: `AI scope ${scope} is disabled` };
  }

  return { allowed: true, reason: null };
}

module.exports = {
  DEFAULT_POLICY,
  evaluateQueryAgainstPolicy,
  evaluateToolAgainstPolicy,
  getOrganizationAiPolicy,
  isActionToolName,
  isPredictiveToolName,
  mergePolicy,
  upsertOrganizationAiPolicy,
};