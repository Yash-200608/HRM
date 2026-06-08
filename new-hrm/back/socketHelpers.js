const { Server } = require("socket.io");
const Notification = require("./models/personalOffice/NotificationModel"); // Notification model
const Department = require("./models/personalOffice/departmentModel.js");
const { Employee } = require("./models/personalOffice/employeeModel"); // adjust path if needed
const { insertOne } = require("./models/personalOffice/SubtaskModel");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:8080", "http://localhost:8081"],
    },
    maxHttpBufferSize: 1e8,
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      const room = roomId?.toString();
      if (!socket.rooms.has(room)) {
        socket.join(room);
      }
    });

    socket.on("message", (data) => {
      socket.emit("message", data);
    });

    socket.on("refreshProfile", () => {
      socket.emit("refreshProfile");
    });

    socket.on("refreshTasks", () => {
      io.emit("refreshTasks");
    });

    socket.on("departmentRefresh", async (departmentId) => {
      const departmentData =
        await Department.findById(departmentId).select("name managers");
      io.emit("departmentRefresh", departmentData);
    });

    socket.on("addProjectRefresh", (projectId) => {
      io.emit("getProjectRefresh");
    });

    socket.on("addTaskRefresh", () => {
      io.emit("getTaskRefresh");
    });

    socket.on("addSubTaskRefresh", () => {
      io.emit("getSubTaskRefresh");
    });
    socket.on("addEmployeeRefresh", () => {
      io.emit("getEmployeeRefresh");
    });

    socket.on("addLeaveRefresh", () => {
      io.emit("getLeaveRefresh");
    });
    socket.on("addAttendanceRefresh", () => {
      io.emit("getAttendanceRefresh");
    });
    socket.on("addPayrollRefresh", () => {
      io.emit("getPayrollRefresh");
    });
    socket.on("addDepartmentRefresh", async (employeeId) => {
      const employeeData = await Employee.findById(employeeId)
        .populate("createdBy", "name logo")
        .populate("department", "name managers")
        .select("+password");
      io.emit("getDepartmentRefresh", employeeData);
    });
    socket.on("addRelieveRefresh", (employeeId) => {
      console.log(employeeId);
      io.emit("getRelieveRefresh", employeeId);
    });

    socket.on(
      "updateManagerRefreshForFrontend",
      async ({ selectedEmployee, oldEmployee }) => {
        // same room me sabko notify karo
        const employeeData = await Employee.findById(selectedEmployee)
          .populate("createdBy", "name logo")
          .populate("department", "name managers")
          .select("+password");
        const oldEmployeeData = await Employee.findById(oldEmployee)
          .populate("createdBy", "name logo")
          .populate("department", "name managers")
          .select("+password");
        io.emit("updateManagerRefresh", {
          newManager: employeeData,
          oldManager: oldEmployeeData,
        });
      },
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  console.log("Socket initialized.");
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

/**
 * Send notification: save in DB and emit via socket
 * @param {string} userId - User ObjectId
 * @param {string} userModel - "Admin" or "Employee"
 * @param {string} companyId - Company ObjectId
 * @param {string} message - Notification message
 * @param {string} type - "task" | "subtask" | "leave" | "general"
 * @param {string|null} referenceId - Related Task/Leave/Subtask ID
 */

async function sendNotification({
  createdBy,
  userId,
  userModel,
  companyId,
  message,
  type = "general",
  referenceId = null,
}) {
  if (!io) return console.error("Socket.io not initialized");
  console.log(
    createdBy,
    userId,
    userModel,
    companyId,
    message,
    type,
    referenceId,
  );
  // if(!createdBy || !userId ||!userModel || !companyId || !message || !type ||  !referenceId) return {message : " required field missing."}

  try {
    // 1️⃣ Save in MongoDB
    const notificationDoc = await Notification.create({
      userId,
      userModel, // required
      companyId, // required
      message,
      type,
      referenceId,
      createdBy,
    });

    // Populate createdBy for frontend display
    const notification = await notificationDoc.populate("createdBy");

    // 2️⃣ Emit via socket to the user
    io.to(userId.toString()).emit("newNotification", notification);

    console.log("Notification sent:", notification);
  } catch (err) {
    console.error("Send notification error:", err);
  }
}

module.exports = { initSocket, getIO, sendNotification };
