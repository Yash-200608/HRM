// ===============================
// 🔥 GLOBAL AXIOS FIX (FINAL)
// ===============================

import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;

// ✅ ALWAYS SET TOKEN BEFORE ANY REQUEST
const setAuthToken = () => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

// 🔥 CALL IMMEDIATELY
setAuthToken();

// 🔥 ALSO UPDATE ON EVERY REQUEST (double safety)
if (!(window as any).__axiosInterceptorAdded) {
  axios.interceptors.request.use(
    (config) => {
      const token =
        localStorage.getItem("accessToken") || localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        console.log("Unauthorized request ❌");
      }
      return Promise.reject(error);
    },
  );

  (window as any).__axiosInterceptorAdded = true;
}

const token = localStorage.getItem("accessToken");

export const generatePDF = (expenses) => {
  const doc = new jsPDF();

  doc.text("Expense Report", 14, 20);

  const tableColumn = ["Date", "Category", "Amount", "Paid By", "Notes"];
  const tableRows = [];

  expenses.forEach((exp) => {
    const expData = [
      new Date(exp.date).toLocaleDateString(),
      exp.category,
      exp.amount,
      exp.paidBy || "-",
      exp.notes || "-",
    ];
    tableRows.push(expData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 30,
  });

  doc.save(`expense_report_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const getNotificationData = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/auth/notification`,
    { params: { userId: id, companyId: companyId } },
  );

  return res;
};

export const markAsReadNotifications = async (userId, companyId) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/auth/notification/read`,
    { userId, companyId },
  );

  return res;
};

export const deleteNotifications = async (id, userId, companyId) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/auth/notification/delete`,
    { params: { id: id, userId: userId, companyId: companyId } },
  );

  return res;
};

export const deleteAllNotifications = async (userId, companyId) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/auth/notification/alldelete`,
    { params: { userId: userId, companyId: companyId } },
  );

  return res;
};

export const getAttendanceData = async (month, year, companyId) => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/attendance`,
    {
      params: { month, year, companyId },
      headers: {
        Authorization: `Bearer ${token}`, // 🔥 FORCE ADD
      },
    },
  );

  return res;
};

export const getAttendanceById = async (userId, month, year, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/attendance/attendancebyid`,
    { params: { userId, month, year, companyId: companyId } },
  );

  return res;
};

export const getAttendancebyday = async (obj) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/attendance/attendancebyid`,
    { params: obj },
  );

  return res;
};

export const updateAttendancebyday = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/attendance/update/attendance`,
    obj,
  );

  return res;
};

export const AbsentAddAttendancebyday = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/attendance/absent/attendance`,
    obj,
  );

  return res;
};

export const submitClockIn = (
  userId
) => {

  return axios.post(
    `/api/attendance/clock-in/${userId}`
  );
};

export const submitClockOut = (
  userId
) => {

  return axios.post(
    `/api/attendance/clock-out/${userId}`
  );
};

export const loginSuperAdmin = async (email, password) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/superAdmin/auth/login`,
    { email: email, password: password },
  );

  return res;
};

export const registerAdmin = async (obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/auth/register`,
    obj,
  );

  return res;
};

export const loginAdmin = async (email, password) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/auth/login`,
    { email: email, password: password },
  );

  return res;
};

export const logoutSession = async () => {
  const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`);

  return res;
};

export const updateAdmin = async (id, obj) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/auth/update/${id}`,
    obj,
  );

  return res;
};

export const updateAdminStatus = async (adminId, userId, status) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/auth/admin/status`,
    { adminId: adminId, superAdminId: userId, status: status },
  );

  return res;
};

export const deleteAdmin = async (id, userId) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/auth/delete`,
    { params: { id: id, userId: userId } },
  );

  return res;
};

export const getSingleUser = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/auth/getbyid`,
    { params: { userId: id, companyId: companyId } },
  );

  return res;
};

export const getDashboardPage = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/auth/dashboardsummary`,
    { params: { userId: id, companyId: companyId } },
  );

  return res;
};

export const getAnalyticsReportPage = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/auth/report`,
    { params: { userId: id, companyId: companyId } },
  );

  return res;
};

export const getAttendanceReportPage = async (id, companyId, week) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/auth/weekly-attendance-report`,
    { params: { userId: id, companyId: companyId, week: week } },
  );

  return res;
};

export const addTaskManager = async (id, companyId, obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/task/manager/add`,
    { userId: id, companyId: companyId, obj: obj },
  );

  return res;
};

export const getTaskManager = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/manager/get`,
    { params: { userId: id, companyId: companyId } },
  );

  return res;
};

export const updateTaskManager = async (id, companyId, obj) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/task/manager/update`,
    { userId: id, companyId: companyId, obj: obj },
  );

  return res;
};

export const deleteTaskManager = async (
  id,
  companyId,
  employeeId,
  departmentId,
) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/task/manager/delete`,
    {
      params: {
        userId: id,
        companyId: companyId,
        employeeId: employeeId,
        departmentId,
      },
    },
  );

  return res;
};

export const projectStatusChange = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/task/project/status`,
    obj,
  );

  return res;
};

export const addProject = async (id, companyId, obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/task/project/add`,
    { adminId: id, companyId: companyId, obj: obj },
  );

  return res;
};

export const getProject = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/project/get`,
    { params: { adminId: id, companyId: companyId } },
  );

  return res;
};

export const uploadLetter = async (formData: FormData) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/letter/upload`,
    formData,
  );

  return res;
};

export const getEmployeeLetters = async (employeeId: string) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/letter/employee`,
    {
      params: {
        employeeId,
      },
    },
  );

  return res;
};

export const getEmployeeLetter = async (employeeId: string) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/pdfGenerater/employee`,
    {
      params: { employeeId },
    },
  );

  return res.data;
};

export const getDashboardData = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/project/dashboardsummary`,
    { params: { userId: id, companyId: companyId } },
  );

  return res;
};

export const getProjectById = async (projectId, companyId, adminId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/project/getbyid`,
    { params: { projectId, companyId, adminId } },
  );

  return res;
};

export const updateProject = async (id, companyId, obj) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/task/project/update`,
    { adminId: id, companyId: companyId, obj: obj },
  );

  return res;
};

export const deleteProject = async (obj) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/task/project/delete`,
    {
      params: {
        projectId: obj?.projectId,
        companyId: obj?.companyId,
        adminId: obj?.adminId,
      },
    },
  );

  return res;
};

export const addTask = async (obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/task/task/add`,
    obj,
  );

  return res;
};

export const getTask = async (obj) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/task/get`,
    { params: { companyId: obj?.companyId, userId: obj?.adminId } },
  );

  return res;
};

export const getTaskById = async (taskId, companyId, adminId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/task/getbyid`,
    { params: { taskId, companyId, adminId } },
  );

  return res;
};

export const getOverdueTask = async (userId: string, companyId: string) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/task/overdue`,
    { params: { userId, companyId } },
  );

  return res;
};

export const updateTask = async (obj) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/task/task/update`,
    obj,
  );

  return res;
};

export const taskStatusChange = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/task/task/status`,
    obj,
  );

  return res;
};

export const reassignTask = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/task/task/reassign`,
    obj,
  );

  return res;
};

export const deleteTask = async (obj) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/task/task/delete`,
    {
      params: {
        taskId: obj?.taskId,
        companyId: obj?.companyId,
        adminId: obj?.adminId,
      },
    },
  );

  return res;
};

// Sub Task k form k liye
export const getEmployeebyDepartment = async (obj) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/employee`,
    {
      params: {
        taskId: obj?.taskId,
        department: obj.department,
        companyId: obj.companyId,
        adminId: obj.adminId,
      },
    },
  );

  return res;
};

export const addSubTask = async (obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/add`,
    obj,
  );

  return res;
};

export const getSubTask = async (obj) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/get`,
    { params: obj },
  );

  return res;
};

export const getSubTaskById = async (subTaskId, companyId, userId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/getbyid`,
    { params: { subTaskId, companyId, userId } },
  );

  return res;
};

export const updateSubTask = async (obj) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/update`,
    obj,
  );

  return res;
};

export const statusChangeSubTask = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/status`,
    obj,
  );

  return res;
};

export const reassignSubTask = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/reassign`,
    obj,
  );

  return res;
};

export const deleteSubTask = async (obj) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/task/subtask/delete`,
    {
      params: {
        subtaskId: obj?.subtaskId,
        companyId: obj?.companyId,
        adminId: obj?.adminId,
      },
    },
  );

  return res;
};

export const updatePassword = async (userId, email, newPassword, companyId) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/auth/updatepassword`,
    {
      userId: userId,
      email: email,
      newPassword: newPassword,
      companyId: companyId,
    },
  );

  return res;
};

export const updateUser = async (userId, companyId, data) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/auth/updateuser`,
    { userId, companyId, data },
  );

  return res;
};

export const getleaveTypes = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/leaves/leaves/${id}`,
  );

  return res;
};

export const getCompanys = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/company/${id}`,
  );

  return res;
};

export const getCompanysByDashboard = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/company/company/dashboard/${id}`,
  );

  return res;
};

export const getCompanysById = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/company/detail/company`,
    { params: { companyId: id } },
  );

  return res;
};

export const getAdmins = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/auth/get/${id}`,
  );

  return res;
};

export const UpdateLeave = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/company/update/Leave`,
    obj,
  );

  return res;
};

export const getleaveRequests = async (companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/leave-requests/${companyId}`,
  );

  return res;
};

export const getleaveDashboard = async (obj) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/leave-requests/leave/dashboard`,
    { params: obj },
  );

  return res;
};

export const getSingleleaveRequests = async (userId, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/leave-requests/my/${userId}`,
    { params: { companyId } },
  );

  return res;
};

export const getSingleleaveRequestsByDate = async (
  userId,
  companyId,
  month,
  year,
) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/leave-requests/my/${userId}/date`,
    { params: { companyId, month, year } },
  );

  return res;
};

export const leaveStatusChange = async (
  newStatus,
  request,
  companyId,
  userId,
) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/leave-requests/status`,
    { status: newStatus, requestId: request._id, companyId, userId: userId },
  );

  return res;
};

export const leaveDelete = async (selectedLeaveTypeId, companyId) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/leaves/${selectedLeaveTypeId}`,
    { data: { companyId } },
  );

  return res;
};

export const addPayRoll = async (obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/payRollRoutes/add`,
    obj,
  );

  return res;
};

export const getAllPayRolls = async (companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/payRollRoutes/get`,
    { params: { companyId } },
  );

  return res.data;
};

export const getSinglePayRoll = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/payRollRoutes/getbyid/${id}`,
    { params: { companyId } },
  );

  return res.data;
};

export const addDepartment = async (obj) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/departments/add`,
    obj,
  );

  return res;
};

export const getDepartments = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/departments/get/${id}`,
  );

  return res.data;
};

export const updateDepartment = async (id, obj) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/departments/updateDepartment/${id}`,
    obj,
  );

  return res;
};

export const updateEmployeeByDepartment = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/departments/update/employee`,
    obj,
  );

  return res.data;
};

export const addEmployees = async (formData) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/employees/add`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};

export const getEmployees = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/employees/get/${id}`,
  );

  return res.data;
};

export const loginEmployee = async (email, password) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/employees/login`,
    { email: email, password: password },
  );

  return res;
};

export const updateEmployees = async (id, formData) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/employees/updateEmployee/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};

export const updateEmployeeStatus = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/employees/updateEmployee/status`,
    obj,
  );

  return res;
};

export const getEmployeebyId = async (id, companyId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/employees/getbyid/${id}`,
    {
      params: {
        companyId: companyId, // ye tumhari variable hai jisme companyId stored hai
      },
    },
  );

  return res.data;
};

export const getExpenseCategories = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/expense-categories/get/${id}`,
  );

  return res.data;
};

export const getExpenses = async (id) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/expenses/get/${id}`,
  );

  return res.data;
};

export const handleGetPdfLetter = async (employeeId: string) => {
  try {
    // 1️⃣ Token check
    // if (!token) {
    //   toast({
    //     title: 'Error',
    //     description: 'No token found. Please login again.',
    //   });
    //   return [];
    // }

    // 2️⃣ EmployeeId check
    if (!employeeId) {
      // toast({
      //   title: 'Error',
      //   description: 'No Employee Id found.',
      // });
      return [];
    }

    // 3️⃣ API call
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/pdfGenerater/allLetter/${employeeId}`,
      {
        // headers: {
        //   Authorization: `Bearer ${token}`,
        //   "Content-Type": "application/json",
        // },
      },
    );
    if (response.status === 200) {
      const data = response.data;
      return Array.isArray(data) ? data : [data];
    }

    return [];
  } catch (err: any) {
    console.error("Error fetching PDF letters:", err);
    // toast({
    //   title: 'Error',
    //   description: `Something went wrong: ${err.response?.data?.message || err.message}`,
    // });
    return [];
  }
};

export const handleAddPdfLetter = async (
  obj: any,
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    // 1️⃣ Token (optional)
    // const token = localStorage.getItem("token");
    // if (!token) return { success: false, error: "No token found" };

    // 2️⃣ API call
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/pdfGenerater/offer`,
      obj,
      // {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //     "Content-Type": "application/json"
      //   }
      // }
    );

    if (response.status === 200) {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: response.data };
    }
  } catch (err: any) {
    console.error("Error adding PDF letter:", err);
    // toast({
    //   title: "Error",
    //   description: `Something went wrong: ${err.response?.data?.message || err.message}`,
    //   status: "error",
    // });
    return { success: false, error: err };
  }
};

// job-portal k liye

export const addRole = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/role/add`,
    obj,
  );

  return res;
};

export const getAllRole = async () => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/role/get`);

  return res;
};

export const getActiveRole = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/role/get-active`,
    obj,
  );

  return res;
};

export const updateRole = async (id: string, obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/role/update/${id}`,
    obj,
  );

  return res;
};

export const roleStatusChange = async (obj: any) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/role/toggle/status`,
    obj,
  );

  return res;
};

export const addCandidate = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/candidate/add`,
    obj,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res;
};

export const getAllCandidates = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/candidate/get`,
  );

  return res;
};

export const getSingleCandidate = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/candidate/getbyid`,
    obj,
  );

  return res;
};

export const updateCandidate = async (obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/candidate/update`,
    obj,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res;
};

export const candidateStatusChange = async (obj: any) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/candidate/update/status`,
    obj,
  );

  return res;
};

export const deleteCandidate = async (id: string) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/candidate/delete/${id}`,
  );

  return res;
};

export const addCompanyJob = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/companyJob/add`,
    obj,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res;
};

export const getAllCompanyJob = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/companyJob/get`,
  );

  return res;
};

export const getSingleCompanyJob = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/companyJob/getbyid`,
    obj,
  );

  return res;
};

export const updateCompanyJob = async (id: string, obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/companyJob/update/${id}`,
    obj,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res;
};

export const deleteCompanyJob = async (id: string) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/companyJob/delete/${id}`,
  );

  return res;
};

export const CompanyJobStatusChange = async (obj: any) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/companyJob/update-status`,
    obj,
  );

  return res;
};

export const addJob = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/job/add`,
    obj,
  );

  return res;
};

export const getAllJob = async () => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/job/get`);

  return res;
};

export const getSingleJob = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/job/getbyid`,
    obj,
  );

  return res;
};

export const updateJob = async (obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/job/update`,
    obj,
  );

  return res;
};

export const deleteJob = async (id: string) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/job/delete/${id}`,
  );

  return res;
};

export const JobStatusChange = async (id, status) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/job/status/${id}`,
    { status },
  );

  return res;
};

export const JobPublished = async (id) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/job/publish/${id}`,
  );

  return res;
};

export const addApplication = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/application/add`,
    obj,
  );

  return res;
};

export const getAllApplication = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/application/get`,
  );

  return res;
};

export const getSingleApplication = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/application/getbyid`,
    obj,
  );

  return res;
};

export const updateApplication = async (id, obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/application/update/${id}`,
    obj,
  );

  return res;
};

export const deleteApplication = async (id: string) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/application/delete/${id}`,
  );

  return res;
};

export const applicationStatusChange = async (obj) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/application/status/update`,
    obj,
  );

  return res;
};

export const getDashboardSummary = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/dashboard/dashboard/summary`,
  );

  return res;
};

export const getDashboardList = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/dashboard/dashboard/list`,
  );

  return res;
};

export const getDashboardOverview = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/dashboard/dashboard/overview`,
  );

  return res;
};

// lead-portal k liye

export const addProduct = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/product/add`,
    obj,
  );

  return res;
};

export const getAllProduct = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/product/get`,
  );

  return res;
};

export const getSingleProduct = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/product/getbyid`,
    obj,
  );

  return res;
};

export const updateProduct = async (id: string, obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/product/update/${id}`,
    obj,
  );

  return res;
};

export const deleteProduct = async (id: string) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/product/delete/${id}`,
  );

  return res;
};

export const addLead = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/lead/add`,
    obj,
  );

  return res;
};

export const getAllLead = async (currentMonth) => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/lead/get`, {
    params: { currentMonth: currentMonth },
  });

  return res;
};

export const getSingleLead = async (obj: any) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/lead/getbyid`,
    obj,
  );

  return res;
};

export const updateLead = async (id: string, obj: any) => {
  const res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/lead/update/${id}`,
    obj,
  );

  return res;
};

export const updateLeadStatus = async (obj: any) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/lead/status`,
    obj,
  );
  return res;
};

export const deleteLead = async (id: string) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_API_URL}/api/lead/delete/${id}`,
  );

  return res;
};

export const updateLeadPayment = async (obj: any) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/lead/payment`,
    obj,
  );

  return res;
};

export const updateLeadPaymentStatus = async (obj: any) => {
  const res = await axios.patch(
    `${import.meta.env.VITE_API_URL}/api/lead/payment/status`,
    obj,
  );

  return res;
};

export const addMessage = async (obj: any) => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/message/add`,
    obj,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res;
};

export const getMessage = async (leadId: string) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/api/message/get`,
    { params: { leadId: leadId } },
  );

  return res;
};

export const getBillingOverview = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/billing/overview`);
};

export const upgradeBillingPlan = async (planCode: string) => {
  return axios.patch(
    `${import.meta.env.VITE_API_URL}/api/billing/upgrade`,
    { planCode },
    {
      headers: {
        "Idempotency-Key": `billing-upgrade:${planCode}:${Date.now()}`,
      },
    },
  );
};

export const getBillingPaymentConfig = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/billing/payment-config`);
};

export const createInvoiceRazorpayOrder = async (invoiceId: string) => {
  return axios.post(
    `${import.meta.env.VITE_API_URL}/api/billing/invoices/razorpay-order`,
    { invoiceId },
    {
      headers: {
        "Idempotency-Key": `billing-rzp-order:${invoiceId}:${Date.now()}`,
      },
    },
  );
};

export const captureBillingPayment = async (payload: {
  paymentId: string;
  amountInPaise: number;
  currency?: string;
  invoiceId?: string;
}) => {
  return axios.post(
    `${import.meta.env.VITE_API_URL}/api/billing/payments/capture`,
    payload,
    {
      headers: {
        "Idempotency-Key": `billing-capture:${payload.paymentId}:${Date.now()}`,
      },
    },
  );
};

export const getPlatformMetrics = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/platform/metrics`);
};

export const getPlatformSlaDashboard = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/platform/sla/dashboard`);
};

export const getIncidentRunbooks = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/platform/incidents/runbooks`);
};

export const getIncidentRunbook = async (id: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/platform/incidents/runbooks/${id}`);
};

export const requestPasswordReset = async (email: string, accountType: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/password-reset/request`, {
    email,
    accountType,
  });
};

export const confirmPasswordReset = async (token: string, newPassword: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/password-reset/confirm`, {
    token,
    newPassword,
  });
};

export const verifyMfaLogin = async (mfaChallengeToken: string, code: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/mfa/verify-login`, {
    mfaChallengeToken,
    code,
  });
};

export const setupMfa = async () => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/mfa/setup`);
};

export const enableMfa = async (code: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/mfa/enable`, { code });
};

export const disableMfa = async (code: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/mfa/disable`, { code });
};

export const regenerateMfaRecoveryCodes = async (code: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/mfa/recovery-codes/regenerate`, { code });
};

export const getScimConfig = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/scim/config`);
};

export const rotateScimToken = async () => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/scim/token/rotate`);
};

export const getOAuthIdentities = async (params?: Record<string, string | number>) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/auth/oauth/identities`, { params });
};

export const getOAuthIdentityAudit = async (identityId: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/auth/oauth/identities/${identityId}/audit`);
};

export const revokeOAuthIdentity = async (identityId: string) => {
  return axios.patch(`${import.meta.env.VITE_API_URL}/api/auth/oauth/identities/${identityId}/revoke`);
};

export const disableOAuthIdentity = async (identityId: string) => {
  return axios.patch(`${import.meta.env.VITE_API_URL}/api/auth/oauth/identities/${identityId}/disable`);
};

export const getOAuthSecurityEvents = async (params?: Record<string, string | number>) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/auth/oauth/security-events`, { params });
};

export const forceOAuthLogoutAll = async () => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/oauth/incident/force-logout-all`);
};

export const forceOAuthReauth = async (accountType: string, userId: string) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/auth/oauth/incident/force-reauth`, {
    accountType,
    userId,
  });
};

export const downloadComplianceExport = async (companyId?: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/compliance/export`, {
    params: companyId ? { companyId } : undefined,
    responseType: "blob",
  });
};

export const getPerformanceCycles = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/performance/cycles`);
};

export const createPerformanceCycle = async (payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/performance/cycles`, payload);
};

export const getPerformanceReviews = async (cycleId?: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/performance/reviews`, {
    params: cycleId ? { cycleId } : undefined,
  });
};

export const getMyPerformanceReviews = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/performance/reviews/me`);
};

export const getAssets = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/assets`);
};

export const createAsset = async (payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/assets`, payload);
};

export const checkoutAsset = async (assetId: string, payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/assets/${assetId}/checkout`, payload);
};

export const returnAsset = async (assetId: string, payload?: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/assets/${assetId}/return`, payload || {});
};

export const getAssetHistory = async (assetId: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/assets/${assetId}/history`);
};

export const getLearningCourses = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/learning/courses`);
};

export const createLearningCourse = async (payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/learning/courses`, payload);
};

export const getLearningEnrollments = async () => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/learning/enrollments`);
};

export const enrollLearningEmployee = async (payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/learning/enrollments`, payload);
};

export const upsertLearningQuiz = async (courseId: string, payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/learning/courses/${courseId}/quiz`, payload);
};

export const getLearningQuiz = async (courseId: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/learning/courses/${courseId}/quiz`);
};

export const submitLearningQuiz = async (enrollmentId: string, answers: number[]) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/learning/enrollments/${enrollmentId}/quiz-submit`, {
    answers,
  });
};

export const getLearningCertificate = async (enrollmentId: string) => {
  return axios.get(`${import.meta.env.VITE_API_URL}/api/learning/enrollments/${enrollmentId}/certificate`);
};

export const bulkAssignPerformanceReviews = async (payload: object) => {
  return axios.post(`${import.meta.env.VITE_API_URL}/api/performance/reviews/bulk-assign`, payload);
};

export const submitPerformanceReview = async (reviewId: string, payload: object) => {
  return axios.patch(`${import.meta.env.VITE_API_URL}/api/performance/reviews/${reviewId}`, payload);
};

export const acknowledgePerformanceReview = async (reviewId: string) => {
  return axios.patch(`${import.meta.env.VITE_API_URL}/api/performance/reviews/${reviewId}/acknowledge`);
};
