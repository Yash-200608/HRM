const Project = require("../../../models/personalOffice/projectModel");
const Company = require("../../../models/personalOffice/companyModel");
const { Admin } = require("../../../models/personalOffice/authModel");
const Task = require("../../../models/personalOffice/taskModel");
const SubTask = require("../../../models/personalOffice/SubtaskModel");
const { Employee } = require("../../../models/personalOffice/employeeModel");
const recentActivity = require("../../../models/personalOffice/recentActivityModel");
const { sendNotification } = require("../../../socketHelpers");



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
 * ✅ ADD PROJECT
 */
const addProject = async (req, res) => {
  const { adminId, companyId, obj } = req.body;


  try {
    // 1️⃣ Validation
    if (!adminId || !companyId || !obj) {
      return res.status(400).json({ message: "Required data missing." });
    }

    // 2️⃣ Company check
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    // 3️⃣ Admin check
    const admin = await Admin.findOne({ _id: adminId, companyId });

if (!admin) {

  const employee = await Employee.findOne({
    _id: adminId,
    createdBy: companyId
  }).populate("assignedRole");

  console.log("employee", employee);

  if (!employee) {
    return res.status(403).json({
      message: "You are not authorized."
    });
  }

  const permissions =
    employee?.assignedRole?.permissions || [];

  console.log("permissions", permissions);

  const hasProjectPermission =
  permissions?.projects?.create === true;

  console.log("hasProjectPermission", hasProjectPermission);

  if (!hasProjectPermission) {
    return res.status(403).json({
      message: "You do not have permission to create projects."
    });
  }
}

    // 4️⃣ Status logic based on startDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(obj.startDate);
    startDate.setHours(0, 0, 0, 0);

    const projectStatus = startDate <= today ? "active" : "pending";

    // 4️⃣ Create project
    const project = new Project({
      companyId,
      adminId,
      name: obj.name,
      description: obj.description,
      startDate: obj.startDate,
      endDate: obj.endDate,
      priority: obj.priority,
      remarks: obj.remarks,
      status: projectStatus,
    });

    await project.save();

    await sendNotification({
      createdBy: adminId,

      userId: company?.createdBy,

      userModel: "Admin", // "Admin" or "Employee"

      companyId: companyId || null,

      message: `New Project Created: ${project?.name} By Admin ${admin?.username}`,

      type: "project",

      referenceId: project._id
    });

    return res.status(201).json({
      message: "Project created successfully.",
      project,
    });

  } catch (err) {
    return res.status(500).json({ message: `Server Error: ${err.message}` });
  }
};

/**
 * ✅ GET PROJECTS (Company wise)
 */
const getProjects = async (req, res) => {
  const { adminId, companyId } = req.query;

  try {
    if (!adminId || !companyId) {
      return res.status(400).json({
        message: "Required data missing."
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        message: "Company not found."
      });
    }

    // ================= ADMIN =================
    const admin = await Admin.findOne({
      _id: adminId,
      companyId
    });

    if (admin) {

      const projects = await Project.find({
        companyId
      }).sort({ createdAt: -1 });

      return res.status(200).json(projects);
    }

    // ================= EMPLOYEE / HR =================
    const employee = await Employee.findOne({
      _id: adminId,
      createdBy: companyId
    }).populate("assignedRole");

    if (!employee) {
      return res.status(403).json({
        message: "You are not authorized."
      });
    }

    const permissions =
      employee?.assignedRole?.permissions || {};

    const canViewProjects =
      permissions?.projects?.view === true;

    if (!canViewProjects) {
      return res.status(403).json({
        message: "You do not have permission to view projects."
      });
    }

    const projects = await Project.find({
      companyId
    }).sort({ createdAt: -1 });

    return res.status(200).json(projects);

  } catch (err) {

    return res.status(500).json({
      message: `Server Error: ${err.message}`
    });
  }
};

const getProjectById = async (req, res) => {
  const { adminId, companyId, projectId } = req.query;
  try {
    // 1️⃣ Validate admin
    await validateUser(adminId);

    // 2️⃣ Check company
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    // 3️⃣ Fetch project
  const project = await Project.findOne({ _id: projectId, companyId })
  .populate("adminId", "username email role profileImage")
  .populate({
    path: "tasks",
    populate: [
      { path: "createdBy", select: "username email role profileImage" },
      {
        path: "managerId",
        select: "fullName department role profileImage",
        populate: {
          path: "department",
          select: "name managers"
        }
      },
      {
        path: "subTasks",
        populate: [
          { path: "createdBy", select: "username email role profileImage" },
          {
            path: "employeeId",
            select: "fullName role department designation profileImage",
            populate: {
              path: "department",
              select: "name managers"
            }
          }
        ]
      }
    ]
  })
  .populate({
    path: "subTasks",
    populate: [
      { path: "createdBy", select: "username email role profileImage" },
      {
        path: "employeeId",
        select: "fullName role department designation profileImage",
        populate: {
          path: "department",
          select: "name managers"
        }
      },
      {
        path: "taskId",
        select: "name managerId",
        populate: {
          path: "managerId",
          select: "fullName department role profileImage",
          populate: {
            path: "department",
            select: "name managers"
          }
        }
      }
    ]
  });

    if (!project) throw new Error("Project not found");

    res.json({
      success: true,
      data: project,
    });

  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message,
    });
  }
};


/**
 * ✅ UPDATE PROJECT
 */
const updateProject = async (req, res) => {
  const { adminId, companyId, obj } = req.body;

  try {
    if (!adminId || !companyId || !obj?._id) {
      return res.status(400).json({ message: "Required data missing." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    // ✅ Admin check
    const admin = await Admin.findOne({ _id: adminId, companyId });
    if (!admin) {
      return res.status(403).json({ message: "You are not authorized." });
    }

    const project = await Project.findOne({ _id: obj._id, companyId });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // ✅ Final dates (fallback to old values)
    const newStartDate = obj.startDate
      ? new Date(obj.startDate)
      : new Date(project.startDate);

    const newEndDate = obj.endDate
      ? new Date(obj.endDate)
      : new Date(project.endDate);

    // ✅ Basic validation
    if (newStartDate > newEndDate) {
      throw new Error("Project start date cannot be after end date.");
    }

    // ✅ Get all tasks of this project
    const tasks = await Task.find({ projectId: obj._id });

    for (let task of tasks) {
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);

      // 🔴 Task बाहर है project se
      if (taskStart < newStartDate || taskEnd > newEndDate) {
        throw new Error(
          `Task "${task.name}" is outside the project dates. Please update this task first.`
        );
      }

      // ✅ Get subtasks of this task
      const subtasks = await SubTask.find({ taskId: task._id });

      for (let sub of subtasks) {
        const subStart = new Date(sub.startDate);
        const subEnd = new Date(sub.endDate);

        // 🔴 Subtask बाहर है project se
        if (subStart < newStartDate || subEnd > newEndDate) {
          throw new Error(
            `Subtask "${sub.name}" (under task "${task.name}") is outside the project dates. Please update it first.`
          );
        }
      }
    }

    // ============================
    // 🆕 AUTO CASCADING LOGIC (ADDED)
    // ============================

    const oldStart = new Date(project.startDate);
    const oldEnd = new Date(project.endDate);

    const diff = newEndDate.getTime() - oldEnd.getTime();

    // ============================
    // EXISTING PROJECT UPDATE (UNCHANGED)
    // ============================
    if (obj.name !== undefined) project.name = obj.name;
    if (obj.description !== undefined) project.description = obj.description;
    if (obj.startDate !== undefined) project.startDate = obj.startDate;
    if (obj.endDate !== undefined) project.endDate = obj.endDate;
    if (obj.priority !== undefined) project.priority = obj.priority;
    if (obj.remarks !== undefined) project.remarks = obj.remarks;
    if (obj.status !== undefined) project.status = obj.status;

    await project.save();

    // ============================
    // 🆕 SHIFT TASKS + SUBTASKS
    // ============================
    if (diff !== 0) {
      const futureTasks = await Task.find({ projectId: obj._id, startDate: { $gt: oldEnd }});

      const taskBulkOps = futureTasks.map(task => ({
        updateOne: {
          filter: { _id: task._id },
          update: {
            $set: {
              startDate: new Date(new Date(task.startDate).getTime() + diff),
              endDate: new Date(new Date(task.endDate).getTime() + diff),
            }
          }
        }
      }));

      if (taskBulkOps.length > 0) { await Task.bulkWrite(taskBulkOps);}

      const futureTaskIds = futureTasks.map(t => t._id);

      const futureSubtasks = await SubTask.find({ taskId: { $in: futureTaskIds }});

      const subBulkOps = futureSubtasks.map(sub => ({
        updateOne: {
          filter: { _id: sub._id },
          update: {
            $set: {
              startDate: new Date(new Date(sub.startDate).getTime() + diff),
              endDate: new Date(new Date(sub.endDate).getTime() + diff),
            }
          }
        }
      }));

      if (subBulkOps.length > 0) { await SubTask.bulkWrite(subBulkOps); }
    }

    return res.status(200).json({ message: "Project updated successfully.", project});

  } catch (err) {
    return res.status(400).json({
      message: err.message || "Server Error",
    });
  }
};
/**
 * ✅ DELETE PROJECT
 *//**
* ✅ PERMANENT DELETE PROJECT (FULL CASCADE)
*/
const deleteProject = async (req, res) => {
  const { adminId, companyId, projectId } = req.query;

  try {
    if (!adminId || !companyId || !projectId) {
      return res.status(400).json({ message: "Required data missing." });
    }

    // 1️⃣ Company check
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    // 2️⃣ Admin authorization check
    const admin = await Admin.findOne({ _id: adminId, companyId });
    if (!admin) {
      return res.status(403).json({ message: "You are not authorized." });
    }

    // 3️⃣ Find project
    const project = await Project.findOne({ _id: projectId, companyId });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // 4️⃣ Find all tasks of this project
    const tasks = await Task.find({ projectId, companyId });

    // 5️⃣ Collect all subTask IDs from tasks
    const subTaskIds = tasks.flatMap(task => task.subTasks || []);

    // 6️⃣ Delete all subtasks
    if (subTaskIds.length > 0) {
      await SubTask.deleteMany({ _id: { $in: subTaskIds } });
    }

    // 7️⃣ Delete all tasks of this project
    await Task.deleteMany({ projectId });

    // 8️⃣ Delete project itself
    await Project.findByIdAndDelete(projectId);

    await recentActivity.create({ title: `${Project?.name} Project Deleted.`, createdBy: admin?._id, createdByRole: "Admin", companyId: companyId })


    return res.status(200).json({
      success: true,
      message: "Project, tasks and subtasks permanently deleted",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: `Server Error: ${err.message}`,
    });
  }
};


const projectStatusChange = async (req, res) => {
  try {
    const { adminId, companyId, projectId, status } = req.body;

    if (!adminId || !companyId || !projectId || !status) {
      return res.status(400).json({ message: "Required data missing." });
    }
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    // Admin check
    const admin = await Admin.findOne({ _id: adminId, companyId });
    if (!admin) {
      return res.status(403).json({ message: "You are not authorized." });
    }

    const project = await Project.findOneAndUpdate({
      _id: projectId,
      companyId,
    }, { $set: { status } });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (status === "completed") {
      await recentActivity.create({ title: "Project Completed.", createdBy: admin?._id, createdByRole: "Admin", companyId: companyId });
      await sendNotification({
        createdBy: admin?._id,

        userId: company?.createdBy,

        userModel: "Admin", // "Admin" or "Employee"

        companyId: companyId || null,

        message: ` Project Completed : ${project?.name} By Admin ${admin?.username}`,

        type: "project",

        referenceId: project._id
      });
    }

    return res.status(200).json({ message: "Project Status Updated Successfully." });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: `Server Error: ${err}` })
  }
};






const getDashboardSummary = async (req, res) => {
  try {
    const { userId, companyId } = req.query;

    if (!userId || !companyId) {
      return res.status(400).json({ success: false, message: "userId and companyId are required" });
    }

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ success: false, message: "Company not found." });

    let user = await Admin.findOne({ _id: userId, companyId });
    let role = "admin";

    if (!user) {
      user = await Employee.findOne({ _id: userId, createdBy: companyId }).populate("department", "managers");
      role = "employee";
      if (!user) return res.status(404).json({ success: false, message: "User not found." });
    }

    const today = new Date();

    if (role === "admin") {
      // ===== Admin logic =====
      const totalProjects = await Project.countDocuments({ companyId });
      const totalTasks = await Task.countDocuments({ companyId });
      const pendingTasks = await Task.countDocuments({ companyId, status: "pending" });
      const activeTasks = await Task.countDocuments({ companyId, status: "active" });
      const overdueTasks = await Task.countDocuments({
        companyId,
        endDate: { $lt: today },
        status: { $ne: "completed" },
      });

      const recentProjects = await Project.find({ companyId }).populate("adminId")
        .sort({ createdAt: -1 })
        .limit(4);

      const recentTasks = await Task.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(4)
        .select("_id name status startDate endDate")
        .populate("managerId", "fullName profileImage");

      return res.status(200).json({
        success: true,
        summary: {
          totalProjects,
          totalTasks,
          pendingTasks,
          activeTasks,
          overdueTasks,
          recentProjects,
          recentTasks,
        },
      });
    } else if (user?.department?.managers?.includes(user?._id)) {
      // ===== Manager logic =====
      const totalTasks = await Task.countDocuments({
        companyId,
        $or: [{ managerId: user._id }, { createdBy: user._id }],
      });
      const pendingTasks = await Task.countDocuments({
        companyId,
        $or: [{ managerId: user._id }, { createdBy: user._id }],
        status: "pending",
      });
      const activeTasks = await Task.countDocuments({
        companyId,
        $or: [{ managerId: user._id }, { createdBy: user._id }],
        status: "active",
      });
      const overdueTasks = await Task.countDocuments({
        companyId,
        $or: [{ managerId: user._id }, { createdBy: user._id }],
        endDate: { $lt: today },
        status: { $ne: "completed" },
      });

      const recentProjects = await Task.find({
        companyId,
        $or: [{ managerId: user._id }, { createdBy: user._id }],
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("managerId", "fullName profileImage")
        .populate("createdBy");

      const recentTasks = await SubTask.find({
        companyId,
        createdBy: user._id,
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("taskId")
        .populate("createdBy");

      return res.status(200).json({
        success: true,
        summary: { totalTasks, pendingTasks, activeTasks, overdueTasks, recentTasks, recentProjects},
      });
    } else {
      // ===== Employee logic =====
      const totalTasks = await SubTask.countDocuments({ companyId, employeeId: user._id });
      const pendingTasks = await SubTask.countDocuments({ companyId, employeeId: user._id, status: "pending" });
      const activeTasks = await SubTask.countDocuments({ companyId, employeeId: user._id, status: "active" });
      const overdueTasks = await SubTask.countDocuments({
        companyId,
        employeeId: user._id,
        endDate: { $lt: today },
        status: { $ne: "completed" },
      });
      // y naam recent project is liye use kiya hai taki frontend m koi problem na ho 
      const recentProjects = await SubTask.find({ companyId, employeeId: user._id })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("taskId")
        .populate("createdBy");

      return res.status(200).json({
        success: true,
        summary: { totalTasks, pendingTasks, activeTasks, overdueTasks, recentProjects},
      });
    }
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


module.exports = { addProject, getProjects, updateProject, deleteProject, projectStatusChange, getProjectById, getDashboardSummary};
