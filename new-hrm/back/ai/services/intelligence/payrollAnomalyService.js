const PayRoll = require("../../../models/personalOffice/payRollModel");
const { Employee } = require("../../../models/personalOffice/employeeModel");
const Department = require("../../../models/personalOffice/departmentModel");
const {
  assertOrganizationId,
  getMonthName,
  resolveMonthYear,
  sanitizeToolArgs,
} = require("../../../service/hrAnalyticsReadService.js");
const { mean, percentChange, standardDeviation } = require("./predictiveUtils.js");

function netSalary(record) {
  return (
    (Number(record.basic) || 0) +
    (Number(record.allowance) || 0) -
    (Number(record.deductions) || 0)
  );
}

function shiftMonthPeriod(period, offset = -1) {
  let monthNum = period.monthNum + offset;
  let year = period.year;

  while (monthNum < 1) {
    monthNum += 12;
    year -= 1;
  }
  while (monthNum > 12) {
    monthNum -= 12;
    year += 1;
  }

  return {
    year,
    monthNum,
    monthName: getMonthName(monthNum),
    monthKey: `${year}-${String(monthNum).padStart(2, "0")}`,
  };
}

async function loadPayrollForPeriod(orgId, period) {
  return PayRoll.find({
    createdBy: orgId,
    month: period.monthName,
    year: period.year,
  })
    .populate("employeeId", "fullName status")
    .populate("departmentId", "name")
    .lean();
}

async function getPayrollAnomalies(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  const args = sanitizeToolArgs(rawArgs);
  const currentPeriod = resolveMonthYear(args);
  const previousPeriod = shiftMonthPeriod(currentPeriod, -1);

  const [currentRows, previousRows, activeEmployees, departments] = await Promise.all([
    loadPayrollForPeriod(orgId, currentPeriod),
    loadPayrollForPeriod(orgId, previousPeriod),
    Employee.find({ createdBy: orgId, status: "ACTIVE" }).select("fullName").lean(),
    Department.find({ createdBy: orgId }).select("name").lean(),
  ]);

  const anomalies = [];

  const currentByEmployee = new Map();
  currentRows.forEach((row) => {
    const employeeId = String(row.employeeId?._id || row.employeeId || "");
    if (!employeeId) {
      return;
    }
    if (currentByEmployee.has(employeeId)) {
      anomalies.push({
        type: "duplicate_payroll_entry",
        severity: "high",
        message: "Duplicate payroll record for the same employee in the current period",
        employeeId,
        employeeName: row.employeeId?.fullName || "Unknown",
      });
    }
    currentByEmployee.set(employeeId, row);
  });

  const previousByEmployee = new Map();
  previousRows.forEach((row) => {
    const employeeId = String(row.employeeId?._id || row.employeeId || "");
    if (employeeId) {
      previousByEmployee.set(employeeId, row);
    }
  });

  const currentDeptTotals = new Map();
  const previousDeptTotals = new Map();

  currentRows.forEach((row) => {
    const deptName = row.departmentId?.name || "Unassigned";
    currentDeptTotals.set(deptName, (currentDeptTotals.get(deptName) || 0) + netSalary(row));
  });
  previousRows.forEach((row) => {
    const deptName = row.departmentId?.name || "Unassigned";
    previousDeptTotals.set(deptName, (previousDeptTotals.get(deptName) || 0) + netSalary(row));
  });

  departments.forEach((department) => {
    const deptName = department.name;
    const currentTotal = currentDeptTotals.get(deptName) || 0;
    const previousTotal = previousDeptTotals.get(deptName) || 0;
    const change = percentChange(currentTotal, previousTotal);

    if (previousTotal > 0 && Math.abs(change) >= 25) {
      anomalies.push({
        type: "department_cost_swing",
        severity: Math.abs(change) >= 40 ? "high" : "medium",
        message: `Department payroll changed ${change}% month-over-month`,
        department: deptName,
        currentTotal: Math.round(currentTotal * 100) / 100,
        previousTotal: Math.round(previousTotal * 100) / 100,
        percentChange: change,
      });
    }
  });

  const salaries = currentRows.map((row) => netSalary(row));
  const salaryMean = mean(salaries);
  const salaryStdDev = standardDeviation(salaries);

  currentRows.forEach((row) => {
    const employeeId = String(row.employeeId?._id || row.employeeId || "");
    const currentNet = netSalary(row);
    const previousNet = previousByEmployee.has(employeeId)
      ? netSalary(previousByEmployee.get(employeeId))
      : null;

    if (previousNet != null && previousNet > 0) {
      const change = percentChange(currentNet, previousNet);
      if (Math.abs(change) >= 30) {
        anomalies.push({
          type: "employee_salary_swing",
          severity: Math.abs(change) >= 50 ? "high" : "medium",
          message: `Employee payroll changed ${change}% versus prior month`,
          employeeId,
          employeeName: row.employeeId?.fullName || "Unknown",
          currentNet: Math.round(currentNet * 100) / 100,
          previousNet: Math.round(previousNet * 100) / 100,
          percentChange: change,
        });
      }
    }

    if (salaryStdDev > 0 && currentNet > salaryMean + salaryStdDev * 2) {
      anomalies.push({
        type: "salary_outlier_high",
        severity: "medium",
        message: "Employee payroll is significantly above peer average",
        employeeId,
        employeeName: row.employeeId?.fullName || "Unknown",
        currentNet: Math.round(currentNet * 100) / 100,
        peerAverage: Math.round(salaryMean * 100) / 100,
      });
    }
  });

  activeEmployees.forEach((employee) => {
    const employeeId = String(employee._id);
    if (!currentByEmployee.has(employeeId)) {
      anomalies.push({
        type: "missing_payroll_record",
        severity: "medium",
        message: "Active employee has no payroll record for the current period",
        employeeId,
        employeeName: employee.fullName,
      });
    }
  });

  const severityRank = { high: 3, medium: 2, low: 1 };
  anomalies.sort(
    (a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
  );

  return {
    period: {
      current: currentPeriod.monthKey,
      previous: previousPeriod.monthKey,
    },
    summary: {
      currentPayrollRecords: currentRows.length,
      previousPayrollRecords: previousRows.length,
      anomalyCount: anomalies.length,
      highSeverityCount: anomalies.filter((item) => item.severity === "high").length,
    },
    anomalies: anomalies.slice(0, 50),
    methodology:
      "Detects duplicate entries, missing active-employee payroll, month-over-month salary swings, department cost swings, and high outliers.",
  };
}

module.exports = {
  getPayrollAnomalies,
  netSalary,
};