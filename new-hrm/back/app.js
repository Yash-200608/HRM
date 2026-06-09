// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const swaggerUI = require("swagger-ui-express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { connectDB } = require("./config/db.js");

const authRoutes = require("./routes/authRoute.js");
const employeesRoutes = require("./routes/employeesRoute.js");
const expenseRoutes = require("./routes/expenseRoutes.js");
const departmentRoutes = require("./routes/departmentRoutes.js");
const expenseCategoryRoutes = require("./routes/expenseCategoryRoutes.js");
const pdfLetterRoutes = require("./routes/pdfLetterRoute.js");
const leaveRoutes = require("./routes/leaveRoutes.js");
const leaveRequestRoutes = require("./routes/leaveRequestRoutes.js");
const attendanceRoutes = require("./routes/attendanceRoute.js");
const payRollRoutes = require("./routes/payRollRoute.js");
const companyRoutes = require("./routes/companyRoutes.js");
const taskRoutes = require("./routes/taskRoutes.js");
const accessroleRoutes = require("./routes/roleRoutes");
const resignationRoutes = require("./routes/resignationRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const authMiddleware = require("./middleware/authMiddleware.js");
const { correlationIdMiddleware } = require("./middleware/correlationIdMiddleware.js");
const { mountSubscriptionProxyRoutes } = require("./routes/subscriptionProxyRoutes.js");
const { router: platformRoutes, handleOutboxInbound } = require("./routes/platformRoutes.js");
const billingOverviewRoutes = require("./routes/billingOverviewRoutes.js");
const complianceRoutes = require("./routes/complianceRoutes.js");
const performanceRoutes = require("./routes/performanceRoutes.js");
const assetRoutes = require("./routes/assetRoutes.js");
const learningRoutes = require("./routes/learningRoutes.js");
const scimRoutes = require("./routes/scimRoutes.js");
const scimAdminRoutes = require("./routes/scimAdminRoutes.js");


// job-portal
const roleRoutes = require("./routes/job-portal-route/roleRoute.js");
const candidateRoutes = require("./routes/job-portal-route/candidateRoute.js");
const companyJobRoutes = require("./routes/job-portal-route/companyJobRoute.js");
const jobRoutes = require("./routes/job-portal-route/jobRoute.js");
const applicationRoutes = require("./routes/job-portal-route/applicationRoute.js");
const dashboardRoutes = require("./routes/job-portal-route/dashboardRoute.js");

// lead-portal
const productRoutes = require("./routes/lead-portal-route/productRoute.js");
const leadRoutes = require("./routes/lead-portal-route/leadRoute.js");
const messageRoutes = require("./routes/lead-portal-route/message.route.js");

// super admin routes
const superAdminRoutes = require("./routes/superAdminRoute.js");

const swaggerSpec = require("./swagger");
const cookieParser = require("cookie-parser");
const { initSocket } = require("./socketHelpers.js");
const monthlyAttendanceRoutes = require("./routes/monthlyAttendanceRoutes");


// Load env
dotenv.config();

const app = express();
const PORT = process.env.HRM_PORT || process.env.PORT || 5000;

// ------------------------
// Middlewares
// ------------------------
app.use(correlationIdMiddleware);
app.post(
  "/api/platform/outbox/inbound",
  express.raw({ type: "application/json" }),
  handleOutboxInbound
);
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "https://salmon-tapir-632940.hostingersite.com",
      process.env.HRM_FRONTEND_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use("/api", resignationRoutes);
app.use("/api", holidayRoutes);
// Swagger
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/pdfGenerater", pdfLetterRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payRollRoutes", payRollRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/assignroles", accessroleRoutes);
app.use(
  "/api/letter",
  require(
    "./routes/letterRoutes"
  )
);

app.use("/uploads", express.static("uploads"));
// job-portal
app.use("/api/role", roleRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/companyJob", companyJobRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);


app.use("/api", monthlyAttendanceRoutes);

// lead-portal
app.use("/api/product", productRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/message", messageRoutes);

// super-admin
app.use("/api/superAdmin/auth", superAdminRoutes);

// Phase 2 platform lifecycle + billing overview
app.use("/api/platform", platformRoutes);
app.use("/api/billing", billingOverviewRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/learning", learningRoutes);
app.use("/scim/v2", scimRoutes);
app.use("/api/scim", scimAdminRoutes);

// subscription/billing API gateway (authenticated; client internal keys stripped)
mountSubscriptionProxyRoutes(app, { authMiddleware });

app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.get("/admin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.get("/superAdmin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const server = http.createServer(app);

async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected successfully!");

    const ioInstance = initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("Server start failed:", err);
    process.exit(1);
  }
}

// Start everything
startServer();
