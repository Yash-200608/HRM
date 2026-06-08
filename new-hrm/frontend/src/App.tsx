import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useNavigate, BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Companies from "@/pages/Companies";
import Departments from "@/pages/Departments";
import Attendance from "@/pages/Attendance";
import Leave from "@/pages/Leave";
import Expenses from "@/pages/Expenses";
import Payroll from "@/pages/Payroll";
import Notifications from "@/pages/Notifications";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import EmployeeDashboard from "@/components/cards/EmployeeCard";
import TaskLayout from "@/task/TaskLayout";
import TaskDashboard from "./task/Task-Dashboard";
import Task from "./task/Task";
import SubTask from "./task/Sub-Task";
import Project from "./task/Project";
import OverdueTask from "./task/OverDue-Task";
import TaskManager from "./task/TaskManager";
import { NotificationProvider } from "@/contexts/NotificationContext";
import JobDashboard from "./job-portal/Job-Dashboard";
import JobLayout from "./job-portal/JobLayout";
import ApplicationsPage from "@/job-portal/ApplicationsPage";
import CandidatesPage from "./job-portal/CandidatesPage";
import CompaniesPage from "./job-portal/CompaniesPage";
import JobsPage from "./job-portal/JobsPage";
import RevenuePage from "./job-portal/RevenuePage";
import SettingsPage from "./job-portal/SettingsPage";
import RolePage from "./job-portal/RolePage";
import LeadLayout from "@/lead-management/LeadLayout";
import OrderList from "@/lead-management/OrderList";
import LeadList from "@/lead-management/LeadList";
import ProductList from "@/lead-management/ProductList";
import {socket} from "@/socket/socket";
import { useEffect } from "react";
export { };
import Roles from "./pages/Roles";
import PermissionRoute from "./components/PermissionRoute"
import MyAccount from "./pages/MyAccount";
import Resignation from "./pages/Resignation";
import ResignationManagement from "./pages/ResignationManagement";
import Holidays from "@/pages/Holidays";
import HolidayManagement from "@/pages/HolidayManagement";
import MonthlyAttendanceReport from "./pages/MonthlyAttendanceReport";



declare global {
  interface Window {
    reactRouterNavigate?: (path: string) => void;
  }
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,          
      refetchOnWindowFocus: false,    
      retry: 1,
    },
  },
});


const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const {user} = useAuth();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  window.reactRouterNavigate = navigate;

  useEffect(()=>{
     if(user?._id){
      socket.connect();
      socket.emit("joinRoom", user?._id);
     }
  })
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/admin/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AdminLogin />} />
      <Route path="/superAdmin/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SuperAdminLogin />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

     <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

<Route
path="/dashboard"
element={
<PermissionRoute module="dashboard" action="view">
<Dashboard />
</PermissionRoute>
}
/>
<Route
  path="/holidays"
  element={
    <PermissionRoute module="holiday" action="view">
      <Holidays />
    </PermissionRoute>
  }
/>

<Route
  path="/holidays/manage"
  element={
    <PermissionRoute module="holiday" action="create">
      <HolidayManagement />
    </PermissionRoute>
  }
/>
<Route path="/user/:id" element={<EmployeeDashboard />} />
<Route path="resignation/manage" element={<ResignationManagement />} />
<Route
  path="/users"
  element={
    user?.role === "super_admin" ? (
      <Users />
    ) : (
      <PermissionRoute module="employees" action="view">
        <Users />
      </PermissionRoute>
    )
  }
/>

<Route path="/reports-monthly-attendance" element={<MonthlyAttendanceReport />} />

<Route
path="/companies"
element={<Companies />}
/>

<Route
path="/departments"
element={
<PermissionRoute module="departments" action="view">
<Departments />
</PermissionRoute>
}
/>

<Route
path="/attendances"
element={
<PermissionRoute module="attendance" action="view">
<Attendance />
</PermissionRoute>
}
/>

<Route
path="/leaves"
element={
<PermissionRoute module="leave" action="view">
<Leave />
</PermissionRoute>
}
/>

<Route
path="/expenses"
element={
<PermissionRoute module="expenses" action="view">
<Expenses />
</PermissionRoute>
}
/>

<Route
path="/payrolls"
element={
<PermissionRoute module="payroll" action="view">
<Payroll />
</PermissionRoute>
}
/>

<Route
path="/reports"
element={
<PermissionRoute module="reports" action="view">
<Reports />
</PermissionRoute>
}
/>
<Route path="/profile" element={<MyAccount />} />
<Route path="/resignation" element={<Resignation />} />
<Route
path="/assignroles"
element={
<PermissionRoute module="roles" action="view">
<Roles />
</PermissionRoute>
}
/>

<Route
  path="/setting"
  element={
    user?.role === "super_admin" ? (
      <Settings />
    ) : (
      <PermissionRoute module="setting" action="view">
        <Settings />
      </PermissionRoute>
    )
  }
/>

<Route path="/notifications" element={<Notifications />} />

{/* TASKS */}
<Route
path="/tasks"
element={
<PermissionRoute module="tasks" action="view">
<TaskLayout />
</PermissionRoute>
}
>
<Route index element={<TaskDashboard />} />
<Route path="projects" element={<Project />} />
<Route path="task" element={<Task />} />
<Route path="sub-task" element={<SubTask />} />
<Route path="overdue" element={<OverdueTask />} />
<Route path="manager" element={<TaskManager />} />
</Route>

{/* JOB PORTAL */}
<Route
path="/jobs"
element={
<PermissionRoute module="jobportal" action="view">
<JobLayout />
</PermissionRoute>
}
>
<Route index element={<JobDashboard />} />
<Route path="application" element={<ApplicationsPage />} />
<Route path="candidates" element={<CandidatesPage />} />
<Route path="companys" element={<CompaniesPage />} />
<Route path="jobs" element={<JobsPage />} />
<Route path="revenues" element={<RevenuePage />} />
<Route path="setting" element={<SettingsPage />} />
<Route path="roles" element={<RolePage />} />
</Route>

{/* LEAD PORTAL */}
<Route
path="/leads"
element={
<PermissionRoute module="leadportal" action="view">
<LeadLayout />
</PermissionRoute>
}
>
<Route index element={<LeadList />} />
<Route path="orders" element={<OrderList />} />
<Route path="products" element={<ProductList />} />
</Route>

</Route>



      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
     <BrowserRouter basename="/">
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
         
            <AppRoutes />
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
