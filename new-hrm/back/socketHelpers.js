const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Notification = require("./models/personalOffice/NotificationModel");
const Department = require("./models/personalOffice/departmentModel.js");
const { Employee } = require("./models/personalOffice/employeeModel");
const { validateJwtClaims } = require("@hrm-subscription/shared-auth");
const { resolveSocketCorsOrigins } = require("./config/corsConfig.js");

let io;

function parseCookieHeader(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""];
        }

        const key = part.slice(0, separatorIndex);
        const value = part.slice(separatorIndex + 1);
        return [key, decodeURIComponent(value)];
      })
  );
}

function extractSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const authorization = socket.handshake.headers?.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.split(" ")[1];
  }

  const cookies = parseCookieHeader(socket.handshake.headers?.cookie || "");
  if (cookies.accessToken) {
    return cookies.accessToken;
  }

  return null;
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: resolveSocketCorsOrigins(),
      credentials: true,
    },
    maxHttpBufferSize: 1e8,
  });

  io.use((socket, next) => {
    try {
      const token = extractSocketToken(socket);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const claimValidation = validateJwtClaims(decoded);

      if (!claimValidation.valid) {
        return next(new Error("Invalid token claims"));
      }

      socket.user = {
        id: String(decoded.id),
        role: decoded.role,
        companyId: claimValidation.claims.orgId || claimValidation.claims.companyId || null,
      };

      return next();
    } catch (error) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      if (String(roomId) !== socket.user.id) {
        return;
      }

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

    socket.on("addProjectRefresh", () => {
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
        .select("-password");
      io.emit("getDepartmentRefresh", employeeData);
    });
    socket.on("addRelieveRefresh", (employeeId) => {
      io.emit("getRelieveRefresh", employeeId);
    });

    socket.on(
      "updateManagerRefreshForFrontend",
      async ({ selectedEmployee, oldEmployee }) => {
        const employeeData = await Employee.findById(selectedEmployee)
          .populate("createdBy", "name logo")
          .populate("department", "name managers")
          .select("-password");
        const oldEmployeeData = await Employee.findById(oldEmployee)
          .populate("createdBy", "name logo")
          .populate("department", "name managers")
          .select("-password");
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

  try {
    const notificationDoc = await Notification.create({
      userId,
      userModel,
      companyId,
      message,
      type,
      referenceId,
      createdBy,
    });

    const notification = await notificationDoc.populate("createdBy");

    io.to(userId.toString()).emit("newNotification", notification);

    console.log("Notification sent:", notification);
  } catch (err) {
    console.error("Send notification error:", err);
  }
}

module.exports = { initSocket, getIO, sendNotification };