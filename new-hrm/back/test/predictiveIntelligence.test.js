const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { scoreAttritionRisk } = require("../ai/services/intelligence/attritionRiskService.js");
const { scoreBurnoutRisk } = require("../ai/services/intelligence/burnoutRiskService.js");
const {
  assessChurnRisk,
  buildUpgradeRecommendation,
} = require("../ai/services/intelligence/seatUtilizationService.js");
const { netSalary } = require("../ai/services/intelligence/payrollAnomalyService.js");
const {
  clampScore,
  percentChange,
  resolveRiskLevel,
} = require("../ai/services/intelligence/predictiveUtils.js");
const {
  bootstrapDefaultTools,
  clearToolRegistryForTests,
  getAccessibleTools,
  getTool,
  listRegisteredTools,
} = require("../ai/tools/toolRegistry.js");

afterEach(() => {
  clearToolRegistryForTests();
  bootstrapDefaultTools();
});

test("resolveRiskLevel maps scores to severity bands", () => {
  assert.equal(resolveRiskLevel(10), "low");
  assert.equal(resolveRiskLevel(45), "medium");
  assert.equal(resolveRiskLevel(65), "high");
  assert.equal(resolveRiskLevel(90), "critical");
});

test("scoreAttritionRisk weights resignation and attendance signals", () => {
  const high = scoreAttritionRisk({
    resignation: { status: "PENDING" },
    attendance: { attendancePercentage: 65 },
    performanceRating: 2,
    rejectedLeaves: 0,
    tenureDays: 120,
  });

  assert.equal(high.riskLevel || resolveRiskLevel(high.score), "critical");
  assert.ok(high.indicators.length >= 3);

  const low = scoreAttritionRisk({
    resignation: null,
    attendance: { attendancePercentage: 95 },
    performanceRating: 5,
    rejectedLeaves: 0,
    tenureDays: 400,
  });
  assert.ok(low.score < 20);
});

test("scoreBurnoutRisk detects overtime and hour overload", () => {
  const risk = scoreBurnoutRisk({
    overtimeDays: 6,
    lateDays: 2,
    halfDays: 1,
    absentDays: 1,
    attendancePercentage: 78,
    averageHours: 9.2,
    records: 20,
  });

  assert.ok(risk.score >= 40);
  assert.ok(risk.indicators.some((item) => /overtime/i.test(item)));
});

test("netSalary and percentChange helpers work for anomaly detection", () => {
  assert.equal(netSalary({ basic: 1000, allowance: 200, deductions: 50 }), 1150);
  assert.equal(percentChange(1250, 1000), 25);
});

test("seat utilization upgrade recommendation triggers near capacity", () => {
  const urgent = buildUpgradeRecommendation(96, 48, 50);
  assert.equal(urgent.type, "urgent_upgrade");

  const healthy = buildUpgradeRecommendation(60, 30, 50);
  assert.equal(healthy.type, "healthy_utilization");
});

test("assessChurnRisk flags suspended subscriptions and unpaid invoices", () => {
  const risk = assessChurnRisk(
    { status: "SUSPENDED", trialEndsAt: null },
    [{ status: "open" }, { status: "past_due" }]
  );

  assert.equal(risk.level, "high");
  assert.ok(risk.factors.length >= 2);
});

test("predictive intelligence tools are registered with correct access", () => {
  const names = listRegisteredTools().map((tool) => tool.name);
  assert.ok(names.includes("getAttritionRisk"));
  assert.ok(names.includes("getBurnoutRisk"));
  assert.ok(names.includes("getPayrollAnomalies"));
  assert.ok(names.includes("getSeatUtilization"));
  assert.equal(getTool("getSeatUtilization").adminOnly, true);
});

test("getSeatUtilization is admin-only in accessible tool set", () => {
  const employeeTools = getAccessibleTools({
    userId: "emp-1",
    companyId: "org-1",
    role: "employee",
    permissions: {
      employees: { view: true },
      attendance: { view: true },
      payroll: { view: true },
    },
    entitlements: ["aiAssistant"],
  }).map((tool) => tool.name);

  assert.ok(employeeTools.includes("getAttritionRisk"));
  assert.equal(employeeTools.includes("getSeatUtilization"), false);

  const adminTools = getAccessibleTools({
    userId: "admin-1",
    companyId: "org-1",
    role: "admin",
    permissions: null,
    entitlements: ["aiAssistant"],
  }).map((tool) => tool.name);

  assert.ok(adminTools.includes("getSeatUtilization"));
});

test("clampScore bounds risk values", () => {
  assert.equal(clampScore(140), 100);
  assert.equal(clampScore(-4), 0);
});