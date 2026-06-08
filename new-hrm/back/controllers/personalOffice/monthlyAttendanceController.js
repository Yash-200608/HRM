const Attendance = require("../../models/personalOffice/attendanceModel");
const { Employee } = require("../../models/personalOffice/employeeModel");

exports.getMonthlyAttendance = async (req, res) => {

  try {

    const { month, employeeId } = req.query;

    const companyId = req.user.companyId;

    const [year, monthNum] = month.split("-");

    const daysInMonth = new Date(
      Number(year),
      Number(monthNum),
      0
    ).getDate();

   const startDate = new Date(
  Number(year),
  Number(monthNum) - 1,
  1,
  0,
  0,
  0
);

  const endDate = new Date(
  Number(year),
  Number(monthNum) - 1,
  daysInMonth,
  23,
  59,
  59
);

    // EMPLOYEES
    const employeeQuery = {
      createdBy: companyId,
    };

    if (employeeId) {
      employeeQuery._id = employeeId;
    }

    const employees = await Employee.find(employeeQuery).populate("department", "name");

    // ATTENDANCE
const attendances = await Attendance.find({
  createdBy: companyId,
 $or: [
  {
    attendanceDate: {
      $gte: startDate,
      $lte: endDate,
    },
  },
  {
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  },
  {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  },
],
});

    // MATRIX
    const rows = employees.map((employee) => {

      const days = {};

      for (let i = 1; i <= daysInMonth; i++) {
        days[i] = null;
      }

      const employeeAttendance = attendances.filter(
        (a) =>
          String(a.userId) === String(employee._id)
      );

     employeeAttendance.forEach((attendance) => {

  const rawDate =
    attendance.attendanceDate ||
    attendance.date ||
    attendance.createdAt;

  if (!rawDate) return;

  const parsedDate =
    new Date(rawDate);

  if (isNaN(parsedDate.getTime()))
    return;

  const day =
    parsedDate.getDate();

  days[day] = {
  status: attendance.status,
  overtime: attendance.overtime,
  isLate: attendance.isLate,

  clockInTime: attendance.clockInTime,
  clockOutTime: attendance.clockOutTime,

  hoursWorked: attendance.hoursWorked
};
});

      return {
        employeeId: employee._id,
        employeeName: employee.fullName,
        department:
  employee.department?.name || "-",
        days,
      };
    });

    // SUMMARY
    let summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      overtime: 0,
      holidays: 0,
      clockedIn: 0,
      late: 0,
    };
attendances.forEach((a) => {

  const status = (
    a.status || ""
  ).trim();

  if (status === "Present")
    summary.present++;

  if (status === "Clocked In")
    summary.clockedIn++;

  if (status === "Absent")
    summary.absent++;

  if (status === "Half Day")
    summary.halfDay++;

  if (status === "Overtime")
    summary.overtime++;

  if (status === "Holiday")
    summary.holidays++;

  if (a.isLate)
    summary.late++;
});

    return res.status(200).json({
      success: true,
      rows,
      summary,
      daysInMonth,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      message: "Failed to fetch report",
    });

  }

};