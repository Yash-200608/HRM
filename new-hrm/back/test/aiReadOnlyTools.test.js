const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const {
  bootstrapDefaultTools,
  clearToolRegistryForTests,
  executeTool,
  getAccessibleTools,
  listRegisteredTools,
} = require("../ai/tools/toolRegistry.js");

afterEach(() => {
  clearToolRegistryForTests();
  bootstrapDefaultTools();
});

test("tool registry includes Phase 2 read-only analytics tools", () => {
  const names = listRegisteredTools().map((tool) => tool.name).sort();
  assert.ok(names.includes("getAttendanceSummary"));
  assert.ok(names.includes("draftLeaveRequest"));
  assert.ok(names.includes("draftAnnouncement"));
  assert.ok(names.includes("createWorkflowDraft"));
  assert.ok(names.includes("scheduleReviewReminder"));
  assert.ok(names.includes("getAttritionRisk"));
  assert.ok(names.includes("getSeatUtilization"));
  assert.equal(names.length, 14);
});

test("employee without payroll permission cannot access payroll tool", async () => {
  const ctx = {
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: {
      attendance: { view: true },
      leave: { view: true },
    },
    entitlements: ["aiAssistant"],
    tenantContext: { planCode: "professional" },
    correlationId: "corr-1",
  };

  const accessible = getAccessibleTools(ctx).map((tool) => tool.name);
  assert.ok(accessible.includes("getAttendanceSummary"));
  assert.ok(accessible.includes("getPendingLeaves"));
  assert.equal(accessible.includes("getDepartmentPayrollCost"), false);

  const result = await executeTool(ctx, "getDepartmentPayrollCost", { month: "2026-06" });
  assert.equal(result.success, false);
  assert.equal(result.error, "Tool not permitted for this user");
});

test("admin can access all read-only analytics tools", () => {
  const ctx = {
    userId: "admin-1",
    companyId: "org-1",
    role: "admin",
    permissions: null,
    entitlements: ["aiAssistant"],
    tenantContext: { planCode: "professional" },
    correlationId: "corr-1",
  };

  const accessible = getAccessibleTools(ctx).map((tool) => tool.name);
  assert.ok(accessible.includes("getAttendanceSummary"));
  assert.ok(accessible.includes("getPendingLeaves"));
  assert.ok(accessible.includes("getDepartmentPayrollCost"));
  assert.ok(accessible.includes("getEmployeeProfileSummary"));
  assert.ok(accessible.includes("getTeamPerformanceSummary"));
});