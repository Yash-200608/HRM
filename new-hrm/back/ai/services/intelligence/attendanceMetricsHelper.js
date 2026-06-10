const Attendance = require("../../../models/personalOffice/attendanceModel");

function resolveAttendanceDate(record) {
  return record.attendanceDate || record.date || record.createdAt || null;
}

async function loadAttendanceMetrics(organizationId, startDate, endDate) {
  const attendances = await Attendance.find({
    createdBy: organizationId,
    $or: [
      { attendanceDate: { $gte: startDate, $lte: endDate } },
      { date: { $gte: startDate, $lte: endDate } },
      { createdAt: { $gte: startDate, $lte: endDate } },
    ],
  }).lean();

  const metricsByEmployee = new Map();

  attendances.forEach((record) => {
    const employeeId = String(record.userId);
    const current = metricsByEmployee.get(employeeId) || {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      overtimeDays: 0,
      lateDays: 0,
      holidayDays: 0,
      totalHours: 0,
      records: 0,
    };

    const status = String(record.status || "").trim();
    current.records += 1;

    if (["Present", "Working", "Clocked In"].includes(status)) {
      current.presentDays += 1;
    } else if (status === "Overtime") {
      current.presentDays += 1;
      current.overtimeDays += 1;
    } else if (status === "Half Day") {
      current.halfDays += 1;
      current.presentDays += 0.5;
    } else if (status === "Absent") {
      current.absentDays += 1;
    } else if (status === "Holiday") {
      current.holidayDays += 1;
    }

    if (record.isLate) {
      current.lateDays += 1;
    }

    current.totalHours += Number(record.hoursWorked) || 0;
    metricsByEmployee.set(employeeId, current);
  });

  metricsByEmployee.forEach((metrics, employeeId) => {
    const workingDays = metrics.presentDays + metrics.absentDays + metrics.halfDays;
    metrics.attendancePercentage =
      workingDays > 0 ? Math.round((metrics.presentDays / workingDays) * 1000) / 10 : null;
    metrics.averageHours =
      metrics.records > 0 ? Math.round((metrics.totalHours / metrics.records) * 10) / 10 : 0;
    metricsByEmployee.set(employeeId, metrics);
  });

  return metricsByEmployee;
}

module.exports = {
  loadAttendanceMetrics,
  resolveAttendanceDate,
};