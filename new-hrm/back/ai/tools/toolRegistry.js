/** @typedef {import('./tool.types.js').ToolDefinition} ToolDefinition */
/** @typedef {import('./tool.types.js').ToolContext} ToolContext */
/** @typedef {import('./tool.types.js').ToolResult} ToolResult */

const { echoCapabilitiesTool } = require("./readOnly/echoCapabilities.tool.js");
const { getAttendanceSummaryTool } = require("./readOnly/getAttendanceSummary.tool.js");
const { getPendingLeavesTool } = require("./readOnly/getPendingLeaves.tool.js");
const { getDepartmentPayrollCostTool } = require("./readOnly/getDepartmentPayrollCost.tool.js");
const { getEmployeeProfileSummaryTool } = require("./readOnly/getEmployeeProfileSummary.tool.js");
const { getTeamPerformanceSummaryTool } = require("./readOnly/getTeamPerformanceSummary.tool.js");
const { draftLeaveRequestTool } = require("./actionable/draftLeaveRequest.tool.js");
const { draftAnnouncementTool } = require("./actionable/draftAnnouncement.tool.js");
const { createWorkflowDraftTool } = require("./actionable/createWorkflowDraft.tool.js");
const { scheduleReviewReminderTool } = require("./actionable/scheduleReviewReminder.tool.js");
const { getAttritionRiskTool } = require("./intelligence/getAttritionRisk.tool.js");
const { getBurnoutRiskTool } = require("./intelligence/getBurnoutRisk.tool.js");
const { getPayrollAnomaliesTool } = require("./intelligence/getPayrollAnomalies.tool.js");
const { getSeatUtilizationTool } = require("./intelligence/getSeatUtilization.tool.js");

const DEFAULT_TOOLS = [
  echoCapabilitiesTool,
  getAttendanceSummaryTool,
  getPendingLeavesTool,
  getDepartmentPayrollCostTool,
  getEmployeeProfileSummaryTool,
  getTeamPerformanceSummaryTool,
  draftLeaveRequestTool,
  draftAnnouncementTool,
  createWorkflowDraftTool,
  scheduleReviewReminderTool,
  getAttritionRiskTool,
  getBurnoutRiskTool,
  getPayrollAnomaliesTool,
  getSeatUtilizationTool,
];

/** @type {Map<string, ToolDefinition>} */
const registry = new Map();

function registerTool(tool) {
  if (!tool?.name) {
    throw new Error("Tool name is required");
  }
  registry.set(tool.name, tool);
}

function listRegisteredTools() {
  return Array.from(registry.values());
}

function getTool(name) {
  return registry.get(name) || null;
}

function userCanAccessTool(ctx, tool) {
  if (!tool) {
    return false;
  }

  if (tool.adminOnly && ctx.role !== "admin" && ctx.role !== "super_admin") {
    return false;
  }

  if (tool.requiredEntitlements?.length) {
    const entitled = new Set(ctx.entitlements || []);
    if (ctx.role !== "super_admin") {
      if (!tool.requiredEntitlements.every((key) => entitled.has(key))) {
        return false;
      }
    }
  }

  if (tool.requiredActions?.length) {
    if (ctx.role === "admin" || ctx.role === "super_admin") {
      return true;
    }

    const permissions = ctx.permissions || {};
    const allowed = tool.requiredActions.every(
      (entry) => permissions[entry.module]?.[entry.action]
    );
    if (!allowed) {
      return false;
    }
  }

  if (tool.requiredModules?.length) {
    if (ctx.role === "admin" || ctx.role === "super_admin") {
      return true;
    }

    const permissions = ctx.permissions || {};
    const action = tool.kind === "action" ? "create" : "view";
    return tool.requiredModules.every(
      (module) => permissions[module]?.[action] || permissions[module]?.view
    );
  }

  return true;
}

function getAccessibleTools(ctx) {
  return listRegisteredTools().filter((tool) => userCanAccessTool(ctx, tool));
}

function toProviderToolDefinitions(tools) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

async function executeTool(ctx, toolName, args = {}) {
  const tool = getTool(toolName);

  if (!tool) {
    return {
      toolName,
      success: false,
      error: "Unknown tool",
    };
  }

  if (ctx.aiPolicy) {
    const { canAccessToolWithPolicy } = require("../services/aiPermissionScopeService.js");
    const policyResult = canAccessToolWithPolicy(ctx, tool, ctx.aiPolicy, ctx.aiScope || "command_center");
    if (!policyResult.allowed) {
      return {
        toolName,
        success: false,
        error: policyResult.reason || "Tool not permitted for this user",
      };
    }
  } else if (!userCanAccessTool(ctx, tool)) {
    return {
      toolName,
      success: false,
      error: "Tool not permitted for this user",
    };
  }

  try {
    const result = await tool.execute(ctx, args);
    return {
      toolName,
      success: true,
      data: result.data,
      summary: result.summary || null,
      requiresConfirmation: Boolean(result.requiresConfirmation),
      draftId: result.draftId || null,
      actionType: result.actionType || null,
    };
  } catch (error) {
    return {
      toolName,
      success: false,
      error: error.message || "Tool execution failed",
    };
  }
}

function bootstrapDefaultTools() {
  if (registry.size > 0) {
    return;
  }

  DEFAULT_TOOLS.forEach((tool) => registerTool(tool));
}

bootstrapDefaultTools();

function clearToolRegistryForTests() {
  registry.clear();
}

module.exports = {
  bootstrapDefaultTools,
  clearToolRegistryForTests,
  executeTool,
  getAccessibleTools,
  getTool,
  listRegisteredTools,
  registerTool,
  toProviderToolDefinitions,
  userCanAccessTool,
};