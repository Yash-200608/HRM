const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getToolDisplayLabel } = require("../ai/agents/toolDisplayLabels.js");

test("getToolDisplayLabel returns human-friendly titles for AI tools", () => {
  assert.equal(getToolDisplayLabel("getAttendanceSummary"), "Attendance overview");
  assert.equal(getToolDisplayLabel("getPendingLeaves"), "Pending leave requests");
  assert.match(getToolDisplayLabel("customToolName"), /custom tool name/i);
});