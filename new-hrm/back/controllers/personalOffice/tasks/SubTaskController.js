const Task = require("../../../models/personalOffice/taskModel");
const SubTask = require("../../../models/personalOffice/SubtaskModel");
const Company = require("../../../models/personalOffice/companyModel");
const { Admin } = require("../../../models/personalOffice/authModel");
const { Employee } = require("../../../models/personalOffice/employeeModel");
const Project = require("../../../models/personalOffice/projectModel");
const recentActivity = require("../../../models/personalOffice/recentActivityModel");
const { sendNotification } = require("../../../socketHelpers");


/**
 * 🔹 Validate Company & Parent Task
 */
const validateCompanyAndTask = async (companyId, taskId) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  const task = await Task.findOne({ _id: taskId, companyId });
  if (!task) throw new Error("Parent task not found");

  return task;
};

/**
 * 🔹 Validate Admin / Manager
 */
const validateUser = async (userId) => {
  let user = await Admin.findById(userId);
  if (user) return { role: "admin" };

  user = await Employee.findById(userId).populate("department", "name managers");
  if (!user || !user.department?.managers?.includes(user?._id)) {
    throw new Error("Only admin or manager is allowed");
  }

  return { role: "manager" };
};

/**
 * 🔹 Validate Assigned Employee
 */
const validateEmployee = async (employeeId) => {
  const emp = await Employee.findById(employeeId);
  if (!emp) throw new Error("Assigned employee not found");
  return emp;
};




/**
 * ✅ CREATE SUBTASK
 */
const createSubTask = async (req, res) => {
  try {
    const {
      companyId,
      taskId,
      createdBy,
      createdByRole,
      employeeId,
      name,
      description,
      remarks,
      startDate,
      endDate,
      priority,
      forceCreate, // ✅ new flag from frontend
    } = req.body;

    await validateCompanyAndTask(companyId, taskId);
    await validateUser(createdBy);
    await validateEmployee(employeeId);

    const task = await Task.findOne({ _id: taskId, companyId });
    if (!task) throw new Error("Task not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (new Date(endDate) < new Date(startDate)) {
      throw new Error("End date cannot be before start date");
    }

    let taskStatus = "pending";
    if (start.getTime() === today.getTime()) taskStatus = "active";
    else if (start > today) taskStatus = "pending";

    // ====== Check if employee already has active/pending subtask ======
    const activeSubtasks = await SubTask.find({
      employeeId,
      status: { $in: ["active", "pending"] },
    });

    if (activeSubtasks.length > 0 && !forceCreate) {
      return res.status(200).json({
        success: true,
        warning: true,
        message: "Employee already has active/pending subtasks. Do you want to continue?",
        activeSubtasks,
      });
    }

    // ✅ Create SubTask
    const subtask = await SubTask.create({
      companyId,
      taskId,
      createdBy,
      createdByRole,
      employeeId,
      name,
      description,
      remarks,
      startDate,
      endDate,
      priority,
      status: taskStatus,
    });

    // ✅ Link subtask to Task
    await Task.findByIdAndUpdate(
      taskId,
      { $addToSet: { subTasks: subtask._id } },
      { new: true }
    );

    // ✅ Link subtask to Project
    await Project.findByIdAndUpdate(
      task.projectId,
      { $addToSet: { subTasks: subtask._id } },
      { new: true }
    );

    await sendNotification({
      createdBy: createdBy,

      userId: employeeId,

      userModel: createdByRole === "Admin" ? "Employee" : "Admin", // "Admin" or "Employee"

      companyId: companyId,

      message: `New task assigned: ${task.name}`,

      type: "task",

      referenceId: task._id
    });



    res.status(201).json({
      success: true,
      message: "Subtask created and linked successfully",
      data: subtask,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


/**
 * ✅ GET ALL SUBTASKS BY COMPANY
 */
const getSubTasksByCompany = async (req, res) => {
  try {
    const { companyId, userId } = req.query;

    const company = await Company.findOne({ _id: companyId });
    if (!company) return res.status(404).json({ message: "Company Not Found." });

    let user = null;
    user = await Admin.findOne({ _id: userId, companyId });
    if (!user) {
      user = await Employee.findOne({ _id: userId, createdBy: companyId }).populate("department", "name managers");
      if (!user) {
        return res.status(404).json({ message: "Only admin or manager is allowed" });
      }
    }
    let subtasks = [];
    if (user?.role === "admin") {
      subtasks = await SubTask.find({ companyId }).sort({ createdAt: -1 })
        .populate({
          path: "taskId",
          select: "name startDate endDate projectId",
          populate: { path: "projectId", select: "name" },
        })
        .populate({
          path: "employeeId", select: "fullName department",
          populate: { path: "department", select: "name managers" }
        })

        .populate("createdBy", "fullName");
    }
    else if (user?.department?.managers?.includes(user?._id)) {
      subtasks = await SubTask.find({ createdBy: user?._id, companyId }).sort({ createdAt: -1 })
        .populate({
          path: "taskId",
          select: "name projectId",
          populate: { path: "projectId", select: "name" },
        })
        .populate("employeeId", "fullName department")
        .populate({path:"employeeId", select:"fullName department", populate:{path :"department", select:"name managers"}})
        .populate("createdBy", "fullName");
    }

    res.json({ success: true, data: subtasks });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getSubTaskById = async (req, res) => {
  try {
    const { subTaskId, companyId, userId } = req.query;

    // 1️⃣ Validate required fields
    if (!subTaskId || !companyId || !userId) {
      return res.status(400).json({ message: "subTaskId, companyId and userId are required" });
    }

    // 2️⃣ Check user (Admin or Employee)
    let user = await Admin.findOne({ _id: userId, companyId });

    if (!user) {
      user = await Employee.findOne({ _id: userId, createdBy: companyId });
      if (!user) {
        return res.status(404).json({ message: "Only admin or employee is allowed" });
      }
    }

    // 3️⃣ Check company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company Not Found." });
    }

    // 4️⃣ Get SubTask with nested populate
    const subtask = await SubTask.findById(subTaskId)
      .populate({
        path: "taskId",
        select: "companyId projectId managerId name description",
        populate: {
          path: "managerId",
          select: "fullName profileImage department",
          populate: {
            path: "department",
            select: "name managers"
          }
        }
      })
      .populate({
        path: "employeeId",
        select: "fullName role department designation profileImage taskRole",
        populate: {
          path: "department",
          select: "name managers",
          populate: {
            path: "managers",
            select: "fullName profileImage"
          }
        }
      })
      .populate("createdBy", "username email profileImage role companyId");

    // 5️⃣ Handle not found
    if (!subtask) {
      return res.status(404).json({ success: false, message: "Subtask not found" });
    }

    // 6️⃣ Final response
    return res.status(200).json({
      success: true,
      data: subtask
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${err.message}`
    });
  }
};






/**
 * ✅ UPDATE SUBTASK
 */
// const updateSubTask = async (req, res) => {
//   try {
//     const {
//       _id,
//       companyId,
//       taskId,
//       employeeId,
//       name,
//       description,
//       remarks,
//       startDate,
//       endDate,
//       priority,
//     } = req.body;

//     if (!_id) throw new Error("Subtask id is required");

//     // 🔒 Required field check
//     const requiredFields = {
//       employeeId,
//       name,
//       description,
//       startDate,
//       endDate,
//       priority,
//     };

//     for (const [key, value] of Object.entries(requiredFields)) {
//       if (
//         value === undefined ||
//         value === null ||
//         (typeof value === "string" && value.trim() === "")
//       ) {
//         throw new Error(`${key} cannot be empty`);
//       }
//     }

//     if (companyId && taskId) {
//       await validateCompanyAndTask(companyId, taskId);
//     }

//     if (employeeId) {
//       await validateEmployee(employeeId);
//     }

//     if (new Date(endDate) < new Date(startDate)) {
//       throw new Error("End date cannot be before start date");
//     }

//     const updateData = {
//       employeeId,
//       name,
//       description,
//       remarks,
//       startDate,
//       endDate,
//       priority,
//     };

//     // 🧠 Status logic
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const start = new Date(startDate);
//     start.setHours(0, 0, 0, 0);

//     updateData.status =
//       start.getTime() === today.getTime()
//         ? "active"
//         : start > today
//           ? "pending"
//           : updateData.status;

//     const subtask = await SubTask.findByIdAndUpdate(
//       _id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!subtask) throw new Error("Subtask not found");

//     res.json({
//       success: true,
//       message: "Subtask updated successfully",
//       data: subtask,
//     });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };



const updateSubTask = async (req, res) => {
  try {
    const { _id, companyId, taskId, employeeId, name, description, remarks, startDate, endDate, priority} = req.body;

    if (!_id) throw new Error("Subtask id is required");

    const requiredFields = { employeeId, name, description, startDate, endDate, priority};

    for (const [key, value] of Object.entries(requiredFields)) {
      if ( value === undefined || value === null ||(typeof value === "string" && value.trim() === "")) {
        throw new Error(`${key} cannot be empty`);
      }
    }

    if (companyId && taskId) {
      await validateCompanyAndTask(companyId, taskId);
    }

    if (employeeId) {
      await validateEmployee(employeeId);
    }

    if (new Date(endDate) < new Date(startDate)) {
      throw new Error("End date cannot be before start date");
    }

    // 🆕 STEP 1: Old subtask fetch karo (diff ke liye)
    const oldSubtask = await SubTask.findById(_id);
    if (!oldSubtask) throw new Error("Subtask not found");

    const oldEnd = new Date(oldSubtask.endDate);
    const newEnd = new Date(endDate);

    const diff = newEnd.getTime() - oldEnd.getTime(); // ms difference

    const updateData = {
      employeeId,
      name,
      description,
      remarks,
      startDate,
      endDate,
      priority,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    updateData.status =
      start.getTime() === today.getTime()
        ? "active"
        : start > today
        ? "pending"
        : updateData.status;

    // ✅ STEP 2: Current subtask update
    const subtask = await SubTask.findByIdAndUpdate(
      _id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!subtask) throw new Error("Subtask not found");

    // 🆕 STEP 3: Future subtasks auto shift
    if (diff !== 0) {
      const futureSubtasks = await SubTask.find({
        employeeId: employeeId,
        _id: { $ne: _id },
        startDate: { $gt: oldEnd },
      });

      const bulkOps = futureSubtasks.map((task) => {
        const newStart = new Date(new Date(task.startDate).getTime() + diff);
        const newEndDate = new Date(new Date(task.endDate).getTime() + diff);

        return {
          updateOne: {
            filter: { _id: task._id },
            update: { $set: { startDate: newStart, endDate: newEndDate} },
          },
        };
      });

      if (bulkOps.length > 0) {  await SubTask.bulkWrite(bulkOps)}
    }

    res.json({ success: true, message: "Subtask updated successfully", data: subtask });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


/**
 * ✅ CHANGE SUBTASK STATUS
 */
const subTaskStatusChange = async (req, res) => {
  try {
    const { companyId, subTaskId, userId, status } = req.body;
    const company = await Company.findOne({ _id: companyId })
    if (!company) return res.status(404).json({ message: "Company Not Found." });

    let user = await Admin.findOne({ _id: userId, companyId });
    if (!user) {
      user = await Employee.findOne({ _id: userId, createdBy: companyId });
      if (!user) return res.status(404).json({ message: "User Not Found.", success: false })
    }

    const subtask = await SubTask.findOne({ _id: subTaskId, companyId });
    if (!subtask) throw new Error("Subtask not found");

    subtask.status = status;
    await subtask.save();

    if (subtask?.status === "completed") {
      await recentActivity.create({ title: "Task Completed.", createdBy: user?._id, createdByRole: user?.role === "admin" ? "Admin" : "Employee", companyId: companyId });

      await sendNotification({
        createdBy: user?._id,

        userId: user?.role === "admin" ? subtask?.employeeId : subtask?.createdBy,

        userModel: user?.role === "Admin" ? "Employee" : "Admin",

        companyId: companyId,

        message: `Task Completed: ${subtask.name}`,

        type: "task",

        referenceId: subtask._id
      });
    }

    res.json({
      success: true,
      message: "Subtask status updated successfully",
      data: { subTaskId, status },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const reassignSubTask = async (req, res) => {
  try {
    const {companyId,taskId,adminId,employeeId,startDate,endDate} = req.body;

    await validateUser(adminId);

    const subtask = await SubTask.findOne({ _id: taskId, companyId });
    if (!subtask) throw new Error("Subtask not found");

    // 🆕 STEP 1: old data store karo (for diff calculation)
    const oldStart = new Date(subtask.startDate);
    const oldEnd = new Date(subtask.endDate);

    if (employeeId) {
      await validateEmployee(employeeId);
      subtask.employeeId = employeeId;
    }

    if (startDate) subtask.startDate = startDate;
    if (endDate) subtask.endDate = endDate;

    if ( subtask.startDate && subtask.endDate && new Date(subtask.endDate) < new Date(subtask.startDate)) {
      throw new Error("End date cannot be before start date");
    }

    // 🆕 STEP 2: calculate diff (ONLY IF DATE CHANGED)
    const newStart = new Date(subtask.startDate);
    const newEnd = new Date(subtask.endDate);

    const diff = newEnd.getTime() - oldEnd.getTime();

    await subtask.save();

    if (diff !== 0 && employeeId) {
      const futureSubtasks = await SubTask.find({ employeeId: employeeId, _id: { $ne: subtask._id }, startDate: { $gt: oldEnd },});

      const bulkOps = futureSubtasks.map((st) => ({
        updateOne: {
          filter: { _id: st._id },
          update: {
            $set: {
              startDate: new Date(new Date(st.startDate).getTime() + diff),
              endDate: new Date(new Date(st.endDate).getTime() + diff),
            },
          },
        },
      }));

      if (bulkOps.length > 0) { await SubTask.bulkWrite(bulkOps)}
    }

    res.json({ success: true, message: "Subtask reassigned successfully", data: subtask});
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getIdByTaskDetail = async (req, res) => {
  try {
    const { taskId, department, companyId, adminId } = req.query;

    const company = await Company.findOne({ _id: companyId });
    if (!company) return res.status.json({ message: "Company Not Found." });

    let task = await Task.findOne({ _id: taskId, companyId });

    if (!task) {
      task = await SubTask.findOne({ _id: taskId, companyId });
    }

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    await validateUser(adminId);

    const employees = await Employee.find({ department: department }).populate("department", "name managers");

    if (employees) {
      return res.status(200).json({ message: "employee successfully.", data: employees })
    }
  }
  catch (err) {
    console.log(err?.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteSubTask = async (req, res) => {
  try {
    const { subtaskId, companyId, adminId } = req.query;

    if (!subtaskId || !companyId || !adminId) {
      return res.status(400).json({ success: false, message: "subtaskId, companyId and adminId are required"});
    }

    const admin = await Admin.findOne({ _id: adminId, companyId });
    if (!admin) {
       admin = await Employee.findOne({_id:adminId, createdBy:companyId}).populate("department", "name managers");
       if(!admin || (admin && !admin?.department?.managers?.includes(admin?._id))){
       return res.status(403).json({ success: false, message: "Unauthorized access"});
            
       }
    }

    // 🔍 Find subtask
    const subtask = await SubTask.findOne({ _id: subtaskId, companyId});

    if (!subtask) {
      return res.status(404).json({ success: false, message: "Subtask not found"});
    }

    const taskId = subtask.taskId;

    await SubTask.findByIdAndDelete(subtaskId);

    await Task.findByIdAndUpdate(taskId, { $pull: { subTasks: subtaskId }});

    return res.status(200).json({ success: true, message: "Subtask deleted successfully"});

  } catch (err) {
    console.log(err?.message);
    res.status(400).json({ success: false, message: err.message});
  }
};




module.exports = {
  createSubTask,
  getSubTasksByCompany,
  getSubTaskById,
  updateSubTask,
  subTaskStatusChange,
  reassignSubTask,
  deleteSubTask,
  getIdByTaskDetail
};
