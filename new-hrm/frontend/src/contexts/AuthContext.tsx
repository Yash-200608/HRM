
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { getBillingOverview, loginEmployee, logoutSession, validateSession } from "@/services/Service";
import { clearLocalSession, getLoginPathForRole } from "@/lib/session";
import { applyEntitlementsToStoredUser } from "@/lib/entitlements";
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
import { readEntitlementsFromAccessToken } from "@/lib/entitlements";

interface LoginResult {
  accessToken?: string;
  user?: User;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<LoginResult | void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const dispatch = useAppDispatch();
  const loginUserData = useAppSelector((state) => state?.loginUser?.loginUser);
  const navigate = useNavigate();

  useEffect(() => {
    const mergeEntitlements = (storedUser: User | null) => {
      if (!storedUser) {
        return null;
      }

      const tokenClaims = readEntitlementsFromAccessToken();
      if (!tokenClaims.entitlements.length && !tokenClaims.subscriptionPlan) {
        return storedUser;
      }

      return {
        ...storedUser,
        entitlements: storedUser.entitlements?.length
          ? storedUser.entitlements
          : tokenClaims.entitlements,
        subscriptionPlan: storedUser.subscriptionPlan || tokenClaims.subscriptionPlan || "free",
      };
    };

    if (loginUserData) {
      const enriched = mergeEntitlements(loginUserData);
      setUser(enriched);
      if (enriched && enriched !== loginUserData) {
        localStorage.setItem("user", JSON.stringify(enriched));
      }
    } else {
      const storedUser = localStorage.getItem("user");
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const enriched = mergeEntitlements(parsed);
      setUser(enriched);
      if (enriched && enriched !== parsed) {
        localStorage.setItem("user", JSON.stringify(enriched));
      }
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
      localStorage.removeItem("accessToken");
      localStorage.setItem("user", JSON.stringify(loginUser));

      setUser(loginUser);
      dispatch(getLoginUser(loginUser));

      toast({
        title: "Login Successfully.",
        description: res?.data?.message,
      });

      return {
        user: loginUser,
        message: res?.data?.message,
      };
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
    throw error;
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    let cancelled = false;

    const finishInitialization = () => {
      if (!cancelled) {
        setInitializing(false);
      }
    };

    const bootstrapSession = async () => {
      try {
        const res = await validateSession();

        if (cancelled) {
          return;
        }

        if (res.status === 200 && res.data?.user) {
          const sessionUser = res.data.user as User;
          setUser(sessionUser);
          dispatch(getLoginUser(sessionUser));
          localStorage.setItem("user", JSON.stringify(sessionUser));
        } else {
          clearLocalSession();
          setUser(null);
          dispatch(getLoginUser(null));
        }
      } catch {
        if (!cancelled) {
          clearLocalSession();
          setUser(null);
          dispatch(getLoginUser(null));
        }
      } finally {
        finishInitialization();
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSession = async () => {
      try {
        const res = await validateSession();
        if (res.status !== 200 || !res.data?.user) {
          throw new Error("Session expired");
        }
      } catch {
        const loginPath = getLoginPathForRole(user?.role);
        clearLocalSession();
        setUser(null);
        dispatch(getLoginUser(null));
        window.location.href = loginPath;
      }
    };

    const interval = window.setInterval(refreshSession, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [user?._id, user?.role, dispatch]);

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "user" && event.oldValue && !event.newValue) {
        setUser(null);
        dispatch(getLoginUser(null));
        clearLocalSession();
        window.location.href = getLoginPathForRole();
      }
    };

    window.addEventListener("storage", handleStorageSync);
    return () => window.removeEventListener("storage", handleStorageSync);
  }, [dispatch]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const needsRefresh = !user.subscriptionPlan || !user.entitlements?.length;

    if (!needsRefresh) {
      return;
    }

    let cancelled = false;

    getBillingOverview()
      .then((response) => {
        if (cancelled) {
          return;
        }

        const data = response?.data?.data ?? response?.data;
        if (!Array.isArray(data?.entitlements)) {
          return;
        }

        const updated = applyEntitlementsToStoredUser(
          data.entitlements,
          data.subscriptionPlan
        );

        if (updated) {
          setUser(updated);
          dispatch(getLoginUser(updated));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.role, dispatch]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const refreshEntitlements = () => {
      getBillingOverview()
        .then((response) => {
          const data = response?.data?.data ?? response?.data;
          if (!Array.isArray(data?.entitlements) || data.entitlements.length === 0) {
            return;
          }

          const currentEntitlements = user.entitlements ?? [];
          const unchanged =
            currentEntitlements.length === data.entitlements.length &&
            currentEntitlements.every((item) => data.entitlements.includes(item));

          if (unchanged) {
            return;
          }

          const updated = applyEntitlementsToStoredUser(
            data.entitlements,
            data.subscriptionPlan
          );

          if (updated) {
            setUser(updated);
            dispatch(getLoginUser(updated));
          }
        })
        .catch(() => undefined);
    };

    window.addEventListener("focus", refreshEntitlements);
    return () => window.removeEventListener("focus", refreshEntitlements);
  }, [user?._id, user?.role, dispatch]);


  const logout = () => {
    const loginPath = getLoginPathForRole(user?.role);
    void logoutSession().catch(() => undefined);

    toast({
      title: "Logout Successfully.",
      description: `Logout Successfully.`,
    });
    setUser(null);
    clearLocalSession();
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
    navigate(loginPath);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading, initializing }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
