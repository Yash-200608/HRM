const Attendance = require("../../models/personalOffice/attendanceModel.js");
const Company = require("../../models/personalOffice/companyModel.js");
const PayRoll = require("../../models/personalOffice/payRollModel.js");
const Holiday = require("../../models/personalOffice/Holiday.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js");

const cron = require("node-cron");

// ======================================================
// HELPERS
// ======================================================

function getStartAndEndOfDay(date) {

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function calculateAttendance(
  clockInTime,
  clockOutTime
) {

  if (!clockInTime) {

    return {
      hoursWorked: 0,
      overtime: 0,
      status: "Absent",
    };
  }

  if (!clockOutTime) {

    return {
      hoursWorked: 0,
      overtime: 0,
      status: "Clocked In",
    };
  }

  const diffMs =
    new Date(clockOutTime) -
    new Date(clockInTime);

  // SAFETY CHECK
  if (diffMs < 0) {

    return {
      hoursWorked: 0,
      overtime: 0,
      status: "Absent",
    };
  }

  const hoursWorked = Number(
    (
      diffMs /
      (1000 * 60 * 60)
    ).toFixed(2)
  );

  let status = "Absent";

  if (hoursWorked < 4) {

    status = "Absent";

  }

  else if (
    hoursWorked >= 4 &&
    hoursWorked < 8
  ) {

    status = "Half Day";

  }

  else if (
    hoursWorked >= 8 &&
    hoursWorked < 9
  ) {

    status = "Present";

  }

  else {

    status = "Overtime";

  }

  return {

    hoursWorked,

    overtime:
      hoursWorked > 9
        ? Number(
            (
              hoursWorked - 9
            ).toFixed(2)
          )
        : 0,

    status,
  };
}

function checkLate(hoursWorked) {

  if (hoursWorked == null)
    return false;

  return hoursWorked >= 8 && hoursWorked < 9;
}

function getMonthName(monthNumber) {

  const months = [
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

  return months[monthNumber - 1];
}

// ======================================================
// CLOCK IN
// ======================================================

const clockIn = async (req, res) => {

  try {

    const userId =
      req.user.id;

    const companyId =
      req.user.companyId;

    // CHECK ACTIVE SESSION
    const activeAttendance =
      await Attendance.findOne({

        userId,

        createdBy:
          companyId,

        clockInTime:
          { $ne: null },

        clockOutTime:
          null,

      }).sort({
        createdAt: -1,
      });

    if (activeAttendance) {

      return res.status(400).json({

        success: false,

        message:
          "Already clocked in",
      });
    }

    const now = new Date();

    const {
      start,
      end,
    } = getStartAndEndOfDay(now);

    // TODAY RECORD CHECK
    let attendance =
      await Attendance.findOne({

        userId,

        createdBy:
          companyId,

        attendanceDate: {
          $gte: start,
          $lte: end,
        },
      });

    // CREATE NEW
    if (!attendance) {

      attendance =
        new Attendance({

          userId,

          createdBy:
            companyId,

          attendanceDate:
            now,
        });
    }

    attendance.clockInTime =
      now;

    attendance.clockOutTime =
      null;

    attendance.hoursWorked =
      0;

    attendance.overtime =
      0;

    attendance.status =
      "Clocked In";

    attendance.isLate = false;

    await attendance.save();

    return res.status(200).json({

      success: true,

      attendance,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      success: false,

      message:
        "Clock-in failed",
    });
  }
};

// ======================================================
// CLOCK OUT
// ======================================================

const clockOut = async (req, res) => {

  try {

    const userId =
      req.user.id;

    const companyId =
      req.user.companyId;

    // FIND ACTIVE SESSION
   const attendance = await Attendance.findOne({

  userId,

  createdBy: companyId,

  clockInTime: { $ne: null },

  clockOutTime: null,

}).sort({
  createdAt: -1,
});

    if (!attendance) {

      return res.status(400).json({

        success: false,

        message:
          "No active attendance found",
      });
    }

    const now = new Date();

    attendance.clockOutTime =
      now;

    const result =
      calculateAttendance(

        attendance.clockInTime,

        now
      );

    attendance.hoursWorked =
      result.hoursWorked;

    attendance.overtime =
      result.overtime;

    attendance.status =
      result.status;

      attendance.isLate = checkLate(
  result.hoursWorked
);

    await attendance.save();

    return res.status(200).json({

      success: true,

      attendance,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      success: false,

      message:
        "Clock-out failed",
    });
  }
};

// ======================================================
// GET ATTENDANCE
// ======================================================

const getAttendance = async (req, res) => {

  try {

    const {
      month,
      year,
      companyId,
    } = req.query;

    const monthNum =
      Number(month);

    const yearNum =
      Number(year);

    const startDate =
      new Date(
        yearNum,
        monthNum - 1,
        1
      );

    const endDate =
      new Date(
        yearNum,
        monthNum,
        0,
        23,
        59,
        59
      );
let query = {

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

  ],
};

    // EMPLOYEE VIEW
    const canViewAllAttendance =
  req.user.role === "admin" ||
  req.user?.assignedRole?.permissions?.attendance?.edit;

if (!canViewAllAttendance) {
  query.userId = req.user.id;
}

    const records =
      await Attendance.find(query)

        .populate({
  path: "userId",
  select: "fullName profileImage department",
  populate: {
    path: "department",
    select: "name"
  }
})

        .sort({
          attendanceDate:
            -1,
        });

    // PAYROLL
    const payrolls =
      await PayRoll.find({

        employeeId: {

          $in:
            records.map(
              (r) =>
                r?.userId?._id
            ),
        },

        month:
          getMonthName(
            monthNum
          ),

        year:
          yearNum,
      });

    return res.status(200).json({

      success: true,

      records,

      payrolls,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      success: false,

      message:
        "Failed to fetch attendance",
    });
  }
};

// ======================================================
// GET ATTENDANCE BY ID
// ======================================================

const getAttendanceById =
  async (req, res) => {

    try {

      const {

        month,
        year,
        companyId,
        userId,

      } = req.query;

      const monthNum =
        Number(month);

      const yearNum =
        Number(year);

      const startDate =
        new Date(
          yearNum,
          monthNum - 1,
          1
        );

      const endDate =
        new Date(
          yearNum,
          monthNum,
          0,
          23,
          59,
          59
        );

      const records =
        await Attendance.find({

          userId,

          createdBy:
            companyId,

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

]
        })

          .populate(
            "userId",
            "fullName profileImage"
          )

          .sort({
            attendanceDate:
              -1,
          });

      return res.status(200).json({

        success: true,

        records,
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch attendance",
      });
    }
  };

// ======================================================
// UPDATE ATTENDANCE
// ======================================================

const updateAttendanceByDay =
  async (req, res) => {

    try {

      const {

        attendanceId,

        clockInTime,

        clockOutTime,

        notes,

      } = req.body;

      const attendance =
        await Attendance.findById(
          attendanceId
        );

      if (!attendance) {

        return res.status(404).json({

          success: false,

          message:
            "Attendance not found",
        });
      }

      attendance.clockInTime =
        clockInTime
          ? new Date(
              clockInTime
            )
          : null;

      attendance.clockOutTime =
        clockOutTime
          ? new Date(
              clockOutTime
            )
          : null;

      attendance.notes =
        notes || "";

      attendance.isLate =
  checkLate(
    result.hoursWorked
  );

     const result =
  calculateAttendance(
    attendance.clockInTime,
    attendance.clockOutTime
  );

attendance.hoursWorked =
  result.hoursWorked;

attendance.overtime =
  result.overtime;

attendance.status =
  result.status;

attendance.isLate =
  checkLate(
    result.hoursWorked
  );

      await attendance.save();

      return res.status(200).json({

        success: true,

        attendance,
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({

        success: false,

        message:
          "Failed to update attendance",
      });
    }
  };

// ======================================================
// MARK ABSENT
// ======================================================

const handleAbsent =
  async (req, res) => {

    try {

      const {

        userId,
        companyId,
        date,

      } = req.body;

      const selectedDate =
        new Date(date);

      const {
        start,
        end,
      } =
        getStartAndEndOfDay(
          selectedDate
        );

      let attendance =
        await Attendance.findOne({

          userId,

          createdBy:
            companyId,

          attendanceDate: {

            $gte:
              start,

            $lte:
              end,
          },
        });

      if (!attendance) {

        attendance =
          new Attendance({

            userId,

            createdBy:
              companyId,

            attendanceDate:
              selectedDate,
          });
      }

      attendance.clockInTime =
        null;

      attendance.clockOutTime =
        null;

      attendance.hoursWorked =
        0;

      attendance.overtime =
        0;

      attendance.status =
        "Absent";

      attendance.isLate =
        false;

      await attendance.save();

      return res.status(200).json({

        success: true,

        attendance,
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({

        success: false,

        message:
          "Failed to mark absent",
      });
    }
  };

// ======================================================
// DAILY CRON
// ======================================================

cron.schedule(
  "0 5 * * *",

  async () => {

    try {

      const yesterday =
        new Date();

      yesterday.setDate(
        yesterday.getDate() - 1
      );

      const {
        start,
        end,
      } =
        getStartAndEndOfDay(
          yesterday
        );

      const isSunday =
        yesterday.getDay() === 0;

      const companies =
        await Company.find({});

      for (const company of companies) {

        const holiday =
          await Holiday.findOne({

            createdBy:
              company._id,

            date: {

              $gte:
                start,

              $lte:
                end,
            },
          });

        const employees =
          await Employee.find({

            createdBy:
              company._id,
          });

        for (const employee of employees) {

          const existing =
            await Attendance.findOne({

              userId:
                employee._id,

              createdBy:
                company._id,

              attendanceDate: {

                $gte:
                  start,

                $lte:
                  end,
              },
            });

          if (existing)
            continue;

          // HOLIDAY
          if (
            holiday ||
            isSunday
          ) {

            await Attendance.create({

              userId:
                employee._id,

              createdBy:
                company._id,

              attendanceDate:
                yesterday,

              status:
                "Holiday",

              hoursWorked:
                0,

              overtime:
                0,
            });
          }

          // ABSENT
          else {

            await Attendance.create({

              userId:
                employee._id,

              createdBy:
                company._id,

              attendanceDate:
                yesterday,

              status:
                "Absent",

              hoursWorked:
                0,

              overtime:
                0,
            });
          }
        }
      }

    } catch (error) {

      console.log(
        "CRON ERROR",
        error
      );
    }
  }
);

module.exports = {

  clockIn,

  clockOut,

  getAttendance,

  getAttendanceById,

  updateAttendanceByDay,

  handleAbsent,
};