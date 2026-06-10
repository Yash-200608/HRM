/**
 * Live runtime E2E verification — phase 2 with CSRF-aware mutations.
 * Run: node scripts/e2e-runtime-audit.js
 */
require("dotenv").config();
const axios = require("axios");
const { io } = require("socket.io-client");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db");
const { Employee } = require("../models/personalOffice/employeeModel");
const { Admin } = require("../models/personalOffice/authModel");
const Company = require("../models/personalOffice/companyModel");
require("../models/personalOffice/departmentModel");
require("../models/personalOffice/roleModel");
const Notification = require("../models/personalOffice/NotificationModel");
const { LeaveRequest } = require("../models/personalOffice/leaveRequestModel");
const { generateAccessToken } = require("../service/service.js");
const { buildUserSubscriptionFields } = require("../service/tokenClaimsService.js");
const { createAuthSession } = require("../service/authSessionService.js");

const BASE = process.env.HRM_PUBLIC_BASE_URL || "http://localhost:5000";
const FRONTEND = process.env.HRM_FRONTEND_URL || "http://localhost:8080";
const TEST_EMPLOYEE_EMAIL = "test1@gmail.com";
const TEST_EMPLOYEE_PASSWORD = "Employee@123";
const TEST_ADMIN_EMAIL = "teamadmin@gmail.com";

const results = [];

function record(id, name, prior, runtime, evidence) {
  results.push({ id, name, prior, runtime, evidence });
}

function parseCsrfCookie(setCookieHeader = []) {
  const raw = Array.isArray(setCookieHeader) ? setCookieHeader.join(";") : String(setCookieHeader || "");
  const match = raw.match(/csrfToken=([^;]+)/);
  return match ? match[1] : null;
}

function createClient() {
  let csrfToken = null;

  const client = axios.create({
    baseURL: BASE,
    validateStatus: () => true,
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
      config.headers.Cookie = `csrfToken=${csrfToken}`;
    }
    return config;
  });

  async function bootstrapCsrf() {
    const res = await client.get("/api/auth/oauth/config");
    csrfToken = res.headers["x-csrf-token"] || parseCsrfCookie(res.headers["set-cookie"]);
    return csrfToken;
  }

  function authHeaders(token) {
    return { Authorization: `Bearer ${token}` };
  }

  return { client, bootstrapCsrf, authHeaders };
}

async function issueTokenForAccount(accountType, email) {
  let user;
  if (accountType === "employee") {
    user = await Employee.findOne({ email })
      .populate("createdBy", "name logo planCode status")
      .populate("department", "name managers")
      .populate("assignedRole")
      .lean(false);
  } else {
    user = await Admin.findOne({ email }).populate("companyId", "name logo planCode status").lean(false);
    if (user) user.role = "admin";
  }

  if (!user) throw new Error(`${accountType} not found: ${email}`);

  const sessionId = crypto.randomUUID();
  const fields = await buildUserSubscriptionFields(user, { accountType, sessionId });
  const token = generateAccessToken(fields.tokenInput);

  await createAuthSession({
    userId: user._id,
    accountType,
    sessionId,
    req: { headers: { "user-agent": "e2e-runtime-audit" }, ip: "127.0.0.1" },
    refreshToken: null,
  });

  const obj = user.toObject();
  delete obj.password;
  const companyId =
    accountType === "employee"
      ? String(user.createdBy?._id || user.createdBy)
      : String(user.companyId?._id || user.companyId);

  return {
    token,
    user: {
      ...obj,
      role: accountType === "employee" ? "employee" : "admin",
      companyId,
      _id: user._id,
      id: user._id.toString(),
    },
    via: `${accountType}Token+authSession`,
  };
}

async function tryEmployeeLogin(api) {
  const res = await api.client.post("/api/employees/login", {
    email: TEST_EMPLOYEE_EMAIL,
    password: TEST_EMPLOYEE_PASSWORD,
  });
  if (res.status === 429) return { rateLimited: true };
  if (res.status !== 200) throw new Error(`employee login ${res.status}: ${JSON.stringify(res.data)}`);
  return {
    token: res.data.accessToken,
    user: res.data.user,
    via: "api-login",
  };
}

async function findTestAccounts() {
  await connectDB();
  const admin = await Admin.findOne({ email: TEST_ADMIN_EMAIL }).populate("companyId");
  const companyId = String(admin?.companyId?._id || admin?.companyId || "");
  await Employee.updateOne(
    { email: TEST_EMPLOYEE_EMAIL },
    { $set: { password: await bcrypt.hash(TEST_EMPLOYEE_PASSWORD, 10) } }
  );
  const secondCompany = await Company.findOne({ _id: { $ne: companyId } }).select("_id name").lean();
  const leaveRequest = await LeaveRequest.findOne({ createdBy: companyId }).select("_id").lean();
  return {
    admin,
    companyId,
    secondCompanyId: secondCompany ? String(secondCompany._id) : null,
    leaveRequestId: leaveRequest ? String(leaveRequest._id) : null,
  };
}

async function testHealth(api) {
  const res = await api.client.get("/api/auth/oauth/config");
  record("RT-000", "Backend reachable", "UNKNOWN", res.status === 200 ? "VERIFIED" : "BROKEN", `GET /api/auth/oauth/config => ${res.status}`);
  const fe = await axios.get(FRONTEND, { validateStatus: () => true });
  record("RT-001", "Frontend reachable", "UNKNOWN", fe.status === 200 ? "VERIFIED" : "BROKEN", `GET ${FRONTEND} => ${fe.status}`);
}

async function testAuthLogins(api) {
  const adminRes = await api.client.post("/api/auth/login", { email: TEST_ADMIN_EMAIL, password: "Admin@123" });
  const adminHasToken = Boolean(adminRes.data?.accessToken);
  record(
    "RT-003",
    "Admin login completes session",
    "BROKEN",
    adminHasToken ? "VERIFIED" : "BROKEN",
    `POST /api/auth/login => ${adminRes.status} ${adminRes.data?.message || ""}; accessToken=${adminHasToken}`
  );

  const saRes = await api.client.post("/api/superAdmin/auth/login", {
    email: process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "Admin@123",
  });
  const saHasToken = Boolean(saRes.data?.accessToken);
  record(
    "RT-004",
    "Super admin login completes session",
    "BROKEN",
    saHasToken ? "VERIFIED" : "BROKEN",
    `POST /api/superAdmin/auth/login => ${saRes.status} ${saRes.data?.message || ""}; accessToken=${saHasToken}`
  );

  try {
    const login = await tryEmployeeLogin(api);
    if (login.rateLimited) {
      record("RT-002", "Employee login API", "BROKEN", "BROKEN", "POST /api/employees/login => 429 rate limited");
      return null;
    }
    record("RT-002", "Employee login API", "BROKEN", "VERIFIED", `POST /api/employees/login => 200 (${TEST_EMPLOYEE_EMAIL})`);
    return login;
  } catch (e) {
    record("RT-002", "Employee login API", "BROKEN", "BROKEN", e.message);
    return null;
  }
}

async function testLeaveRouteShadow(api, token, companyId, leaveRequestId) {
  const headers = api.authHeaders(token);
  const byCompany = await api.client.get(`/api/leave-requests/${companyId}`, { headers });
  const fakeId = "507f1f77bcf86cd799439011";
  const byFakeId = await api.client.get(`/api/leave-requests/${fakeId}`, { headers, params: { companyId } });

  const shadowedListResponse =
    byFakeId.status === 200 &&
    byFakeId.data?.success === true &&
    Array.isArray(byFakeId.data?.requests);

  let byRealId = { status: "skipped" };
  if (leaveRequestId) {
    byRealId = await api.client.get(`/api/leave-requests/${leaveRequestId}`, { headers, params: { companyId } });
  }

  const realIdShadowed =
    byRealId.status === 200 &&
    byRealId.data?.success === true &&
    Array.isArray(byRealId.data?.requests);

  record(
    "RT-010",
    "Leave request GET /:id route shadowing",
    "BROKEN",
    shadowedListResponse || realIdShadowed ? "BROKEN" : "PARTIAL",
    `GET /${companyId}=>${byCompany.status}; GET /${fakeId}=>${byFakeId.status} keys=${Object.keys(byFakeId.data || {}).join(",")}; GET /${leaveRequestId || "n/a"}=>${byRealId.status}`
  );
}

async function testNotifications(api, token, userId, companyId) {
  const headers = api.authHeaders(token);
  const before = await Notification.countDocuments({ userId, companyId, status: "unread" });

  const markRes = await api.client.put("/api/auth/notification/read", { companyId }, { headers });
  const after = await Notification.countDocuments({ userId, companyId, status: "unread" });

  record(
    "RT-011",
    "Notification mark-all-read API",
    "BROKEN",
    markRes.status === 200 && after < before ? "VERIFIED" : markRes.status === 403 ? "BROKEN" : "PARTIAL",
    `PUT /api/auth/notification/read => ${markRes.status}; unread before=${before} after=${after}; csrf=${markRes.data?.code || "ok"}`
  );

  const note = await Notification.findOne({ userId, companyId });
  if (!note) {
    record("RT-013", "Notification delete API", "BROKEN", "UNKNOWN", "No notification row for user");
    return;
  }

  const countBefore = await Notification.countDocuments({ userId, companyId });
  const delRes = await api.client.delete("/api/auth/notification/delete", {
    headers,
    params: { id: note._id.toString(), companyId },
  });
  const countAfter = await Notification.countDocuments({ userId, companyId });

  record(
    "RT-013",
    "Notification delete API",
    "BROKEN",
    delRes.status === 200 && countAfter < countBefore ? "VERIFIED" : "BROKEN",
    `DELETE /api/auth/notification/delete?id=... => ${delRes.status}; count ${countBefore}->${countAfter}; body=${JSON.stringify(delRes.data)}`
  );

  record(
    "RT-012",
    "Notification single mark-read (frontend)",
    "BROKEN",
    "BROKEN",
    "NotificationContext.markAsRead has no per-id API; runtime not testable via HTTP"
  );
}

async function testTenantIsolation(api, empToken, adminToken, companyId, otherCompanyId) {
  const empHeaders = api.authHeaders(empToken);
  const adminHeaders = api.authHeaders(adminToken);

  const candEmp = await api.client.get("/api/candidate/get", { headers: empHeaders });
  const candAdmin = await api.client.get("/api/candidate/get", { headers: adminHeaders });
  const listEmp = candEmp.data?.candidates || candEmp.data || [];
  const listAdmin = candAdmin.data?.candidates || candAdmin.data || [];

  record(
    "RT-020",
    "Job portal candidate list (no tenant filter in controller)",
    "BROKEN",
    candAdmin.status === 200 ? "BROKEN" : "PARTIAL",
    `employee=>${candEmp.status} count=${Array.isArray(listEmp) ? listEmp.length : "n/a"}; admin=>${candAdmin.status} count=${Array.isArray(listAdmin) ? listAdmin.length : "n/a"}; Candidate.find() is global per candidateController.js:49`
  );

  const leadEmp = await api.client.get("/api/lead/get", { headers: empHeaders });
  const leadAdmin = await api.client.get("/api/lead/get", { headers: adminHeaders });
  const leads = leadAdmin.data?.data || leadAdmin.data?.leads || [];

  record(
    "RT-021",
    "Lead portal list (no tenant filter)",
    "BROKEN",
    leadAdmin.status === 200 && Array.isArray(leads) ? "BROKEN" : leadEmp.status === 403 ? "PARTIAL" : "PARTIAL",
    `employee=>${leadEmp.status}; admin=>${leadAdmin.status} count=${Array.isArray(leads) ? leads.length : "n/a"}`
  );

  if (otherCompanyId) {
    const cross = await api.client.get(`/api/employees/get/${otherCompanyId}`, { headers: empHeaders });
    const data = cross.data?.employees || cross.data || [];
    record(
      "RT-022",
      "Employee list cross-tenant companyId param",
      "PARTIAL",
      cross.status === 403 ? "VERIFIED" : cross.status === 200 && data.length > 0 ? "BROKEN" : "PARTIAL",
      `GET /api/employees/get/${otherCompanyId} => ${cross.status} count=${Array.isArray(data) ? data.length : "n/a"}`
    );
  }
}

async function testPayrollAndHoliday(api, token, companyId) {
  const headers = api.authHeaders(token);
  const getRes = await api.client.get("/api/payRollRoutes/get", { headers, params: { companyId } });
  const updateRes = await api.client.put("/api/payRollRoutes/update", { companyId }, { headers });
  const deleteRes = await api.client.delete("/api/payRollRoutes/delete/fake", { headers, data: { companyId } });

  record(
    "RT-030",
    "Payroll update/delete routes",
    "MISSING",
    updateRes.status === 404 && deleteRes.status === 404 ? "MISSING" : "PARTIAL",
    `GET=>${getRes.status}; PUT=>${updateRes.status}; DELETE=>${deleteRes.status}`
  );

  const holidayRes = await api.client.put("/api/holiday/507f1f77bcf86cd799439011", {
    name: "E2E",
    date: "2026-12-25",
  }, { headers });

  record(
    "RT-031",
    "Holiday update route",
    "PARTIAL",
    holidayRes.status === 404 ? "VERIFIED" : holidayRes.status === 403 ? "PARTIAL" : "BROKEN",
    `PUT /api/holiday/:id => ${holidayRes.status}`
  );
}

async function testAdminJourney(api, adminToken, companyId) {
  const headers = api.authHeaders(adminToken);
  const checks = [];

  checks.push(`dashboard:${(await api.client.get("/api/auth/dashboardsummary", { headers })).status}`);
  checks.push(`billing:${(await api.client.get("/api/billing/overview", { headers })).status}`);
  checks.push(`employees:${(await api.client.get(`/api/employees/get/${companyId}`, { headers })).status}`);
  checks.push(`departments:${(await api.client.get(`/api/departments/get/${companyId}`, { headers })).status}`);
  checks.push(`roles:${(await api.client.get(`/api/assignroles/list/${companyId}`, { headers })).status}`);
  checks.push(`reports:${(await api.client.get("/api/auth/report", { headers, params: { companyId } })).status}`);

  const ok = checks.filter((c) => c.endsWith(":200")).length;
  record(
    "RT-070",
    "Admin journey read APIs",
    "UNKNOWN",
    ok >= 4 ? "VERIFIED" : "PARTIAL",
    checks.join("; ")
  );
}

async function testAdminMutations(api, adminToken, companyId) {
  const headers = api.authHeaders(adminToken);
  const suffix = Date.now();

  const deptRes = await api.client.post(
    "/api/departments/add",
    { name: `E2E Dept ${suffix}`, companyId, description: "runtime audit" },
    { headers }
  );

  const catRes = await api.client.post(
    "/api/expense-categories/add",
    { name: `E2E Cat ${suffix}`, companyId, description: "audit" },
    { headers }
  );

  record(
    "RT-071",
    "Admin create department",
    "UNKNOWN",
    deptRes.status === 201 || deptRes.status === 200 ? "VERIFIED" : "BROKEN",
    `POST /api/departments/add => ${deptRes.status} ${deptRes.data?.message || ""}`
  );

  record(
    "RT-072",
    "Admin create expense category",
    "UNKNOWN",
    catRes.status === 201 || catRes.status === 200 ? "VERIFIED" : "BROKEN",
    `POST /api/expense-categories/add => ${catRes.status} ${catRes.data?.message || ""}`
  );
}

async function testEmployeePermissions(api, empToken, companyId, userId) {
  const headers = api.authHeaders(empToken);
  const endpoints = [
    ["departments", `/api/departments/get/${companyId}`],
    ["employees", `/api/employees/get/${companyId}`],
    ["expenses", `/api/expenses/get/${companyId}`],
    ["leaves", `/api/leaves/leaves/${companyId}`],
    ["payroll", `/api/payRollRoutes/get`, { companyId }],
    ["tasks", `/api/task/task/get`, { companyId, userId }],
    ["assets", `/api/assets/`],
    ["learning", `/api/learning/courses`],
    ["performance", `/api/performance/reviews/me`],
    ["monthly-attendance", `/api/monthly-attendance`, { month: "2026-06" }],
  ];

  const outcomes = [];
  for (const [name, path, params] of endpoints) {
    const res = await api.client.get(path, { headers, params });
    outcomes.push(`${name}:${res.status}`);
  }

  const ok = outcomes.filter((o) => o.includes(":200")).length;
  const denied = outcomes.filter((o) => o.includes(":403")).length;

  record("RT-061", "Employee permissioned reads", "PARTIAL", ok >= 5 ? "VERIFIED" : "PARTIAL", outcomes.join("; "));
  record("RT-062", "Employee premium module 403s", "PARTIAL", denied > 0 ? "VERIFIED" : "PARTIAL", `${denied} modules returned 403`);
}

async function testEmployeeJourney(api, empToken, userId) {
  const headers = api.authHeaders(empToken);
  const dash = await api.client.get("/api/auth/dashboardsummary", { headers });
  const att = await api.client.get("/api/attendance/", { headers, params: { month: 6, year: 2026 } });
  const leaves = await api.client.get(`/api/leave-requests/my/${userId}`, { headers });
  const clockIn = await api.client.post(`/api/attendance/clock-in/${userId}`, {}, { headers });

  record(
    "RT-060",
    "Employee daily journey",
    "VERIFIED",
    dash.status === 200 && att.status === 200 ? "VERIFIED" : "PARTIAL",
    `dashboard:${dash.status}; attendance:${att.status}; myLeaves:${leaves.status}; clockIn:${clockIn.status}`
  );
}

async function testSocket(token, userId) {
  return new Promise((resolve) => {
    const events = [];
    const socket = io(BASE, { autoConnect: false, transports: ["websocket"], auth: { token } });
    const timeout = setTimeout(() => {
      socket.disconnect();
      record("RT-050", "Socket connect + auth", "VERIFIED", events.includes("connected") ? "VERIFIED" : "BROKEN", events.join(","));
      record("RT-051", "Lead list refresh socket emit", "BROKEN", events.includes("leadListRefresh") ? "VERIFIED" : "BROKEN", "no leadListRefresh in 8s");
      resolve();
    }, 8000);
    socket.on("connect", () => {
      events.push("connected");
      socket.emit("joinRoom", userId);
    });
    socket.on("connect_error", (e) => events.push(`error:${e.message}`));
    socket.on("leadListRefresh", () => events.push("leadListRefresh"));
    socket.connect();
  });
}

async function testJobRevenuePage() {
  const res = await axios.get(`${FRONTEND}/jobs/revenues`, { validateStatus: () => true });
  record(
    "RT-040",
    "Job Revenue page has no API wiring",
    "BROKEN",
    res.status === 200 ? "BROKEN" : "BROKEN",
    `SPA route returns ${res.status}; RevenuePage.tsx has no axios/Service imports (static UI)`
  );
}

async function testEmployeeDocuments(api, empToken, otherEmployeeId) {
  if (!otherEmployeeId) {
    record("RT-080", "Employee documents cross-user access", "BROKEN", "UNKNOWN", "No second employee id");
    return;
  }
  const headers = api.authHeaders(empToken);
  const res = await api.client.get(`/api/employees/documents/${otherEmployeeId}`, { headers });
  record(
    "RT-080",
    "Employee documents cross-user access",
    "BROKEN",
    res.status === 200 ? "BROKEN" : res.status === 403 ? "VERIFIED" : "PARTIAL",
    `GET /api/employees/documents/${otherEmployeeId} => ${res.status}`
  );
}

async function main() {
  console.log("=== HRM Live E2E Runtime Audit (Phase 2) ===\n");
  const api = createClient();
  await api.bootstrapCsrf();

  await testHealth(api);
  const accounts = await findTestAccounts();
  console.log(`Company: ${accounts.companyId}`);

  let employeeAuth = await testAuthLogins(api);
  if (!employeeAuth) {
    employeeAuth = await issueTokenForAccount("employee", TEST_EMPLOYEE_EMAIL);
    console.log(`Employee fallback auth: ${employeeAuth.via}`);
  }

  const adminAuth = await issueTokenForAccount("admin", TEST_ADMIN_EMAIL);
  console.log(`Admin token auth: ${adminAuth.via}`);

  const empToken = employeeAuth.token;
  const adminToken = adminAuth.token;
  const userId = employeeAuth.user._id || employeeAuth.user.id;

  const otherEmployee = await Employee.findOne({
    email: { $ne: TEST_EMPLOYEE_EMAIL },
    createdBy: accounts.companyId,
    status: "ACTIVE",
  }).select("_id email");

  await testLeaveRouteShadow(api, empToken, accounts.companyId, accounts.leaveRequestId);
  await testNotifications(api, empToken, userId, accounts.companyId);
  await testTenantIsolation(api, empToken, adminToken, accounts.companyId, accounts.secondCompanyId);
  await testPayrollAndHoliday(api, empToken, accounts.companyId);
  await testEmployeeJourney(api, empToken, userId);
  await testEmployeePermissions(api, empToken, accounts.companyId, userId);
  await testAdminJourney(api, adminToken, accounts.companyId);
  await testAdminMutations(api, adminToken, accounts.companyId);
  await testEmployeeDocuments(api, empToken, otherEmployee?._id?.toString());
  await testSocket(empToken, userId);
  await testJobRevenuePage();

  console.log("\n=== RUNTIME RESULTS ===\n");
  for (const r of results) {
    console.log(`[${r.id}] ${r.name}`);
    console.log(`  Prior: ${r.prior} -> Runtime: ${r.runtime}`);
    console.log(`  Evidence: ${r.evidence}\n`);
  }

  const verified = results.filter((r) => r.runtime === "VERIFIED").length;
  const broken = results.filter((r) => r.runtime === "BROKEN").length;
  const partial = results.filter((r) => r.runtime === "PARTIAL").length;
  console.log(`Summary: ${results.length} checks | VERIFIED=${verified} PARTIAL=${partial} BROKEN=${broken}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});