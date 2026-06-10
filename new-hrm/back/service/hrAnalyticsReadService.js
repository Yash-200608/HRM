const mongoose = require("mongoose");
const Attendance = require("../models/personalOffice/attendanceModel");
const { Employee } = require("../models/personalOffice/employeeModel");
const { LeaveRequest } = require("../models/personalOffice/leaveRequestModel");
const PayRoll = require("../models/personalOffice/payRollModel");
const Department = require("../models/personalOffice/departmentModel");
const PerformanceCycle = require("../models/personalOffice/performanceCycleModel");
const PerformanceReview = require("../models/personalOffice/performanceReviewModel");

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const FORBIDDEN_ARG_KEYS = new Set(["companyId", "organizationId", "orgId", "userId", "createdBy"]);

function assertOrganizationId(organizationId) {
  if (!organizationId) {
    throw new Error("Organization context is required");
  }
  return String(organizationId);
}

function sanitizeToolArgs(args = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (!FORBIDDEN_ARG_KEYS.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}

function getMonthName(monthNumber) {
  return MONTH_NAMES[monthNumber - 1] || null;
}

function resolveMonthYear(args = {}) {
  const now = new Date();

  if (typeof args.month === "string" && /^\d{4}-\d{2}$/.test(args.month)) {
    const [year, monthNum] = args.month.split("-").map(Number);
    return {
      year,
      monthNum,
      monthKey: args.month,
      monthName: getMonthName(monthNum),
      daysInMonth: new Date(year, monthNum, 0).getDate(),
    };
  }

  const year = Number(args.year) || now.getFullYear();
  const monthNum = Number(args.month) || now.getMonth() + 1;

  return {
    year,
    monthNum,
    monthKey: `${year}-${String(monthNum).padStart(2, "0")}`,
    monthName: getMonthName(monthNum),
    daysInMonth: new Date(year, monthNum, 0).getDate(),
  };
}

function buildMonthDateRange({ year, monthNum, daysInMonth }) {
  const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, monthNum - 1, daysInMonth, 23, 59, 59, 999);
  return { startDate, endDate };
}

function scoreAttendanceStatus(status) {
  const normalized = String(status || "").trim();
  if (["Present", "Overtime", "Working", "Clocked In"].includes(normalized)) {
    return 1;
  }
  if (normalized === "Half Day") {
    return 0.5;
  }
  if (normalized === "Holiday") {
    return null;
  }
  return 0;
}

function resolveAttendanceDate(attendance) {
  return attendance.attendanceDate || attendance.date || attendance.createdAt || null;
}

function calculateEmployeeAttendancePercentage(daysInMonth, dayStatuses) {
  let eligibleDays = 0;
  let presentScore = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const status = dayStatuses[day];
    if (status == null) {
      eligibleDays += 1;
      continue;
    }

    const score = scoreAttendanceStatus(status);
    if (score === null) {
      continue;
    }

    eligibleDays += 1;
    presentScore += score;
  }

  if (!eligibleDays) {
    return 0;
  }

  return Math.round((presentScore / eligibleDays) * 1000) / 10;
}

async function getAttendanceSummary(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const period = resolveMonthYear(args);
  const threshold = Number(args.threshold) > 0 ? Number(args.threshold) : 80;
  const { startDate, endDate } = buildMonthDateRange(period);

  const employeeQuery = {
    createdBy: orgId,
    status: "ACTIVE",
  };

  if (args.departmentId && mongoose.Types.ObjectId.isValid(args.departmentId)) {
    employeeQuery.department = args.departmentId;
  }

  const [employees, attendances] = await Promise.all([
    Employee.find(employeeQuery).select("fullName department").populate("department", "name").lean(),
    Attendance.find({
      createdBy: orgId,
      $or: [
        { attendanceDate: { $gte: startDate, $lte: endDate } },
        { date: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    }).lean(),
  ]);

  const employeeRows = employees.map((employee) => {
    const dayStatuses = {};
    const employeeAttendance = attendances.filter(
      (record) => String(record.userId) === String(employee._id)
    );

    employeeAttendance.forEach((record) => {
      const rawDate = resolveAttendanceDate(record);
      if (!rawDate) {
        return;
      }
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      dayStatuses[parsed.getDate()] = record.status;
    });

    const attendancePercentage = calculateEmployeeAttendancePercentage(
      period.daysInMonth,
      dayStatuses
    );

    return {
      employeeId: String(employee._id),
      employeeName: employee.fullName,
      department: employee.department?.name || "-",
      attendancePercentage,
    };
  });

  const employeesBelowThreshold = employeeRows
    .filter((row) => row.attendancePercentage < threshold)
    .sort((a, b) => a.attendancePercentage - b.attendancePercentage);

  const averageAttendancePercentage = employeeRows.length
    ? Math.round(
        (employeeRows.reduce((sum, row) => sum + row.attendancePercentage, 0) /
          employeeRows.length) *
          10
      ) / 10
    : 0;

  const departmentMap = new Map();
  employeeRows.forEach((row) => {
    const key = row.department || "-";
    const current = departmentMap.get(key) || { total: 0, count: 0 };
    current.total += row.attendancePercentage;
    current.count += 1;
    departmentMap.set(key, current);
  });

  const departmentBreakdown = Array.from(departmentMap.entries()).map(
    ([department, stats]) => ({
      department,
      employeeCount: stats.count,
      averageAttendancePercentage: Math.round((stats.total / stats.count) * 10) / 10,
    })
  );

  return {
    period,
    threshold,
    organizationSummary: {
      totalEmployees: employeeRows.length,
      averageAttendancePercentage,
      employeesBelowThreshold: employeesBelowThreshold.length,
    },
    employeesBelowThreshold,
    departmentBreakdown,
  };
}

async function getPendingLeaves(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 100);

  const pending = await LeaveRequest.find({
    createdBy: orgId,
    status: "Pending",
  })
    .populate("user", "fullName email designation department")
    .populate("leaveType", "name paid")
    .sort({ appliedDate: -1 })
    .limit(limit)
    .lean();

  const requests = pending.map((request) => ({
    requestId: String(request._id),
    employeeName: request.user?.fullName || "Unknown",
    designation: request.user?.designation || null,
    leaveType: request.leaveType?.name || "Unknown",
    paid: Boolean(request.leaveType?.paid),
    fromDate: request.fromDate,
    toDate: request.toDate,
    totalDays: request.totalDays,
    appliedDate: request.appliedDate,
    description: request.description || "",
  }));

  return {
    totalPending: requests.length,
    requests,
  };
}

async function getDepartmentPayrollCost(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const period = resolveMonthYear(args);

  if (!period.monthName) {
    throw new Error("Invalid month");
  }

  const salaries = await PayRoll.find({
    createdBy: orgId,
    month: period.monthName,
    year: period.year,
  })
    .populate("departmentId", "name")
    .lean();

  const departmentMap = new Map();

  salaries.forEach((record) => {
    const departmentId = String(record.departmentId?._id || record.departmentId || "unassigned");
    const departmentName = record.departmentId?.name || "Unassigned";
    const netSalary =
      (Number(record.basic) || 0) +
      (Number(record.allowance) || 0) -
      (Number(record.deductions) || 0);

    const current = departmentMap.get(departmentId) || {
      departmentId,
      departmentName,
      totalCost: 0,
      employeeCount: 0,
    };

    current.totalCost += netSalary;
    current.employeeCount += 1;
    departmentMap.set(departmentId, current);
  });

  const departments = Array.from(departmentMap.values())
    .map((entry) => ({
      departmentId: entry.departmentId,
      departmentName: entry.departmentName,
      totalCost: Math.round(entry.totalCost * 100) / 100,
      employeeCount: entry.employeeCount,
      averageCost:
        entry.employeeCount > 0
          ? Math.round((entry.totalCost / entry.employeeCount) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const organizationTotal = departments.reduce((sum, row) => sum + row.totalCost, 0);

  return {
    period: {
      month: period.monthName,
      year: period.year,
      monthKey: period.monthKey,
    },
    organizationTotal: Math.round(organizationTotal * 100) / 100,
    departments,
  };
}

async function getEmployeeProfileSummary(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);

  const query = {
    createdBy: orgId,
  };

  if (args.employeeId && mongoose.Types.ObjectId.isValid(args.employeeId)) {
    query._id = args.employeeId;
  }

  if (args.departmentId && mongoose.Types.ObjectId.isValid(args.departmentId)) {
    query.department = args.departmentId;
  }

  if (args.status) {
    query.status = String(args.status).toUpperCase();
  } else if (!args.employeeId) {
    query.status = "ACTIVE";
  }

  if (args.search) {
    const term = String(args.search).trim();
    if (term) {
      query.$or = [
        { fullName: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { employeeId: { $regex: term, $options: "i" } },
      ];
    }
  }

  const employees = await Employee.find(query)
    .select(
      "fullName email designation employeeId status joinDate employeeType department monthSalary profileImage"
    )
    .populate("department", "name")
    .sort({ fullName: 1 })
    .limit(limit)
    .lean();

  const summaries = employees.map((employee) => ({
    employeeId: String(employee._id),
    fullName: employee.fullName,
    email: employee.email,
    designation: employee.designation,
    employeeCode: employee.employeeId || null,
    status: employee.status,
    department: employee.department?.name || "-",
    joinDate: employee.joinDate || null,
    employeeType: employee.employeeType || null,
    monthSalary: employee.monthSalary ?? null,
  }));

  return {
    count: summaries.length,
    employees: summaries,
  };
}

async function getTeamPerformanceSummary(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);

  let cycle = null;
  if (args.cycleId && mongoose.Types.ObjectId.isValid(args.cycleId)) {
    cycle = await PerformanceCycle.findOne({ _id: args.cycleId, companyId: orgId }).lean();
  } else {
    cycle = await PerformanceCycle.findOne({ companyId: orgId, status: "ACTIVE" })
      .sort({ startDate: -1 })
      .lean();

    if (!cycle) {
      cycle = await PerformanceCycle.findOne({ companyId: orgId })
        .sort({ startDate: -1 })
        .lean();
    }
  }

  if (!cycle) {
    return {
      cycle: null,
      message: "No performance cycles found for this organization",
      summary: {
        totalReviews: 0,
        pendingReviews: 0,
        submittedReviews: 0,
        averageRating: null,
      },
      departments: [],
      topPerformers: [],
      needsAttention: [],
    };
  }

  const reviewFilter = {
    companyId: orgId,
    cycleId: cycle._id,
  };

  const reviews = await PerformanceReview.find(reviewFilter)
    .populate({
      path: "employeeId",
      select: "fullName designation department",
      populate: { path: "department", select: "name" },
    })
    .populate("reviewerId", "username email")
    .lean();

  const departmentMap = new Map();
  const ratedReviews = [];
  const pendingReviews = [];
  const needsAttention = [];
  const topPerformers = [];

  reviews.forEach((review) => {
    const departmentName = review.employeeId?.department?.name || "Unassigned";

    if (review.status === "PENDING") {
      pendingReviews.push(review);
    }

    if (review.rating != null) {
      ratedReviews.push(review);
    }

    const deptStats = departmentMap.get(departmentName) || {
      department: departmentName,
      reviewCount: 0,
      ratingTotal: 0,
      ratedCount: 0,
      pendingCount: 0,
    };

    deptStats.reviewCount += 1;
    if (review.status === "PENDING") {
      deptStats.pendingCount += 1;
    }
    if (review.rating != null) {
      deptStats.ratingTotal += review.rating;
      deptStats.ratedCount += 1;
    }
    departmentMap.set(departmentName, deptStats);

    if (review.rating != null && review.rating >= 4) {
      topPerformers.push({
        employeeName: review.employeeId?.fullName || "Unknown",
        rating: review.rating,
        department: departmentName,
        status: review.status,
      });
    }

    if (
      review.status === "PENDING" ||
      (review.rating != null && review.rating <= 2)
    ) {
      needsAttention.push({
        employeeName: review.employeeId?.fullName || "Unknown",
        rating: review.rating,
        department: departmentName,
        status: review.status,
        reason:
          review.status === "PENDING"
            ? "Review pending"
            : "Low performance rating",
      });
    }
  });

  if (args.departmentId && mongoose.Types.ObjectId.isValid(args.departmentId)) {
    const department = await Department.findOne({
      _id: args.departmentId,
      createdBy: orgId,
    })
      .select("name")
      .lean();

    if (department?.name) {
      const filteredName = department.name;
      for (const [key] of departmentMap) {
        if (key !== filteredName) {
          departmentMap.delete(key);
        }
      }
    }
  }

  const departments = Array.from(departmentMap.values()).map((entry) => ({
    department: entry.department,
    reviewCount: entry.reviewCount,
    pendingCount: entry.pendingCount,
    averageRating:
      entry.ratedCount > 0
        ? Math.round((entry.ratingTotal / entry.ratedCount) * 10) / 10
        : null,
  }));

  const averageRating = ratedReviews.length
    ? Math.round(
        (ratedReviews.reduce((sum, review) => sum + review.rating, 0) /
          ratedReviews.length) *
          10
      ) / 10
    : null;

  return {
    cycle: {
      cycleId: String(cycle._id),
      name: cycle.name,
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
    summary: {
      totalReviews: reviews.length,
      pendingReviews: pendingReviews.length,
      submittedReviews: reviews.filter((review) => review.status !== "PENDING").length,
      averageRating,
    },
    departments,
    topPerformers: topPerformers
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10),
    needsAttention: needsAttention.slice(0, 10),
  };
}

module.exports = {
  FORBIDDEN_ARG_KEYS,
  assertOrganizationId,
  buildMonthDateRange,
  calculateEmployeeAttendancePercentage,
  getAttendanceSummary,
  getDepartmentPayrollCost,
  getEmployeeProfileSummary,
  getMonthName,
  getPendingLeaves,
  getTeamPerformanceSummary,
  resolveMonthYear,
  sanitizeToolArgs,
  scoreAttendanceStatus,
};