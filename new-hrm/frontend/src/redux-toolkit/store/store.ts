import { configureStore } from "@reduxjs/toolkit";
import companyReducer from "../slice/allPage/companySlice";
import userReducer from "../slice/allPage/userSlice";
import settingReducer from "../slice/allPage/settingSlice";
import attendanceReducer from "../slice/allPage/attendanceSlice";
import leaveReducer from "../slice/allPage/leaveSlice";
import payrollReducer from "../slice/allPage/payrollSlice";
import departmentReducer from "../slice/allPage/departmentSlice";
import expenseReducer from "../slice/allPage/expenseSlice";
import reportReducer from "../slice/allPage/reportSlice";
import dashboardReducer from "../slice/allPage/dashboardSlice";
import loginUserReducer from "../slice/allPage/loginUserSlice";


// Only Task Reducers 
import projectReducer from "../slice/task/projectSlice";
import managerReducer from "../slice/task/taskManagerSlice";
import overdueTaskReducer from "../slice/task/overdueTaskSlice";
import taskReducer from "../slice/task/taskSlice";
import subTaskReducer from "../slice/task/subTaskSlice";
import taskDashboardReducer from "../slice/task/dashboardSlice";

// job-portal k liye
import roleReducer from "../slice/job-portal/roleSlice";
import candidateReducer from "../slice/job-portal/candidateSlice";
import companyJobReducer from "../slice/job-portal/companyJobSlice";
import jobReducer from "../slice/job-portal/jobSlice";
import applicationReducer from "../slice/job-portal/applicationSlice";
import dashboardJobReducer from "../slice/job-portal/dashboardSlice";
// lead-portal k liye
import leadReducer from "../slice/lead-portal/leadSlice";
import productReducer from "../slice/lead-portal/productSlice";

export const store = configureStore({
    reducer: {
        company: companyReducer,
        user: userReducer,
        setting: settingReducer,
        attendance: attendanceReducer,
        leave: leaveReducer,
        payroll: payrollReducer,
        department: departmentReducer,
        expense: expenseReducer,
        report: reportReducer,
        dashboard: dashboardReducer,
        loginUser:loginUserReducer,
        // Task Reducers
        project: projectReducer,
        manager: managerReducer,
        overdueTask: overdueTaskReducer,
        task: taskReducer,
        subTask: subTaskReducer,
        taskDashboard: taskDashboardReducer,

        // job-portal k liye
        role: roleReducer,
        candidate: candidateReducer,
        companyJob: companyJobReducer,
        job: jobReducer, 
        application: applicationReducer, 
        dashboardJob: dashboardJobReducer,

        // lead-portal k liye
        lead: leadReducer, 
        product: productReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;