const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const {
  DEFAULT_POLICY,
  evaluateQueryAgainstPolicy,
  evaluateToolAgainstPolicy,
  mergePolicy,
} = require("../ai/services/aiPolicyEngine.js");
const {
  canAccessToolWithPolicy,
  getAccessibleToolsForContext,
  toolAllowedByScope,
} = require("../ai/services/aiPermissionScopeService.js");
const {
  bootstrapDefaultTools,
  clearToolRegistryForTests,
  getTool,
} = require("../ai/tools/toolRegistry.js");

afterEach(() => {
  clearToolRegistryForTests();
  bootstrapDefaultTools();
});

test("mergePolicy returns defaults when no stored policy exists", () => {
  const policy = mergePolicy(null);
  assert.equal(policy.isDefault, true);
  assert.equal(policy.enabled, true);
  assert.equal(policy.memory.retentionDays, 30);
  assert.equal(policy.scopes.employee_copilot.enabled, true);
});

test("evaluateQueryAgainstPolicy denies when organization AI is disabled", () => {
  const policy = { ...DEFAULT_POLICY, enabled: false };
  const result = evaluateQueryAgainstPolicy({ policy, scope: "command_center" });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /disabled/i);
});

test("evaluateQueryAgainstPolicy denies when scope is disabled", () => {
  const policy = {
    ...DEFAULT_POLICY,
    scopes: {
      ...DEFAULT_POLICY.scopes,
      employee_copilot: { enabled: false, allowActionTools: false, allowPredictiveIntelligence: false },
    },
  };
  const result = evaluateQueryAgainstPolicy({ policy, scope: "employee_copilot" });
  assert.equal(result.allowed, false);
});

test("evaluateToolAgainstPolicy blocks predictive tools for employees by default", () => {
  const tool = getTool("getAttritionRisk");
  const ctx = {
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: { reports: { view: true } },
    entitlements: ["aiAssistant"],
  };

  const result = evaluateToolAgainstPolicy({
    tool,
    ctx,
    policy: DEFAULT_POLICY,
    scope: "command_center",
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /employees|predictive/i);
});

test("evaluateToolAgainstPolicy respects organization blockedTools list", () => {
  const tool = getTool("getPendingLeaves");
  const policy = {
    ...DEFAULT_POLICY,
    blockedTools: ["getPendingLeaves"],
  };
  const ctx = {
    userId: "admin-1",
    companyId: "org-1",
    role: "admin",
    entitlements: ["aiAssistant"],
  };

  const result = evaluateToolAgainstPolicy({
    tool,
    ctx,
    policy,
    scope: "command_center",
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /blocked/i);
});

test("employee_copilot scope allowlist limits tools", () => {
  assert.equal(toolAllowedByScope(getTool("getPendingLeaves"), "employee_copilot"), true);
  assert.equal(toolAllowedByScope(getTool("getAttendanceSummary"), "employee_copilot"), false);
  assert.equal(toolAllowedByScope(getTool("getPendingLeaves"), "command_center"), true);
});

test("getAccessibleToolsForContext applies scope and employee policy restrictions", () => {
  const ctx = {
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: {
      attendance: { view: true },
      leave: { view: true, create: true },
      employees: { view: true },
      reports: { view: true },
    },
    entitlements: ["aiAssistant"],
  };

  const tools = getAccessibleToolsForContext(ctx, DEFAULT_POLICY, "employee_copilot")
    .map((tool) => tool.name)
    .sort();

  assert.deepEqual(tools, [
    "draftLeaveRequest",
    "getAvailableCapabilities",
    "getEmployeeProfileSummary",
    "getPendingLeaves",
  ].sort(), tools.sort());
});

test("canAccessToolWithPolicy denies action tools for employees even in employee_copilot", () => {
  const tool = getTool("draftAnnouncement");
  const ctx = {
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: { reports: { view: true } },
    entitlements: ["aiAssistant"],
  };

  const result = canAccessToolWithPolicy(ctx, tool, DEFAULT_POLICY, "command_center");
  assert.equal(result.allowed, false);
});