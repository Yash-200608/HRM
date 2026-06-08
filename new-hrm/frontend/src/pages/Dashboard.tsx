  import React, { useEffect, useState,useMemo } from "react";
  import AttendanceActionCard from "@/components/cards/AttendanceActionCard";
  import { useAuth } from "@/contexts/AuthContext";
  import StatCard from "@/components/dashboard/StatCard";
  import {
    Users,
    FolderKanban,
    Clock,
    CalendarDays,
    Receipt,
    CheckCircle2,
    AlertCircle,
    Timer,
    Gift,
    PartyPopper,
    CalendarHeart,
    Sparkles,
  TrendingUp,
  Activity,
  BriefcaseBusiness,
  ArrowRight,
  Building2,
  ShieldCheck,
  } from "lucide-react";

  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";

  import { getDashboardPage ,submitClockIn ,submitClockOut } from "@/services/Service";
  import { useToast } from "@/hooks/use-toast";
  import { formatDate } from "@/services/allFunctions";
  import { Helmet } from "react-helmet-async";
  import { useNavigate } from "react-router-dom";
  import CompanyList from "@/components/cards/CompanyCard";


  import {
    useAppDispatch,
    useAppSelector,
  } from "@/redux-toolkit/hooks/hook";

  import { getDashboardData } from "@/redux-toolkit/slice/allPage/dashboardSlice";
  import { socket } from "@/socket/socket";
  import { getAttendance } from "@/redux-toolkit/slice/allPage/attendanceSlice";
  import { getAttendanceData } from "@/services/Service";





  const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const dashboardData = useAppSelector(
      (state) => state?.dashboard?.dashboardData
    );

  const attendanceList = useAppSelector(
    (state) => state.attendance.attendance || []
  );
    const [pageLoading, setPageLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] =
    useState(true);
    const [clockActionLoading, setClockActionLoading] =
  useState(false);

  const [attendanceFetched, setAttendanceFetched] =
    useState(false);

  useEffect(() => {

    const loadAttendance = async () => {

      if (!user?._id) return;

      try {

        setAttendanceLoading(true);

        const attendanceRes =
          await getAttendanceData(
            new Date().getMonth() + 1,
            new Date().getFullYear(),
            user?.companyId?._id ||
            user?.createdBy?._id
          );

        const records =
          attendanceRes?.data?.records || [];

        dispatch(getAttendance(records));

      } catch (err) {

        console.log(err);

      } finally {

        setAttendanceFetched(true);

        setAttendanceLoading(false);

      }
    };

    loadAttendance();

  }, [user?._id]);

  const attendanceState = useMemo(() => {

    if (!user?._id || !attendanceFetched) {

      return {
        todayAttendance: null,
        attendanceUIState: "LOADING",
      };

    }

    const todayStr = new Date()
      .toISOString()
      .split("T")[0];

      const activeAttendance = attendanceList.find(
  (att: any) =>
    att.userId?._id === user?._id &&
    att.clockInTime &&
    !att.clockOutTime
);

    const todayAttendance = attendanceList.find((att: any) => {

      if (!att?.attendanceDate) return false;

  const attDate = new Date(att.attendanceDate || att.date)
    .toISOString()
    .split("T")[0];

      return (
        att.userId?._id === user?._id &&
        attDate === todayStr
      );

    });


    let attendanceUIState = "NO_RECORD";

    if (activeAttendance) {

      attendanceUIState = "WORKING";

    } else if (
      todayAttendance?.clockOutTime &&
      todayAttendance?.clockOutTime !== "-"
    ) {

      attendanceUIState = "DAY_COMPLETED";

    } else if (
      todayAttendance?.status === "Absent"
    ) {

      attendanceUIState = "DAY_MISSED";

    }

   return {
  todayAttendance:
    activeAttendance || todayAttendance,
  attendanceUIState,
};

  }, [
    attendanceFetched,
    attendanceList,
    user
  ]);

  const todayAttendance =
    attendanceState.todayAttendance;

  const attendanceUIState =
    attendanceState.attendanceUIState;


    /* ---------------- PRIORITY BADGE ---------------- */

    const getPriorityBadge = (priority: string) => {
      const styles: Record<string, string> = {
        low: "badge-info",
        medium: "badge-warning",
        high: "badge-destructive",
        urgent: "bg-destructive text-destructive-foreground",
      };

      return (
        <span
          className={`${styles[priority]} px-2 py-1 rounded-full text-xs font-medium`}
        >
          {priority}
        </span>
      );
    };

    /* ---------------- STATUS ICON ---------------- */

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "completed":
          return (
            <CheckCircle2 className="w-4 h-4 text-success" />
          );

        case "in_progress":
          return <Timer className="w-4 h-4 text-warning" />;

        default:
          return (
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          );
      }
    };

    /* ---------------- TODAY ATTENDANCE ---------------- */


    /* ---------------- CLOCK ACTIONS ---------------- */
  const handleClockIn = async () => {
  setClockActionLoading(true);

    try {

      await submitClockIn(user._id);

      const attendanceRes =
        await getAttendanceData(
          new Date().getMonth() + 1,
          new Date().getFullYear(),
          user?.companyId?._id ||
          user?.createdBy?._id
        );

      dispatch(
        getAttendance(
          attendanceRes?.data?.records || []
        )
      );

      socket.emit("addAttendanceRefresh");

      toast({
        title: "Success",
        description: "Clocked in successfully",
      });

    } catch (err: any) {

      toast({
        title: "Error",
        description:
          err?.response?.data?.message ||
          "Clock in failed",
        variant: "destructive",
      });

      console.log(err);
    } finally{
        setClockActionLoading(false);

    }

  };
  const handleClockOut = async () => {
  setClockActionLoading(true);

    try {

      await submitClockOut(user._id);

      const attendanceRes =
        await getAttendanceData(
          new Date().getMonth() + 1,
          new Date().getFullYear(),
          user?.companyId?._id ||
          user?.createdBy?._id
        );

      dispatch(
        getAttendance(
          attendanceRes?.data?.records || []
        )
      );

      socket.emit("addAttendanceRefresh");

      toast({
        title: "Success",
        description: "Clocked out successfully",
      });

    } catch (err: any) {

      toast({
        title: "Error",
        description:
          err?.response?.data?.message ||
          "Clock out failed",
        variant: "destructive",
      });

      console.log(err);
    } finally{
        setClockActionLoading(false);

    }
  };

    /* ---------------- DASHBOARD DATA ---------------- */

    const handleGetDashboard = async () => {
      if (user?.role === "super_admin") return;

      if (
        !user?._id ||
        (!user?.companyId?._id &&
          !user?.createdBy?._id)
      ) {
        return toast({
          title: "Error",
          description: "Required field missing.",
          variant: "destructive",
        });
      }

      setPageLoading(true);

      try {
        const res = await getDashboardPage(
          user?._id,
          user?.companyId?._id || user?.createdBy?._id
        );

        if (res.status === 200) {
          dispatch(
            getDashboardData(res?.data?.summary)
          );
        }
      } catch (err: any) {
        toast({
          title: "Error",
          description:
            err?.response?.data?.message ||
            err?.message,
          variant: "destructive",
        });
      } finally {
        setPageLoading(false);
      }
    };

    /* ---------------- INITIAL LOAD ---------------- */


    useEffect(() => {

    if (
      user &&
      user?.role !== "super_admin" &&
      Object.keys(dashboardData || {}).length === 0
    ) {
      handleGetDashboard();
    }

  }, [user]);

    /* ---------------- SOCKET REFRESH ---------------- */

    useEffect(() => {
      const refresh = () => {
    const token = localStorage.getItem("accessToken");

    if (!token) return;

    if (user?.role !== "super_admin") {
      handleGetDashboard();
    }
  };

      socket.on("getProjectRefresh", refresh);
      socket.on("getTaskRefresh", refresh);
      socket.on("getSubTaskRefresh", refresh);
      socket.on("getEmployeeRefresh", refresh);
      socket.on("getLeaveRefresh", refresh);
      socket.on("getAttendanceRefresh", refresh);

      return () => {
        socket.off("getProjectRefresh", refresh);
        socket.off("getTaskRefresh", refresh);
        socket.off("getSubTaskRefresh", refresh);
        socket.off("getEmployeeRefresh", refresh);
        socket.off("getLeaveRefresh", refresh);
        socket.off("getAttendanceRefresh", refresh);
      };
    }, [user]);

    /* ---------------- LOADER ---------------- */

    if (
      pageLoading &&
      Object.keys(dashboardData || {}).length === 0
    ) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
        </div>
      );
    }
    /* ---------------- JSX ---------------- */

    return (
    <>
      <Helmet>
        <title>Dashboard Page</title>
      </Helmet>

      {/* Attendance Card */}
      <AttendanceActionCard
        user={user}
        attendanceUIState={attendanceUIState}
        todayAttendance={todayAttendance}
        handleClockIn={handleClockIn}
        handleClockOut={handleClockOut}
        clockActionLoading={clockActionLoading}
      />

      <div className="space-y-8 pb-10 mt-5">

        {/* SUPER ADMIN */}
        {user?.role === "super_admin" && (
          <CompanyList />
        )}

        {user?.role !== "super_admin" && (
          <>

            {/* TOP SECTION */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

              {/* LEFT */}
              <div className="xl:col-span-3 space-y-6">

                {/* HERO */}
                <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">

                  <div className="absolute top-0 right-0 h-72 w-72 bg-blue-50 blur-3xl rounded-full opacity-60"></div>

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

                    <div className="max-w-3xl">

                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Workforce Intelligence
                      </div>

                      <h1 className="mt-6 text-5xl font-black tracking-tight text-slate-900">
                        Welcome back,
                      </h1>

                      <h2 className="mt-2 text-4xl font-bold text-slate-700">
                        {user?.fullName}
                      </h2>

                      <p className="mt-5 text-lg leading-relaxed text-slate-500">
                        Monitor attendance, productivity, employee activities,
                        task management and operational performance from one
                        centralized workspace.
                      </p>

                    </div>

                    {/* RIGHT INFO */}
                    <div className="grid grid-cols-2 gap-4 min-w-[320px]">

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <BriefcaseBusiness className="w-4 h-4" />
                          Current Role
                        </div>

                        <h3 className="mt-4 text-xl font-bold capitalize text-slate-900">
                          {user?.role?.replace("_", " ")}
                        </h3>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <CalendarDays className="w-4 h-4" />
                          Today's Date
                        </div>

                        <h3 className="mt-4 text-xl font-bold text-slate-900">
                          {new Date().toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                          })}
                        </h3>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Building2 className="w-4 h-4" />
                          Company
                        </div>

                        <h3 className="mt-4 text-lg font-bold truncate text-slate-900">
                          {(user as any)?.companyId?.companyName || "Xntrova"}
                        </h3>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <ShieldCheck className="w-4 h-4" />
                          System Status
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>

                          <span className="font-bold text-green-600">
                            Active
                          </span>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                {/* ANALYTICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

                  {/* ATTENDANCE */}
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-sm text-slate-500">
                          Attendance Rate
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-900">
                          {dashboardData?.attendancePercentage || 0}%
                        </h2>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                        <Clock className="h-7 w-7 text-blue-600" />
                      </div>

                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Performance
                        </span>

                        <span className="font-semibold text-slate-700">
                          Excellent
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${dashboardData?.attendancePercentage || 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                  </div>

                  {/* TASKS */}
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-sm text-slate-500">
                          Pending Tasks
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-900">
                          {dashboardData?.pendingTask || 0}
                        </h2>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                        <FolderKanban className="h-7 w-7 text-orange-600" />
                      </div>

                    </div>

                    <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      {dashboardData?.urgentTask || 0} urgent tasks
                    </div>

                  </div>

                  {/* LEAVES */}
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-sm text-slate-500">
                          Leave Requests
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-900">
                          {dashboardData?.pendingLeave || 0}
                        </h2>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                        <CalendarDays className="h-7 w-7 text-emerald-600" />
                      </div>

                    </div>

                    <div className="mt-6 text-sm text-slate-600">
                      {dashboardData?.newLeavesThisMonth || 0} new requests
                      this month
                    </div>

                  </div>

                  {/* EMPLOYEES */}
                  {user?.role === "admin" && (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">

                      <div className="flex items-center justify-between">

                        <div>
                          <p className="text-sm text-slate-500">
                            Employees
                          </p>

                          <h2 className="mt-3 text-4xl font-black text-slate-900">
                            {dashboardData?.totalEmployees || 0}
                          </h2>
                        </div>

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                          <Users className="h-7 w-7 text-violet-600" />
                        </div>

                      </div>

                      <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        +{dashboardData?.employeeGrowth || 0} this month
                      </div>

                    </div>
                  )}

                </div>

              </div>

              {/* RIGHT SIDEBAR */}
              <div className="space-y-6">

                {/* QUICK ACTIONS */}
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

                  <h3 className="text-xl font-bold text-slate-900">
                    Quick Actions
                  </h3>

                  <div className="mt-6 space-y-3">

                    <button
                      onClick={() => navigate("/attendances")}
                      className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-600" />

                        <span className="font-medium">
                          Attendance
                        </span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </button>

                    <button
                      onClick={() => navigate("/tasks")}
                      className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FolderKanban className="h-5 w-5 text-orange-600" />

                        <span className="font-medium">
                          Tasks
                        </span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </button>

                    <button
                      onClick={() => navigate("/leaves")}
                      className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-emerald-600" />

                        <span className="font-medium">
                          Leaves
                        </span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </button>

                  </div>

                </div>

                {/* PERFORMANCE */}
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center gap-4">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                      <Sparkles className="h-7 w-7 text-indigo-600" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Team Performance
                      </h3>

                      <p className="text-sm text-slate-500">
                        Monthly operational metrics
                      </p>
                    </div>

                  </div>

                  <div className="mt-8 space-y-6">

                    <div>

                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Productivity
                        </span>

                        <span className="font-semibold text-slate-700">
                          92%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-[92%] rounded-full bg-indigo-600"></div>
                      </div>

                    </div>

                    <div>

                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Attendance
                        </span>

                        <span className="font-semibold text-slate-700">
                          {dashboardData?.attendancePercentage || 0}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-600"
                          style={{
                            width: `${dashboardData?.attendancePercentage || 0}%`,
                          }}
                        ></div>
                      </div>

                    </div>

                    <div>

                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Task Completion
                        </span>

                        <span className="font-semibold text-slate-700">
                          87%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-[87%] rounded-full bg-orange-500"></div>
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* UPCOMING SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* BIRTHDAYS */}
              <Card className="rounded-[28px] border border-slate-200 bg-white shadow-sm">

                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <Gift className="w-5 h-5 text-pink-500" />
                    Upcoming Birthdays
                  </CardTitle>
                </CardHeader>

                <CardContent>

                  {dashboardData?.upcomingBirthdays?.length > 0 ? (
                    <div className="space-y-4">

                      {dashboardData?.upcomingBirthdays?.map((emp: any) => (

                        <div
                          key={emp?._id}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 transition-all"
                        >

                          <div className="flex items-center gap-3">

                            <img
                              src={
                                emp?.profileImage ||
                                "https://ui-avatars.com/api/?name=" +
                                emp?.fullName
                              }
                              className="h-14 w-14 rounded-2xl object-cover"
                            />

                            <div>

                              <p className="font-semibold text-slate-900">
                                {emp?.fullName}
                              </p>

                              <p className="text-sm text-slate-500">
                                Birthday Upcoming
                              </p>
                              <p className="text-sm text-slate-500">
    {emp?.dateOfBirth
      ? new Date(emp.dateOfBirth).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        })
      : "Birthday Upcoming"}
  </p>

                            </div>

                          </div>

                          <PartyPopper className="h-5 w-5 text-pink-500" />

                        </div>

                      ))}

                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-slate-400">
                      No Upcoming Birthdays
                    </div>
                  )}

                </CardContent>

              </Card>

              {/* LEAVES */}
              <Card className="rounded-[28px] border border-slate-200 bg-white shadow-sm">

                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <CalendarDays className="w-5 h-5 text-orange-500" />
                    Upcoming Leaves
                  </CardTitle>
                </CardHeader>

                <CardContent>

                  {dashboardData?.upcomingLeaves?.length > 0 ? (
                    <div className="space-y-4">

                    {dashboardData?.upcomingLeaves?.map((leave: any) => {

    console.log("LEAVE DATA =>", leave);

    return (

      <div
        key={leave?._id}
        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 transition-all"
      >

        <div className="flex items-center gap-3">

          <img
            src={
              leave?.userId?.profileImage ||
              `https://ui-avatars.com/api/?name=${leave?.user?.fullName || "User"}`
            }
            alt="employee"
            className="h-12 w-12 rounded-xl object-cover"
          />

          <div>

            <p className="font-semibold text-slate-900">
              {leave?.user?.fullName || "Employee"}
            </p>

            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <CalendarDays className="h-4 w-4" />

              <span>
                {formatDate(leave?.fromDate)}
              </span>
            </div>

          </div>

        </div>

        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-600">
          Leave
        </span>

      </div>

    );
  })}

                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-slate-400">
                      No Upcoming Leaves
                    </div>
                  )}

                </CardContent>

              </Card>

              {/* HOLIDAYS */}
              <Card className="rounded-[28px] border border-slate-200 bg-white shadow-sm">

                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <CalendarHeart className="w-5 h-5 text-green-500" />
                    Upcoming Holidays
                  </CardTitle>
                </CardHeader>

                <CardContent>

                  {dashboardData?.upcomingHolidays?.length > 0 ? (
                    <div className="space-y-4">

                      {dashboardData?.upcomingHolidays?.map((holiday: any) => (

                        <div
                          key={holiday?._id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                        >

                          <div className="flex items-center justify-between">

                            <div>

                              <p className="font-semibold text-slate-900">
                                {holiday?.name}
                              </p>

                              <p className="text-sm text-slate-500">
                                {formatDate(holiday?.date)}
                              </p>

                            </div>

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-600">
                              Holiday
                            </span>

                          </div>

                        </div>

                      ))}

                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-slate-400">
                      No Upcoming Holidays
                    </div>
                  )}

                </CardContent>

              </Card>

            </div>

          </>
        )}

      </div>
    </>
  );
  };

  export default Dashboard;