const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  calculateEmployeeAttendancePercentage,
  getMonthName,
  resolveMonthYear,
  sanitizeToolArgs,
  scoreAttendanceStatus,
} = require("../service/hrAnalyticsReadService.js");

test("scoreAttendanceStatus maps HR attendance states", () => {
  assert.equal(scoreAttendanceStatus("Present"), 1);
  assert.equal(scoreAttendanceStatus("Overtime"), 1);
  assert.equal(scoreAttendanceStatus("Half Day"), 0.5);
  assert.equal(scoreAttendanceStatus("Holiday"), null);
  assert.equal(scoreAttendanceStatus("Absent"), 0);
});

test("calculateEmployeeAttendancePercentage excludes holidays from denominator", () => {
  const percentage = calculateEmployeeAttendancePercentage(5, {
    1: "Present",
    2: "Present",
    3: "Holiday",
    4: "Absent",
    5: "Half Day",
  });

  assert.equal(percentage, 62.5);
});

test("resolveMonthYear parses YYYY-MM and defaults to current month", () => {
  const parsed = resolveMonthYear({ month: "2026-06" });
  assert.equal(parsed.year, 2026);
  assert.equal(parsed.monthNum, 6);
  assert.equal(parsed.monthKey, "2026-06");
  assert.equal(parsed.monthName, "june");
  assert.equal(parsed.daysInMonth, 30);

  const current = resolveMonthYear({});
  assert.ok(current.year >= 2020);
  assert.ok(current.monthNum >= 1 && current.monthNum <= 12);
});

test("sanitizeToolArgs strips tenant identifiers from tool arguments", () => {
  const safe = sanitizeToolArgs({
    month: "2026-06",
    companyId: "evil-org",
    userId: "evil-user",
    threshold: 80,
  });

  assert.equal(safe.month, "2026-06");
  assert.equal(safe.threshold, 80);
  assert.equal(safe.companyId, undefined);
  assert.equal(safe.userId, undefined);
});

test("getMonthName returns lowercase month names used by payroll", () => {
  assert.equal(getMonthName(1), "january");
  assert.equal(getMonthName(12), "december");
});