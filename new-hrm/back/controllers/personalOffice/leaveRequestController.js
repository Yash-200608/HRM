const mongoose = require("mongoose");
const { LeaveRequest } = require("../../models/personalOffice/leaveRequestModel.js");
const { Leave } = require("../../models/personalOffice/leaveModel.js");
const Company = require("../../models/personalOffice/companyModel.js");
const recentActivity = require("../../models/personalOffice/recentActivityModel.js");
const { sendNotification } = require("../../socketHelpers.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js");
const { Admin } = require("../../models/personalOffice/authModel.js");

/**
 * APPLY LEAVE (Employee)
 */
const applyLeave = async (req, res) => {
  try {
    const {
      leaveType,
      fromDate,
      toDate,
      description,
      userId,
      companyId,
    } = req.body;

    // Basic validation
    if (!leaveType || !fromDate || !toDate || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Leave type, dates and company ID are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(leaveType) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type or company ID",
      });
    }

    // Company validation
    const companyExists = await Company.findById(companyId);
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const user = await Employee.findOne({ _id: userId, createdBy: companyId });
    if (!user) return res.status(404).json({ message: "User Not Found." })

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be greater than to date",
      });
    }

    // Calculate total days
    const totalDays =
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave type exists
    const leave = await Leave.findById(leaveType);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    if (totalDays > leave.maxDaysAllowed) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${leave.maxDaysAllowed} days allowed for this leave`,
      });
    }

    const leaveRequest = await LeaveRequest.create({
      user: userId,
      leaveType,
      fromDate: start,
      toDate: end,
      totalDays,
      description,
      createdBy: companyId, // ✅ company saved here
    });

    await recentActivity.create({ title: `${leaveRequest?.leaveType} applied.`, createdBy: userId, createdByRole: "Employee", companyId: companyId });

    await sendNotification({
      createdBy: userId,

      userId: companyExists?.admins[0],

      userModel: "Employee", // "Admin" or "Employee"

      companyId: companyId,

      message: `New leave applied by ${user?.fullName}`,

      type: "leave",

      referenceId: leaveRequest._id
    });
    return res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      leaveRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// const getEmployeeLeaveSummary = async(req,res) => {
//   const {companyId, userId} = req.query;
//   try{
//   const company = await Company.findOne({_id:companyId});
//   if(!company) return res.status(404).json({message:"Company Not Found."});
//   const employee = await Employee.findOne({_id:userId});
//   if(employee) return res.status(404).json({message:"Employee Not Found."});
//  const now = new Date();
// const year = now.getFullYear();
// const month = now.getMonth(); // 0 = Jan, 1 = Feb, etc.

// const startOfMonth = new Date(year, month, 1); // 1st day of current month
// const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59); // last day of current month
// const approvedLeaves = await LeaveRequest.find({
//   user: userId,
//   status: "Approved",
//   $or: [
//     { fromDate: { $lte: endOfMonth }, toDate: { $gte: startOfMonth } }
//   ]
// });

// const pendingLeaves = await LeaveRequest.find({
//  user: userId,
//   status: "Pending",
//   $or: [
//     { fromDate: { $lte: endOfMonth }, toDate: { $gte: startOfMonth } }
//   ]
// });

// res.statu(200).json({message:"get data successfully.", approvedLeaves, pendingLeaves})
//   }
//   catch(err){
//     console.log(err);
//     res.status(500).json({message:`Server Error -: ${err?.message}`})
//   }
// }
const getEmployeeLeaveSummary = async (req, res) => {
  try {
    const { companyId, userId } = req.query;

    // ✅ Validate IDs
    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // ✅ Fetch Company
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // ✅ Fetch Employee
    const employee = await Employee.findById(userId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // 📅 Current Month Range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 📌 Fetch leaves overlapping current month
    const leaves = await LeaveRequest.find({
      user: userId,
      $or: [
        { fromDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { toDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { fromDate: { $lte: startOfMonth }, toDate: { $gte: endOfMonth } }
      ]
    });

    // ⏳ Pending leaves
    const pendingLeave = leaves.filter((l) => String(l.status || "").toLowerCase() === "pending").length;

    // ✅ Approved leave days (current month)
    let approvedLeaveDays = 0;
    leaves
      .filter((l) => String(l.status || "").toLowerCase() === "approved")
      .forEach(l => {
        const from = new Date(l.fromDate) < startOfMonth ? startOfMonth : new Date(l.fromDate);
        const to = new Date(l.toDate) > endOfMonth ? endOfMonth : new Date(l.toDate);

        const diffDays = l.totalDays || Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
        approvedLeaveDays += diffDays;
      });

    // 🧮 Final Calculations
    const usedLeave = approvedLeaveDays;
    const personalLeave = Math.max(0, approvedLeaveDays - company.specialLeave); // ✅ subtract company special leave

    return res.status(200).json({
      success: true,
      pendingLeave,
      usedLeave,
      personalLeave
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
/**
 * GET MY LEAVE REQUESTS (Employee - Company wise)
 */
const getMyLeaveRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId } = req.query;
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user or company ID",
      });
    }

    const requests = await LeaveRequest.find({
      user: userId,
      createdBy: companyId,
    })
      .populate("leaveType", "name paid")
      .populate("user", "fullName email profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const getMyLeaveRequestsByDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, month, year } = req.query;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user or company ID",
      });
    }

    // Validate month/year
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (
      !monthNum ||
      monthNum < 1 ||
      monthNum > 12 ||
      !yearNum ||
      yearNum < 1970
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year",
      });
    }

    // Calculate start and end of the month
    const startDate = new Date(yearNum, monthNum - 1, 1); // month is 0-indexed
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // last day of month

    // Query LeaveRequests for that month
    const requests = await LeaveRequest.find({
      user: userId,
      createdBy: companyId,
      fromDate: { $gte: startDate },
      toDate: { $lte: endDate },
    })
      .populate("leaveType", "name paid")
      .populate("user", "fullName email profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET ALL LEAVE REQUESTS (Admin / Company)
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const requests = await LeaveRequest.find({ createdBy: companyId })
      .populate("user", "fullName email profileImage")
      .populate("leaveType", "name paid color")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET LEAVE REQUEST BY ID (Company safe)
 */
const getLeaveRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const request = await LeaveRequest.findOne({
      _id: id,
      createdBy: companyId,
    })
      .populate("user", "name email")
      .populate("leaveType", "name paid");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * APPROVE / REJECT LEAVE (Admin / Company)
 */
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, requestId, companyId, userId } = req.body;

    let authorizedUser = await Admin.findOne({
  _id: userId,
  companyId
});

if (!authorizedUser) {
  authorizedUser = await Employee.findOne({
    _id: userId,
    createdBy: companyId
  }).populate("assignedRole");
}

const hasPermission =
  authorizedUser?.role === "admin" ||
  authorizedUser?.assignedRole?.permissions?.leave?.edit;

if (!authorizedUser || !hasPermission) {
  return res.status(403).json({
    message: "You are not Authorized."
  });
}

    if (
      !mongoose.Types.ObjectId.isValid(requestId) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request or company ID",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected",
      });
    }

    const leaveRequest = await LeaveRequest.findOne({
      _id: requestId,
      createdBy: companyId,
      status: "Pending",
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found or already processed",
      });
    }

    leaveRequest.status = status;
    await leaveRequest.save();

    await sendNotification({
      createdBy: userId,

      userId: leaveRequest?.user,

      userModel: "Admin", // "Admin" or "Employee"

      companyId: companyId,
message: `Leave ${status} by ${authorizedUser?.fullName || authorizedUser?.username}`,

      type: "leave",

      referenceId: leaveRequest._id
    });

     await recentActivity.create({
  title: `leave ${status}`,
  createdBy: userId,
  createdByRole:
    authorizedUser?.role === "admin"
      ? "Admin"
      : "Employee",
  companyId: companyId
})

    return res.status(200).json({
      success: true,
      message: `Leave ${status.toLowerCase()} successfully`,
      leaveRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * DELETE LEAVE REQUEST (Company safe)
 */
const deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const request = await LeaveRequest.findOneAndDelete({
      _id: id,
      createdBy: companyId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave request deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  applyLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  getLeaveRequestById,
  updateLeaveStatus,
  deleteLeaveRequest,
  getMyLeaveRequestsByDate,
  getEmployeeLeaveSummary
};
