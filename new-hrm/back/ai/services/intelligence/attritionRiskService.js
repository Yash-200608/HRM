const Resignation = require("../../../models/personalOffice/Resignation");
const { Employee } = require("../../../models/personalOffice/employeeModel");
const PerformanceReview = require("../../../models/personalOffice/performanceReviewModel");
const { LeaveRequest } = require("../../../models/personalOffice/leaveRequestModel");
const { assertOrganizationId, sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");
const { loadAttendanceMetrics } = require("./attendanceMetricsHelper.js");
const { buildLookbackRange, clampScore, resolveRiskLevel } = require("./predictiveUtils.js");

function scoreAttritionRisk({ resignation, attendance, performanceRating, rejectedLeaves, tenureDays }) {
  let score = 0;
  const indicators = [];

  if (resignation?.status === "PENDING") {
    score += 50;
    indicators.push("Pending resignation request");
  } else if (resignation?.status === "APPROVED") {
    score += 40;
    indicators.push("Approved resignation on file");
  }

  if (attendance?.attendancePercentage != null && attendance.attendancePercentage < 70) {
    score += 25;
    indicators.push(`Low attendance (${attendance.attendancePercentage}%)`);
  } else if (attendance?.attendancePercentage != null && attendance.attendancePercentage < 85) {
    score += 15;
    indicators.push(`Below-target attendance (${attendance.attendancePercentage}%)`);
  }

  if (performanceRating != null && performanceRating <= 2) {
    score += 20;
    indicators.push(`Low performance rating (${performanceRating})`);
  } else if (performanceRating === 3) {
    score += 10;
    indicators.push("Average performance rating (3)");
  }

  if (rejectedLeaves >= 2) {
    score += 10;
    indicators.push(`${rejectedLeaves} rejected leave requests`);
  }

  if (tenureDays > 0 && tenureDays < 90) {
    score += 5;
    indicators.push("New hire within first 90 days");
  }

  return {
    score: clampScore(score),
    indicators,
  };
}

async function getAttritionRiskIndicators(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);
  const lookback = buildLookbackRange(Number(args.lookbackDays) || 60);

  const [employees, resignations, attendanceMetrics, reviews, rejectedLeaveCounts] =
    await Promise.all([
      Employee.find({ createdBy: orgId, status: "ACTIVE" })
        .select("fullName department designation joinDate status")
        .populate("department", "name")
        .lean(),
      Resignation.find({
        companyId: orgId,
        status: { $in: ["PENDING", "APPROVED"] },
      }).lean(),
      loadAttendanceMetrics(orgId, lookback.startDate, lookback.endDate),
      PerformanceReview.find({
        companyId: orgId,
        rating: { $ne: null },
      })
        .sort({ updatedAt: -1 })
        .lean(),
      LeaveRequest.aggregate([
        {
          $match: {
            createdBy: orgId,
            status: "Rejected",
            appliedDate: { $gte: lookback.startDate },
          },
        },
        { $group: { _id: "$user", count: { $sum: 1 } } },
      ]),
    ]);

  const resignationByEmployee = new Map(
    resignations.map((item) => [String(item.employeeId), item])
  );
  const latestRatingByEmployee = new Map();
  reviews.forEach((review) => {
    const key = String(review.employeeId);
    if (!latestRatingByEmployee.has(key)) {
      latestRatingByEmployee.set(key, review.rating);
    }
  });
  const rejectedLeavesByEmployee = new Map(
    rejectedLeaveCounts.map((item) => [String(item._id), item.count])
  );

  const now = Date.now();
  const scoredEmployees = employees.map((employee) => {
    const employeeId = String(employee._id);
    const tenureDays = employee.joinDate
      ? Math.floor((now - new Date(employee.joinDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const risk = scoreAttritionRisk({
      resignation: resignationByEmployee.get(employeeId),
      attendance: attendanceMetrics.get(employeeId),
      performanceRating: latestRatingByEmployee.get(employeeId) ?? null,
      rejectedLeaves: rejectedLeavesByEmployee.get(employeeId) || 0,
      tenureDays,
    });

    return {
      employeeId,
      employeeName: employee.fullName,
      department: employee.department?.name || "-",
      designation: employee.designation,
      riskScore: risk.score,
      riskLevel: resolveRiskLevel(risk.score),
      indicators: risk.indicators,
    };
  });

  const atRiskEmployees = scoredEmployees
    .filter((employee) => employee.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);

  const summary = {
    totalEmployees: employees.length,
    atRiskCount: scoredEmployees.filter((employee) => employee.riskScore >= 40).length,
    criticalCount: scoredEmployees.filter((employee) => employee.riskLevel === "critical").length,
    pendingResignations: resignations.filter((item) => item.status === "PENDING").length,
    lookbackDays: lookback.days,
  };

  return {
    summary,
    atRiskEmployees,
    methodology:
      "Heuristic risk model using resignation status, attendance, performance ratings, rejected leaves, and tenure.",
  };
}

module.exports = {
  getAttritionRiskIndicators,
  scoreAttritionRisk,
};