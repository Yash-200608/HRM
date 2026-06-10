const { Employee } = require("../../../models/personalOffice/employeeModel");
const { assertOrganizationId, sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");
const { loadAttendanceMetrics } = require("./attendanceMetricsHelper.js");
const { buildLookbackRange, clampScore, resolveRiskLevel } = require("./predictiveUtils.js");

function scoreBurnoutRisk(attendance) {
  let score = 0;
  const indicators = [];

  if (!attendance) {
    return { score: 0, indicators: ["Insufficient attendance data"] };
  }

  if (attendance.overtimeDays >= 5) {
    score += 25;
    indicators.push(`${attendance.overtimeDays} overtime days`);
  } else if (attendance.overtimeDays >= 3) {
    score += 15;
    indicators.push(`${attendance.overtimeDays} overtime days`);
  }

  if (attendance.lateDays >= 5) {
    score += 15;
    indicators.push(`${attendance.lateDays} late arrivals`);
  }

  if (attendance.halfDays >= 3) {
    score += 15;
    indicators.push(`${attendance.halfDays} half-day records`);
  }

  if (attendance.absentDays >= 3) {
    score += 15;
    indicators.push(`${attendance.absentDays} absences`);
  }

  if (attendance.attendancePercentage != null && attendance.attendancePercentage < 80) {
    score += 20;
    indicators.push(`Attendance at ${attendance.attendancePercentage}%`);
  }

  if (attendance.averageHours >= 9) {
    score += 20;
    indicators.push(`High average hours (${attendance.averageHours})`);
  } else if (attendance.averageHours >= 8.5) {
    score += 10;
    indicators.push(`Elevated average hours (${attendance.averageHours})`);
  }

  return {
    score: clampScore(score),
    indicators,
  };
}

async function getBurnoutRiskIndicators(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);
  const lookback = buildLookbackRange(Number(args.lookbackDays) || 30);

  const [employees, attendanceMetrics] = await Promise.all([
    Employee.find({ createdBy: orgId, status: "ACTIVE" })
      .select("fullName department designation")
      .populate("department", "name")
      .lean(),
    loadAttendanceMetrics(orgId, lookback.startDate, lookback.endDate),
  ]);

  const scoredEmployees = employees.map((employee) => {
    const employeeId = String(employee._id);
    const risk = scoreBurnoutRisk(attendanceMetrics.get(employeeId));

    return {
      employeeId,
      employeeName: employee.fullName,
      department: employee.department?.name || "-",
      designation: employee.designation,
      riskScore: risk.score,
      riskLevel: resolveRiskLevel(risk.score),
      indicators: risk.indicators,
      metrics: attendanceMetrics.get(employeeId) || null,
    };
  });

  const atRiskEmployees = scoredEmployees
    .filter((employee) => employee.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);

  const departmentMap = new Map();
  scoredEmployees.forEach((employee) => {
    const key = employee.department || "Unassigned";
    const current = departmentMap.get(key) || { total: 0, count: 0, highRisk: 0 };
    current.total += employee.riskScore;
    current.count += 1;
    if (employee.riskScore >= 60) {
      current.highRisk += 1;
    }
    departmentMap.set(key, current);
  });

  const departmentTrends = Array.from(departmentMap.entries()).map(([department, stats]) => ({
    department,
    employeeCount: stats.count,
    averageRiskScore: Math.round((stats.total / stats.count) * 10) / 10,
    highRiskCount: stats.highRisk,
  }));

  return {
    summary: {
      totalEmployees: employees.length,
      atRiskCount: scoredEmployees.filter((employee) => employee.riskScore >= 40).length,
      criticalCount: scoredEmployees.filter((employee) => employee.riskLevel === "critical").length,
      lookbackDays: lookback.days,
    },
    atRiskEmployees,
    departmentTrends: departmentTrends.sort((a, b) => b.averageRiskScore - a.averageRiskScore),
    methodology:
      "Heuristic burnout model using overtime, absences, late arrivals, half-days, attendance rate, and average hours.",
  };
}

module.exports = {
  getBurnoutRiskIndicators,
  scoreBurnoutRisk,
};