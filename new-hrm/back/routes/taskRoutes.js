const router = require("express").Router();

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
router.post("/manager/add", addManager);
router.get("/manager/get", getManagers);
router.put("/manager/update", updateManager);
router.delete("/manager/delete", deleteManager);

// Project k liye
router.post("/project/add", addProject);
router.get("/project/get", getProjects);
router.get("/project/getbyid", getProjectById);
router.put("/project/update", updateProject);
router.delete("/project/delete", deleteProject);
router.patch("/project/status", projectStatusChange);
router.get("/project/dashboardsummary", getDashboardSummary);

// Task k liye
router.post("/task/add", createTask);
router.get("/task/get", getTasksByCompany);
router.get("/task/getbyid", getTaskById);
router.get("/task/overdue", handleGetOverdueTask);
router.put("/task/update", updateTask);
router.delete("/task/delete", deleteTask);
router.patch("/task/status", taskStatusChange);
router.patch("/task/reassign", reassignTask);

// Sub Task k liye
router.get("/subtask/employee", getIdByTaskDetail);
router.post("/subtask/add", createSubTask);
router.get("/subtask/get", getSubTasksByCompany);
router.get("/subtask/getbyid", getSubTaskById);
router.put("/subtask/update", updateSubTask);
router.patch("/subtask/status", subTaskStatusChange);
router.patch("/subtask/reassign", reassignSubTask);
router.delete("/subtask/delete", deleteSubTask);

module.exports = router;