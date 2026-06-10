const {
  executeTool,
  getAccessibleTools,
  toProviderToolDefinitions,
} = require("../tools/toolRegistry.js");

function buildToolContext(req) {
  return {
    userId: req.user.id,
    companyId: req.user.companyId || null,
    role: req.user.role,
    permissions: req.user.permissions || null,
    tenantContext: req.tenantContext || null,
    correlationId: req.correlationId || null,
    entitlements: Array.isArray(req.user.entitlements) ? req.user.entitlements : [],
    aiPolicy: req.aiPolicy || null,
    aiScope: req.aiScope || "command_center",
  };
}

function getToolsForRequest(req) {
  const ctx = buildToolContext(req);
  let tools;

  if (ctx.aiPolicy) {
    const { getAccessibleToolsForContext } = require("./aiPermissionScopeService.js");
    tools = getAccessibleToolsForContext(ctx, ctx.aiPolicy, ctx.aiScope);
  } else {
    tools = getAccessibleTools(ctx);
  }

  return {
    ctx,
    tools,
    providerTools: toProviderToolDefinitions(tools),
  };
}

module.exports = {
  buildToolContext,
  executeTool,
  getToolsForRequest,
};