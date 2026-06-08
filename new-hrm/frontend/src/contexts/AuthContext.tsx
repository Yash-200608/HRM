
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { loginEmployee } from "@/services/Service";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getCompany, getRecentActivities } from '@/redux-toolkit/slice/allPage/companySlice';
import { getSetting, clearSetting, getCompanyDetail } from '@/redux-toolkit/slice/allPage/settingSlice';
import { getAdminList, getEmployeeList } from '@/redux-toolkit/slice/allPage/userSlice';
import { getPayroll, getSinglePayroll, getAttendancePayroll } from '@/redux-toolkit/slice/allPage/payrollSlice';
import { getDashboardData } from '@/redux-toolkit/slice/allPage/dashboardSlice';
import { getDepartment } from '@/redux-toolkit/slice/allPage/departmentSlice';
import { getExpense, getExpenseCategory } from '@/redux-toolkit/slice/allPage/expenseSlice';
import { getLeaveTypes, getLeaveRequests } from '@/redux-toolkit/slice/allPage/leaveSlice';
import { getReport } from '@/redux-toolkit/slice/allPage/reportSlice';
import { getAttendance, getAttendanceReport } from "@/redux-toolkit/slice/allPage/attendanceSlice";
//task k liye
import { getTaskDashboard } from '@/redux-toolkit/slice/task/dashboardSlice';
import { getOverdueTasks } from "@/redux-toolkit/slice/task/overdueTaskSlice";
import { getProjects } from '@/redux-toolkit/slice/task/projectSlice';
import { getSubTasks } from "@/redux-toolkit/slice/task/subTaskSlice";
import { getManagers } from '@/redux-toolkit/slice/task/taskManagerSlice';
import { getTasks } from "@/redux-toolkit/slice/task/taskSlice";
// job portal k liye
import { getApplicationList } from '@/redux-toolkit/slice/job-portal/applicationSlice';
import { getCandidates } from "@/redux-toolkit/slice/job-portal/candidateSlice";
import { getCompanyJobList } from '@/redux-toolkit/slice/job-portal/companyJobSlice';
import { getDashboardJobList, getDashboardSummaryData, getDashboardOverviewData, getDashboardPanelData } from "@/redux-toolkit/slice/job-portal/dashboardSlice";
import { getJobList } from '@/redux-toolkit/slice/job-portal/jobSlice';
import { getRoles } from "@/redux-toolkit/slice/job-portal/roleSlice";
import { getLoginUser } from "@/redux-toolkit/slice/allPage/loginUserSlice";
import { socket } from "@/socket/socket";
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<void>; // role optional
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const loginUserData = useAppSelector((state) => state?.loginUser?.loginUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (loginUserData) {
      setUser(loginUserData)
    }
    else {
     const storedUser = localStorage.getItem("user");
const user = storedUser ? JSON.parse(storedUser) : null;
setUser(user);
    }
  }, [loginUserData])

  useEffect(() => {
    socket.on("departmentRefresh", (department) => {
      console.log("departmentRefresh", department);
      const user = JSON.parse(localStorage.getItem("user"));

      if (user?.role === "employee") {
        user.department = department;
        setUser(user);
        dispatch(getLoginUser(user));
        localStorage.setItem("user", JSON.stringify(user));
      }
    })
    socket.on("getDepartmentRefresh", (employee) => {
      console.log("getDepartmentRefresh", employee);
      if (user?._id === employee?._id) {
        setUser(employee);
        dispatch(getLoginUser(employee));
        localStorage.setItem("user", JSON.stringify(employee));
      }
    });
    socket.on("refreshProfile", () => {
      const userData = JSON.parse(localStorage.getItem("user"));
      setUser(userData);
    })

    socket.on("getRelieveRefresh", (employeeId) => {
      if (user?._id === employeeId) {
        toast({
          title: "Employee Relieved",
          description: `You has been relieved. Please contact admin.`,
          variant: "destructive",
        });
        setUser(null);
        dispatch(getLoginUser(null));
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");

        window.location.href = "/login";
        return; // stop further processing
      }
    });

    socket.on("updateManagerRefresh", ({ newManager, oldManager }) => {
      // 🔴 CASE 0: Check RELIEVED status first
      const checkRelieved = (employee: any) => employee?.status === "RELIEVED";

      // 🔴 First check RELIEVED for newManager
      if (checkRelieved(newManager)) {
        toast({
          title: "Employee Relieved",
          description: `${newManager?.fullName} has been relieved. Please contact admin.`,
          variant: "destructive",
        });

        // ❌ Clear state & localStorage
        setUser(null);
        dispatch(getLoginUser(null));
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");

        window.location.href = "/login";
        return; // stop further processing
      }

      // 🔴 Check RELIEVED for oldManager
      if (checkRelieved(oldManager)) {
        toast({
          title: "Employee Relieved",
          description: `${oldManager?.fullName} has been relieved. Please contact admin.`,
          variant: "destructive",
        });

        setUser(null);
        dispatch(getLoginUser(null));
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");

        window.location.href = "/login";
        return;
      }

      // 🔥 CASE 1: First time manager assign (oldManager null hoga)
      if (newManager && !oldManager) {

        if (user?._id === newManager?._id) {
          setUser(newManager);
          dispatch(getLoginUser(newManager));
          localStorage.setItem("user", JSON.stringify(newManager));
        }

        toast({
          title: "Manager Assigned",
          description: `New Manager from ${newManager?.department} department: ${newManager?.fullName}`,
        });
      }

      // 🔥 CASE 2: Manager replaced (oldManager bhi hai & newManager bhi hai)
      if (newManager && oldManager) {

        // ✅ New manager side update
        if (user?._id === newManager?._id) {
          setUser(newManager);
          dispatch(getLoginUser(newManager));
          localStorage.setItem("user", JSON.stringify(newManager));

          toast({
            title: "Manager Assigned",
            description: `You are now Manager of ${newManager?.department} department.`,
          });
        }

        // ✅ Old manager side update
        if (user?._id === oldManager?._id) {
          setUser(oldManager);
          dispatch(getLoginUser(oldManager));
          localStorage.setItem("user", JSON.stringify(oldManager));

          toast({
            title: "Manager Removed",
            description: `You have been removed as Manager from ${oldManager?.department} department.`,
            variant: "destructive",
          });
        }
      }
    });

    return () => {
      socket.off("updateManagerRefresh");
      socket.off("getRelieveRefresh");
      socket.off("getDepartmentRefresh");
      socket.off("refreshProfile");
    };
  }, []);


 const login = async (email: string, password: string, role?: UserRole) => {
  setLoading(true);

  try {
    const res = await loginEmployee(email, password);

    if (res.status === 200) {
      const loginUser = res?.data?.user;
      const token = res?.data?.accessToken;

      localStorage.setItem("accessToken", token);
      localStorage.setItem("user", JSON.stringify(loginUser));

      setUser(loginUser);
      dispatch(getLoginUser(loginUser));

      toast({
        title: "Login Successfully.",
        description: res?.data?.message,
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  const token = localStorage.getItem("accessToken");
  const savedUser = localStorage.getItem("user");

  if (token && savedUser && !user) {
    setUser(JSON.parse(savedUser));
  }
}, []);


useEffect(() => {

  const token = localStorage.getItem("accessToken");

  if (!token) return;

  try {

    const decoded: any = jwtDecode(token);

    const currentTime = Date.now() / 1000;

    // TOKEN EXPIRED
    if (decoded.exp < currentTime) {

      logout();

      return;
    }

    // AUTO LOGOUT TIMER
    const remainingTime =
      decoded.exp * 1000 - Date.now();

    const timer = setTimeout(() => {

      logout();

    }, remainingTime);

    return () => clearTimeout(timer);

  } catch (error) {

    logout();
  }

}, []);


  const logout = () => {
    if (user?.role === "super_admin") {
      navigate("/superAdmin/login");
    }
    else if (user?.role === "admin") {
      navigate("/admin/login");
    }
    else {
      navigate("/login");
    }
    toast({
      title: "Logout Successfully.",
      description: `Logout Successfully.`,
    });
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem("token");
    sessionStorage.clear();
    dispatch(getCompany([]));
    dispatch(getRecentActivities([]));
    dispatch(getSetting(null));
    dispatch(getAdminList([]));
    dispatch(getPayroll([]));
    dispatch(getSinglePayroll([]));
    dispatch(getEmployeeList([]));
    dispatch(getAttendancePayroll([]));
    dispatch(getDepartment([]));
    dispatch(getExpense([]));
    dispatch(getExpenseCategory([]));
    dispatch(getLeaveTypes([]));
    dispatch(getLeaveRequests([]));
    dispatch(getReport({}));
    dispatch(getDashboardData({}));
    dispatch(getCompanyDetail(null));
    dispatch(getAttendance([]));
    dispatch(getAttendanceReport([]));
    dispatch(getLoginUser(null));
    // task k liye
    dispatch(getTaskDashboard({}));
    dispatch(getOverdueTasks([]));
    dispatch(getProjects([]));
    dispatch(getSubTasks([]));
    dispatch(getManagers([]));
    dispatch(getTasks([]));
    // job portal k liye
    dispatch(getApplicationList([]));
    dispatch(getCandidates([]));
    dispatch(getCompanyJobList([]));
    dispatch(getJobList([]));
    dispatch(getRoles([]));
    dispatch(getDashboardJobList([]));
    dispatch(getDashboardSummaryData(null));
    dispatch(getDashboardOverviewData(null));
    dispatch(getDashboardPanelData(null));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
