const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const {
  bootstrapDefaultTools,
  clearToolRegistryForTests,
  getAccessibleTools,
  userCanAccessTool,
  getTool,
} = require("../ai/tools/toolRegistry.js");
const { sanitizeToolArgs } = require("../service/hrAnalyticsReadService.js");

afterEach(() => {
  clearToolRegistryForTests();
  bootstrapDefaultTools();
});

test("action tools are registered with action kind", () => {
  const actionTools = [
    "draftLeaveRequest",
    "draftAnnouncement",
    "createWorkflowDraft",
    "scheduleReviewReminder",
  ];

  actionTools.forEach((name) => {
    const tool = getTool(name);
    assert.ok(tool);
    assert.equal(tool.kind, "action");
  });
});

test("draftAnnouncement is admin-only", () => {
  const tool = getTool("draftAnnouncement");
  const employeeCtx = {
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: { leave: { view: true, create: true } },
    entitlements: ["aiAssistant", "announcements"],
  };

  assert.equal(userCanAccessTool(employeeCtx, tool), false);

  const adminCtx = {
    ...employeeCtx,
    role: "admin",
  };
  assert.equal(userCanAccessTool(adminCtx, tool), true);
});

test("createWorkflowDraft requires workflowAutomation entitlement", () => {
  const tool = getTool("createWorkflowDraft");
  const adminWithoutWorkflow = {
    userId: "admin-1",
    companyId: "org-1",
    role: "admin",
    permissions: null,
    entitlements: ["aiAssistant"],
  };

  assert.equal(userCanAccessTool(adminWithoutWorkflow, tool), false);

  const adminWithWorkflow = {
    ...adminWithoutWorkflow,
    entitlements: ["aiAssistant", "workflowAutomation"],
  };
  assert.equal(userCanAccessTool(adminWithWorkflow, tool), true);
});

test("draftLeaveRequest requires leave create permission for employees", () => {
  const tool = getTool("draftLeaveRequest");

  const employeeViewOnly = {
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: { leave: { view: true } },
    entitlements: ["aiAssistant"],
  };
  assert.equal(userCanAccessTool(employeeViewOnly, tool), false);

  const employeeCreate = {
    ...employeeViewOnly,
    permissions: { leave: { view: true, create: true } },
  };
  assert.equal(userCanAccessTool(employeeCreate, tool), true);
  assert.ok(getAccessibleTools(employeeCreate).map((t) => t.name).includes("draftLeaveRequest"));
});

test("sanitizeToolArgs blocks tenant injection in action payloads", () => {
  const safe = sanitizeToolArgs({
    title: "Hello",
    companyId: "evil",
    userId: "evil-user",
    fromDate: "2026-06-10",
  });

  assert.equal(safe.title, "Hello");
  assert.equal(safe.fromDate, "2026-06-10");
  assert.equal(safe.companyId, undefined);
  assert.equal(safe.userId, undefined);
});