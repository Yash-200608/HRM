const Task = require("../../../models/personalOffice/taskModel");
const Company = require("../../../models/personalOffice/companyModel");
const Project = require("../../../models/personalOffice/projectModel");
const { Admin } = require("../../../models/personalOffice/authModel");
const { Employee } = require("../../../models/personalOffice/employeeModel");
const SubTask = require("../../../models/personalOffice/SubtaskModel");
const recentActivity = require("../../../models/personalOffice/recentActivityModel");
const { sendNotification } = require("../../../socketHelpers");


/**
 * 🔹 Utility: Validate Company & Project
 */
const validateCompanyAndProject = async (companyId, projectId) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  const project = await Project.findOne({ _id: projectId, companyId: companyId });
  if (!project) throw new Error("Project not found");

  return { company, project };
};

const validateUser = async (userId) => {
  let user = await Admin.findById(userId);
  if (user) return { role: "admin" };

  user = await Employee.findById(userId);
  if (!user || user.taskRole !== "manager") {
    throw new Error("Only admin or manager is allowed");
  }

  return { role: "manager" };
};

/**
 * 🔹 Utility: Validate Creator (Admin / Manager)
 */
const validateCreator = async (createdBy, createdByRole) => {
  let creator;

  // ================= ADMIN =================
  if (createdByRole === "Admin") {
    creator = await Admin.findById(createdBy);

    if (!creator) {
      throw new Error("Admin not found");
    }

    return {
      role: "Admin",
      creator
    };
  }

  // ================= EMPLOYEE =================
  if (createdByRole === "Employee") {

    creator = await Employee.findById(createdBy)
      .populate("assignedRole");

    if (!creator) {
      throw new Error("Employee not found");
    }

    const permissions =
      creator?.assignedRole?.permissions || {};

    const hasTaskPermission =
      permissions?.tasks?.create ||
      permissions?.task_manager?.create ||
      permissions?.tasks_dashboard?.create;

    // OLD MANAGER LOGIC + NEW ROLE PERMISSION LOGIC
    if (
      creator?.taskRole !== "manager" &&
      !hasTaskPermission
    ) {
      throw new Error("Only manager can create task");
    }

    return {
      role: "Employee",
      creator
    };
  }

  throw new Error("Invalid creator role");
};

/**
 * 🔹 Utility: Validate Assigned Manager
 */
const validateAssignedManager = async (managerId) => {
  const manager = await Employee.findById(managerId).populate("department", "name managers");
  if (!manager) throw new Error("Assigned manager not found");

  if (!manager?.department?.managers?.includes(manager?._id)) {
    throw new Error("Task can be assigned only to manager");
  }

  return manager;
};


const createTask = async (req, res) => {
  try {
    const { companyId, projectId, createdBy, createdByRole, managerId, name, description, remarks, startDate, endDate, priority, status, forceCreate} = req.body;

const adminUser = await Admin.findOne({
  _id: createdBy,
  companyId
});

const employeeUser = await Employee.findOne({
  _id: createdBy,
  createdBy: companyId
})
.populate("department")
.populate("assignedRole");

    await validateCompanyAndProject(companyId, projectId);
    await validateCreator(createdBy, createdByRole);

    const project = await Project.findOne({ _id: projectId, companyId });
    if (!project) throw new Error("Project not found");

    const existingTask = await Task.findOne({ companyId, name });
    if (existingTask) {
      return res.status(409).json({ success: false, message: "Task name already exists for this company" });
    }

    // Check manager active tasks
    const now = new Date();
    const managerTasks = await Task.find({
      managerId,
      status: { $ne: "Completed" },
      endDate: { $gte: now },
    });

    if (managerTasks.length > 0 && !forceCreate) {
      return res.status(200).json({
        success: true,
        warning: true,
        message: "Manager already has active tasks. Do you want to continue?",
        activeTasks: managerTasks,
      });
    }

    const task = await Task.create({
      companyId,
      projectId,
      createdBy,
      createdByRole,
      managerId,
      name,
      description,
      remarks,
      startDate,
      endDate,
      priority,
      status,
    });

    await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { tasks: task._id } },
      { new: true }
    );

    // ✅ Send notification
    await sendNotification({
      createdBy: createdBy,

      userId: managerId,

      userModel: createdByRole,

      companyId: companyId,

      message: `New task assigned: ${task.name}`,

      type: "task",

      referenceId: task._id
    });


    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ✅ GET ALL TASKS BY COMPANY
 */
const getTasksByCompany = async (req, res) => {
  try {
    const { companyId, userId } = req.query;

    if (!companyId || !userId) {
      return res.status(400).json({ message: "companyId and userId are required" });
    }

    // 1️⃣ Check Company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // 2️⃣ Check if user is admin
    let user = await Admin.findOne({ _id: userId, companyId });
    let role = "admin";

    // 3️⃣ If not admin → check employee
    if (!user) {
      user = await Employee.findOne({ _id: userId, createdBy: companyId }).populate("department", "managers name");
      if (user) {
        role = user.department?.managers?.includes(user?._id) ? "manager" : "employee";
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const today = new Date();
    let data = [];

    // 4️⃣ Admin → All tasks
    if (role === "admin") {
  data = await Task.find({ companyId })
    .populate("projectId", "name startDate endDate")
    .populate({
      path: "managerId",
      select: "fullName profileImage role department",
      populate: {
        path: "department",  select: "name"}
    })
    .populate("createdBy")
    .sort({ createdAt: -1 });
}
    // 5️⃣ Manager → Only tasks where managerId OR createdBy matches
    else if (role === "manager") {
      data = await Task.find({
        companyId,
        $or: [
          { managerId: user._id },
          { createdBy: user._id }
        ]
      })
        .populate("projectId", "name startDate endDate")
        .populate("managerId", "fullName profileImage role department")
        .populate({path:"managerId", select:"fullName profilImage role department", populate:{path:"department", select:"name managers"}})
        .populate("createdBy")
        .sort({ createdAt: -1 });
    }

    else {
      data = await SubTask.find({
        companyId,
        employeeId: user._id
      })
        .populate("taskId", "name endDate status")
        .populate("createdBy")
    }

    return res.status(200).json({
      success: true,
      role,
      count: data.length,
      data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Server Error: ${err.message}` });
  }
};

/**
 * ✅ GET TASK BY ID
 */
const getTaskById = async (req, res) => {
  const { taskId, companyId, adminId } = req.query;
  try {
    let user = await Admin.findOne({ _id: adminId, companyId });
    let role = "admin";

    // 3️⃣ If not admin → check employee
    if (!user) {
      user = await Employee.findOne({ _id: adminId, createdBy: companyId }).populate("department", "name managers");
      if (user) {
        role = user?.department?.managers?.includes(user?._id) ? "manager" : "employee";
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company Not Found." });

    let task = null;
    if (user?.role === "admin" || user?.department?.managers?.includes(user?._id)) {
      task = await Task.findOne({ _id: taskId, companyId })
        .populate("projectId", "companyId name description adminId")
        .populate("managerId", "fullName department profileImage")
        .populate("createdBy", "username email profileImage role companyId")
        .populate({
          path: "subTasks",
          select: "name description status priority startDate endDate employeeId",
          populate: {
            path: "employeeId",
            select: "fullName department profileImage role",
            populate:{
              path:"department", select:"name managers"
            }
          }
        });
    }

    else {
      task = await SubTask.findOne({ _id: taskId, companyId })
        .populate("employeeId", "fullName department profileImage")
        .populate("taskId", "companyId name description");
    }

    if (!task) throw new Error("Task not found");

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ UPDATE TASK
 */
const updateTask = async (req, res) => {
  try {
    const updates = req.body;

    if (updates.companyId || updates.projectId) {
      await validateCompanyAndProject(
        updates.companyId,
        updates.projectId
      );
    }

    if (updates.managerId) {
      await validateAssignedManager(updates.managerId);
    }

    const existingTask = await Task.findById(updates.taskId);
    if (!existingTask) throw new Error("Task not found");

    const newStartDate = updates.startDate
      ? new Date(updates.startDate)
      : existingTask.startDate;

    const newEndDate = updates.endDate
      ? new Date(updates.endDate)
      : existingTask.endDate;

    const subtasks = await SubTask.find({ taskId: updates.taskId });

    const isInvalid = subtasks.some(sub => {
      const subStart = new Date(sub.startDate);
      const subEnd = new Date(sub.endDate);

      return (subStart < newStartDate || subEnd > newEndDate);
    });

    if (isInvalid) {
      throw new Error(
        "You cannot update this task because some subtasks have dates outside the new task duration."
      );
    }

    // 🆕 STEP 1: calculate diff (ADD THIS)
    const oldStart = new Date(existingTask.startDate);
    const oldEnd = new Date(existingTask.endDate);

    const diff = newEndDate.getTime() - oldEnd.getTime();

    // ✅ STEP 2: update task (your existing logic unchanged)
    const task = await Task.findByIdAndUpdate(
      updates.taskId,
      updates,
      { new: true }
    );

    // 🆕 STEP 3: CASCADING UPDATE (NEW ADDITION)
    if (diff !== 0) {
      const futureTasks = await Task.find({
        managerId: existingTask.managerId,
        _id: { $ne: updates.taskId },
        startDate: { $gt: oldEnd }
      });

      const bulkTaskOps = futureTasks.map(t => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              startDate: new Date(new Date(t.startDate).getTime() + diff),
              endDate: new Date(new Date(t.endDate).getTime() + diff),
            }
          }
        }
      }));

      if (bulkTaskOps.length > 0) {
        await Task.bulkWrite(bulkTaskOps);
      }

      const futureTaskIds = futureTasks.map(t => t._id);

      const futureSubtasks = await SubTask.find({
        taskId: { $in: futureTaskIds }
      });

      const bulkSubOps = futureSubtasks.map(st => ({
        updateOne: {
          filter: { _id: st._id },
          update: {
            $set: {
              startDate: new Date(new Date(st.startDate).getTime() + diff),
              endDate: new Date(new Date(st.endDate).getTime() + diff),
            }
          }
        }
      }));

      if (bulkSubOps.length > 0) {
        await SubTask.bulkWrite(bulkSubOps);
      }
    }

    res.json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * ✅ DELETE TASK
 */
/**
 * ✅ PERMANENT DELETE TASK
 */
const deleteTask = async (req, res) => {
  try {
    const { taskId, companyId, adminId } = req.query;

    const company = await Company.findOne({ _id: companyId });
    if (!company) return res.status(404).json({ message: "Company Not Found." })

    await validateUser(adminId);

    // 1️⃣ Find task (projectId & subTasks ke liye)
    const task = await Task.findById(taskId);
    if (!task) throw new Error("Task not found");

    // 2️⃣ Delete all subtasks of this task
    if (task.subTasks && task.subTasks.length > 0) {
      await SubTask.deleteMany({ _id: { $in: task.subTasks } });
    }

    // 3️⃣ Remove subTaskIds from Project.subTasks
    await Project.findByIdAndUpdate(
      task.projectId,
      { $pull: { subTasks: { $in: task.subTasks } } }
    );

    // 4️⃣ Remove taskId from Project.tasks
    await Project.findByIdAndUpdate(
      task.projectId,
      { $pull: { tasks: taskId } }
    );

    // 5️⃣ Delete task itself
    await Task.findByIdAndDelete(taskId);

    res.json({
      success: true,
      message: "Task and its subtasks permanently deleted",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const taskStatusChange = async (req, res) => {
  try {
    const { adminId, companyId, taskId, status } = req.body;

    if (!adminId || !companyId || !taskId || !status) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 1️⃣ Company check
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // 2️⃣ Check Admin
    let user = await Admin.findOne({ _id: adminId, companyId });
    let role = "admin";

    // 3️⃣ If not admin → check Employee
    if (!user) {
      user = await Employee.findOne({ _id: adminId, createdBy: companyId }).populate("department", "name managers");
      if (!user) {
        return res.status(403).json({
          success: false,
          message: "You are not authorised",
        });
      }

      role = user?.department?.managers?.includes(user?._id)? "manager" : "employee"; 
    }

    // 🟢 Admin or Manager → update TASK
    if (role === "admin" || role === "manager") {
      const task = await Task.findOne({
        _id: taskId,
        companyId,
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found for this company",
        });
      }

      task.status = status;
      await task.save();

      if (task?.status === "completed") {
        await recentActivity.create({ title: "Task Completed.", createdBy: user?._id, createdByRole: role === "admin" ? "Admin" : "Employee", companyId: companyId });

        await sendNotification({
          createdBy: user?._id,

          userId: user?.role === "admin" ? task?.managerId : task?.createdBy,

          userModel: user?.role === "admin" ? "Employee" : "Admin", // "Admin" or "Employee"

          companyId: companyId,

          message: `task Completed: ${task.name}`,

          type: "task",

          referenceId: task._id
        });
      }

      return res.status(200).json({
        success: true,
        message: "Task status updated successfully",
        data: {
          taskId: task._id,
          status: task.status,
          updatedBy: role,
        },
      });
    }

    // 🔵 Normal Employee → update SUBTASK
    if (role === "employee") {
      const subTask = await SubTask.findOne({
        _id: taskId,
        companyId,
      });

      if (!subTask) {
        return res.status(404).json({
          success: false,
          message: "Task not found for this company",
        });
      }

      subTask.status = status;
      await subTask.save();
      if (subTask?.status === "completed") {
        await recentActivity.create({ title: "Task Completed.", createdBy: user?._id, createdByRole: "Employee", companyId: companyId });

        await sendNotification({
          createdBy: user?._id,

          userId: user?.taskRole === "manager" || user?.role === "admin" ? subTask?.employeeId : subTask?.createdBy,

          userModel: user?.role === "admin" ? "Employee" : "Admin", // "Admin" or "Employee"

          companyId: companyId,

          message: `Sub Task Completed: ${subTask.name}`,

          type: "task",

          referenceId: subTask._id
        });

      }

      return res.status(200).json({
        success: true,
        message: "Task status updated successfully",
        data: {
          subTaskId: subTask._id,
          status: subTask.status,
          updatedBy: "employee",
        },
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};
const reassignTask = async (req, res) => {
  try {
    const {
      companyId,
      taskId,
      adminId,
      employeeId,
      startDate,
      endDate,
    } = req.body;

    if (!companyId || !taskId || !adminId) {
      return res.status(400).json({
        success: false,
        message: "companyId, taskId and adminId are required",
      });
    }

    // 1️⃣ Check Company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // 2️⃣ Check Admin / Manager
    let user = await Admin.findOne({ _id: adminId, companyId });
    let userRole = "admin";

    if (!user) {
      user = await Employee.findOne({ _id: adminId, createdBy: companyId }).populate("department", "name managers");
      if (user && !user?.department?.managers?.includes(user?._id)) {
        return res.status(403).json({
          success: false,
          message: "Only admin or manager can reassign task",
        });
      }
      userRole = "manager";
    }

    // 3️⃣ Check Task
    const task = await Task.findOne({
      _id: taskId,
      companyId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found for this company",
      });
    }

    // ==============================
    // 🆕 STEP 1: store old dates
    // ==============================
    const oldStart = new Date(task.startDate);
    const oldEnd = new Date(task.endDate);

    // 4️⃣ Reassign Manager (optional)
    if (employeeId) {
      const manager = await Employee.findById(employeeId).populate("department");
      if (manager && !manager?.department?.managers?.includes(manager?._id)) {
        return res.status(400).json({
          success: false,
          message: "Task can be assigned only to a manager",
        });
      }

      task.managerId = employeeId;
    }

    // 5️⃣ Update Dates (optional)
    if (startDate) {
      task.startDate = new Date(startDate);
    }

    if (endDate) {
      task.endDate = new Date(endDate);
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be earlier than start date",
      });
    }

    // ==============================
    // 🆕 STEP 2: calculate diff
    // ==============================
    const newEnd = new Date(task.endDate);
    const diff = newEnd.getTime() - oldEnd.getTime();

    // 6️⃣ Save Task (UNCHANGED)
    await task.save();

    // ==============================
    // 🆕 STEP 3: SHIFT FUTURE TASKS + SUBTASKS
    // ==============================
    if (diff !== 0) {
      const futureTasks = await Task.find({
        companyId,
        managerId: task.managerId,
        _id: { $ne: task._id },
        startDate: { $gt: oldEnd },
      });

      // 🔁 Shift Tasks
      const taskBulkOps = futureTasks.map(t => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              startDate: new Date(new Date(t.startDate).getTime() + diff),
              endDate: new Date(new Date(t.endDate).getTime() + diff),
            }
          }
        }
      }));

      if (taskBulkOps.length > 0) {
        await Task.bulkWrite(taskBulkOps);
      }

      // 🔁 Shift Subtasks of those tasks
      const futureTaskIds = futureTasks.map(t => t._id);

      const futureSubtasks = await SubTask.find({
        taskId: { $in: futureTaskIds }
      });

      const subBulkOps = futureSubtasks.map(st => ({
        updateOne: {
          filter: { _id: st._id },
          update: {
            $set: {
              startDate: new Date(new Date(st.startDate).getTime() + diff),
              endDate: new Date(new Date(st.endDate).getTime() + diff),
            }
          }
        }
      }));

      if (subBulkOps.length > 0) {
        await SubTask.bulkWrite(subBulkOps);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Task reassigned successfully",
      data: {
        taskId: task._id,
        managerId: task.managerId,
        startDate: task.startDate,
        endDate: task.endDate,
        updatedBy: userRole,
      },
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Server error: ${err.message}`,
    });
  }
};

const handleGetOverdueTask = async (req, res) => {
  try {
    const { userId, companyId } = req.query;

    if (!userId || !companyId) {
      return res.status(400).json({ message: "userId and companyId are required" });
    }

    // 1️⃣ Check Company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    let user = await Admin.findOne({ _id: userId, companyId });
    let role = "admin";

    // 2️⃣ If not admin → check employee
    if (!user) {
      user = await Employee.findOne({ _id: userId, createdBy: companyId }).populate("department", "name managers");
      if (user) {
        if (user?.department?.managers?.includes(user?._id)) {
          role = "manager"
        }
        else {
          role = "employee"
        }
      }
      else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const today = new Date();
    let data = [];

    // 3️⃣ ADMIN → All overdue TASKS
    if (role === "admin") {
      data = await Task.find({
        companyId,
        endDate: { $lt: today },
        status: { $ne: "completed" }
      }).populate("projectId", "name startDate endDate")
        .populate({path:"managerId", select:"fullName profileImage role department", populate:{path:"department",select:"name managers"}})
        .sort({ endDate: 1 });
    }

    // 4️⃣ MANAGER → TASKS where managerId matches
    else if (role === "manager") {
      data = await Task.find({
        companyId,
        $or: [
          { managerId: user._id },
          { createdBy: user._id }
        ],
        endDate: { $lt: today },
        status: { $ne: "completed" }
      })
        .populate("projectId", "name startDate endDate")
        .populate({path:"managerId", select:"fullName profileImage role department", populate:{path:"department",select:"name managers"}})
        .sort({ endDate: 1 });
    }

    else {
      data = await SubTask.find({
        companyId,
        employeeId: user._id,
        endDate: { $lt: today },
        status: { $ne: "completed" }
      })
        .populate("taskId", "name startDate endDate")
        .populate({
          path: "createdBy"
        })
        .sort({ endDate: 1 });
    }

    return res.status(200).json({
      success: true,
      role,
      count: data.length,
      data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Server Error: ${err.message}` });
  }
};


module.exports = { createTask, getTaskById, updateTask, deleteTask, handleGetOverdueTask, getTasksByCompany, taskStatusChange, reassignTask }