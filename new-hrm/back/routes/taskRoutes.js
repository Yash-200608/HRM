const router = require("express").Router();
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");

const taskAccess = enforceModuleAccess("tasks");
const taskMutationGuard = requireWritableTenant();

const { addManager, getManagers, updateManager, deleteManager } = require("../controllers/personalOffice/tasks/taskManagerController");
const { addProject, getDashboardSummary, getProjects, getProjectById, updateProject, deleteProject, projectStatusChange } = require("../controllers/personalOffice/tasks/projectController");
const { createTask, getTaskById, handleGetOverdueTask, updateTask, deleteTask, getTasksByCompany, taskStatusChange, reassignTask } = require("../controllers/personalOffice/tasks/taskController");
const { createSubTask,
  getSubTasksByCompany,
  getSubTaskById,
  updateSubTask,
  subTaskStatusChange,
  reassignSubTask,
  deleteSubTask,
  getIdByTaskDetail } = require("../controllers/personalOffice/tasks/SubTaskController");
// Manager k liye
router.post("/manager/add", taskMutationGuard, taskAccess, addManager);
router.get("/manager/get", taskAccess, getManagers);
router.put("/manager/update", taskMutationGuard, taskAccess, updateManager);
router.delete("/manager/delete", taskMutationGuard, taskAccess, deleteManager);

// Project k liye
router.post("/project/add", taskMutationGuard, taskAccess, addProject);
router.get("/project/get", taskAccess, getProjects);
router.get("/project/getbyid", taskAccess, getProjectById);
router.put("/project/update", taskMutationGuard, taskAccess, updateProject);
router.delete("/project/delete", taskMutationGuard, taskAccess, deleteProject);
router.patch("/project/status", taskMutationGuard, taskAccess, projectStatusChange);
router.get("/project/dashboardsummary", taskAccess, getDashboardSummary);

// Task k liye
router.post("/task/add", taskMutationGuard, taskAccess, createTask);
router.get("/task/get", taskAccess, getTasksByCompany);
router.get("/task/getbyid", taskAccess, getTaskById);
router.get("/task/overdue", taskAccess, handleGetOverdueTask);
router.put("/task/update", taskMutationGuard, taskAccess, updateTask);
router.delete("/task/delete", taskMutationGuard, taskAccess, deleteTask);
router.patch("/task/status", taskMutationGuard, taskAccess, taskStatusChange);
router.patch("/task/reassign", taskMutationGuard, taskAccess, reassignTask);

// Sub Task k liye
router.get("/subtask/employee", taskAccess, getIdByTaskDetail);
router.post("/subtask/add", taskMutationGuard, taskAccess, createSubTask);
router.get("/subtask/get", taskAccess, getSubTasksByCompany);
router.get("/subtask/getbyid", taskAccess, getSubTaskById);
router.put("/subtask/update", taskMutationGuard, taskAccess, updateSubTask);
router.patch("/subtask/status", taskMutationGuard, taskAccess, subTaskStatusChange);
router.patch("/subtask/reassign", taskMutationGuard, taskAccess, reassignSubTask);
router.delete("/subtask/delete", taskMutationGuard, taskAccess, deleteSubTask);

module.exports = router;