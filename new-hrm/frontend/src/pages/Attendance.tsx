
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogIn, LogOut , ArrowLeft} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttendanceTable from "@/components/cards/AttendanceCard";
import { useToast } from "@/hooks/use-toast";
import { getEmployees, submitClockIn, submitClockOut, getAttendanceData } from "@/services/Service";
import { useNotifications } from "@/contexts/NotificationContext";
import { Helmet } from "react-helmet-async";
import AttendanceForm from "@/Forms/AttendanceDialog"
import { useAppSelector } from "@/redux-toolkit/hooks/hook";
import { socket } from "@/socket/socket";
import { useAppDispatch } from "@/redux-toolkit/hooks/hook";
import { getAttendance } from "@/redux-toolkit/slice/allPage/attendanceSlice";
import { getEmployeeList } from "../redux-toolkit/slice/allPage/userSlice";


 const today = new Date();
const getTodayDate = () => today.toISOString().split("T")[0];





const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
const dispatch = useAppDispatch();
  // const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [attendanceRefresh, setAttendanceRefresh] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
      const { notifications, markAsRead, deleteNotification } = useNotifications();
      const [attendanceForm, setAttendanceForm] = useState(false);
    const attendanceList = useAppSelector((state) => state.attendance.attendance);

    // const dispatch = useAppDispatch();

const handleGetEmployees = async () => {
  try {
    const data = await getEmployees(user?.companyId?._id);

    dispatch(getEmployeeList(data));
  } catch (err) {
    console.log(err);
  }
};

useEffect(() => {
  handleGetEmployees();
}, []);

  
const [attendanceActionLoading, setAttendanceActionLoading] =
  useState(false);

    const fetchAttendance = async () => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const companyId =
      user?.role === "employee"
        ? user?.createdBy?._id
        : user?.companyId?._id;

    if (!companyId) return;

    const res = await getAttendanceData(month, year, companyId);

    if (Array.isArray(res?.data?.records)) {
      // 🔥 THIS IS CRITICAL
      const records = res.data.records || [];

const canViewAllAttendance =
  user?.role === "admin" ||
  (user as any)?.assignedRole?.permissions?.attendance?.edit;

dispatch(
  getAttendance(
    canViewAllAttendance
      ? records
      : records.filter(
          (att) => att?.userId?._id === user?._id
        )
  )
);
    }
  } catch (err) {
    console.log(err);
  }
};


  // // =================== Fetch Employees ===================
  // const handleGetEmployees = async () => {
  //   try {
  //     const data = await getEmployees(user?.companyId?._id);
  //     if (Array.isArray(data)) setEmployeeList(data);
  //   } catch (err: any) {
  //     toast({
  //       title: "Error",
  //       description: err?.response?.data?.message || "Something went wrong",
  //       variant: "destructive",
  //     });
  //   }
  // };

  // // =================== Fetch Attendance ===================
  // const handleGetAttendances = async (date: string) => {
  //   const selected = new Date(date);

  //     const month = selected.getMonth() + 1; // JS months = 0–11
  //     const year = selected.getFullYear();
  //     const companyId = user?.role === "employee"? user?.createdBy?._id : user?.companyId?._id;
  //     if(!month || !year || !companyId) return;
  //   try {
  //     const res = await getAttendanceData(month, year, companyId);
  //   } catch (err: any) {
  //     // toast({
  //     //   title: "Error",
  //     //   description: err?.response?.data?.message || "Something went wrong",
  //     //   variant: "destructive",
  //     // });
  //   }
  // };

  // useEffect(() => {
  //   handleGetAttendances(selectedDate);
  // }, [notifications]);

  // =================== Clock In/Out ===================
  const handleClockIn = async () => {
      setAttendanceActionLoading(true);

    try {
      const res = await submitClockIn(user?._id);
      if (res.status === 200) {
        toast({ title: "Success", description: "You have successfully clocked in." });
       await fetchAttendance(); // 🔥 MAIN FIX
       
      //  handleGetAttendances(selectedDate);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }finally {

    setAttendanceActionLoading(false);

  }
  };

  const handleClockOut = async () => {
      setAttendanceActionLoading(true);

    try {
      const res = await submitClockOut(user?._id);
      if (res.status === 200) {
        toast({ title: "Success", description: "You have successfully clocked out." });
       await fetchAttendance(); // 🔥 MAIN FIX
        // handleGetAttendances(selectedDate);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }finally {

        setAttendanceActionLoading(false);
    }
  };
useEffect(() => {
  if (user?._id) {
    fetchAttendance();
  }
}, [user]);
  // =================== Today's Attendance ===================
// 🔥 1. Find ACTIVE SESSION (important)

const todayStr = new Date().toISOString().split("T")[0];



const activeAttendance = attendanceList.find(
  (att) =>
    att.userId?._id === user?._id &&
    att.clockInTime &&
    !att.clockOutTime
);




const canEditAttendance =
  user?.role === "admin" ||
  (user as any)?.assignedRole?.permissions?.attendance?.edit;



// 🔥 2. Find TODAY attendance

const todayAttendance = attendanceList.find(
  (att) => {
    const attDate = new Date(att.attendanceDate || att.date).toISOString().split("T")[0];
    return attDate === todayStr && att.userId?._id === user?._id;
  }
);

// 🔥 3. Decide what to show
const displayAttendance = activeAttendance || todayAttendance;

// 🔥 4. UI STATE
const attendanceUIState = useMemo(() => {
  if (activeAttendance) return "WORKING";
  if (!todayAttendance) return "NO_RECORD";
  if (
    todayAttendance.clockOutTime &&
    todayAttendance.clockOutTime !== "-"
  )
    return "DAY_COMPLETED";
  if (todayAttendance.status === "Absent")
    return "DAY_MISSED";
  return "NO_RECORD";
}, [activeAttendance, todayAttendance]);



  return (
    <>
    <Helmet>
        <title>Attendance Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <AttendanceForm
      isOpen={attendanceForm}
      onClose={()=>{setAttendanceForm(false)}}
      setAttendanceRefresh={setAttendanceRefresh}
      />
   <div className="min-h-screen bg-[#f6f8fc] p-4 md:p-6 space-y-6">

  {/* PAGE HEADER */}
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
    
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        Attendance Management
      </h1>

      <p className="text-gray-500 mt-2">
        Track employee attendance, working hours and daily activity
      </p>
    </div>

    <div className="flex items-center gap-3">
      
      <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <Clock className="w-5 h-5 text-blue-600" />

        <div>
          <p className="text-xs text-gray-500">
            Today
          </p>

          <p className="text-sm font-semibold text-gray-900">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      {canEditAttendance && (
        <Button
          onClick={() => setAttendanceForm(true)}
          className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
        >
          Update Attendance
        </Button>
      )}
    </div>
  </div>

  {/* EMPLOYEE ATTENDANCE HERO */}
  {user?.role === "employee" && (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r
from-[#0f172a] to-[#1e3a8a] p-6
text-white shadow-lg">

      {/* Blur circles */}
      <div className="absolute top-[-100px] right-[-100px] w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

        {/* LEFT */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
              <Clock className="w-6 h-6 text-cyan-300" />
            </div>

            <div>
              <p className="text-blue-100 text-sm">
                Attendance Status
              </p>

              <h2 className="text-2xl font-bold">
                {attendanceUIState === "WORKING"
                  ? "Currently Working"
                  : attendanceUIState === "DAY_COMPLETED"
                  ? "Day Completed"
                  : attendanceUIState === "DAY_MISSED"
                  ? "Absent Today"
                  : "Ready to Clock In"}
              </h2>
            </div>
          </div>

          <p className="text-blue-100 text-sm leading-6 max-w-xl mt-1">
            {attendanceUIState === "WORKING" &&
              `You clocked in at ${displayAttendance?.clockInTime
  ? new Date(
      displayAttendance.clockInTime
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  : "-"} and your work session is active.`}

            {attendanceUIState === "DAY_COMPLETED" &&
              `Your attendance has been completed successfully for today.`}

            {attendanceUIState === "DAY_MISSED" &&
              "You were marked absent for today."}

            {attendanceUIState === "NO_RECORD" &&
              "Start your workday by clocking in."}
          </p>

          {/* STATS */}
          <div className="flex flex-wrap gap-4 mt-8">

            <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-md min-w-[130px]">
              <p className="text-sm text-blue-100">
                Clock In
              </p>

              <p className="text-lg font-semibold mt-1">
                {displayAttendance?.clockInTime
  ? new Date(
      displayAttendance.clockInTime
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  : "-"}
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-md min-w-[130px]">
              <p className="text-sm text-blue-100">
                Clock Out
              </p>

              <p className="text-lg font-semibold mt-1">
                {displayAttendance?.clockOutTime
  ? new Date(
      displayAttendance.clockOutTime
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  : "-"}
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-md min-w-[130px]">
              <p className="text-sm text-blue-100">
                Hours Worked
              </p>

              <p className="text-lg font-semibold mt-1">
                {displayAttendance?.hoursWorked || 0} hrs
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT ACTION */}
        <div className="flex-shrink-0">

          {attendanceUIState === "NO_RECORD" && (
          <Button
  disabled={attendanceActionLoading}
  onClick={handleClockIn}
  className="h-14 px-8 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 text-lg font-semibold shadow-lg"
>
  <LogIn className="w-5 h-5 mr-2" />

  {attendanceActionLoading
    ? "Processing..."
    : "Clock In"}
</Button>
          )}

          {attendanceUIState === "WORKING" && (
           <Button
  variant="destructive"
  disabled={attendanceActionLoading}
  onClick={handleClockOut}
  className="h-14 px-8 rounded-2xl text-lg font-semibold shadow-lg"
>
  <LogOut className="w-5 h-5 mr-2" />

  {attendanceActionLoading
    ? "Processing..."
    : "Clock Out"}
</Button>
          )}

          {attendanceUIState === "DAY_COMPLETED" && (
            <Button
              disabled
              className="h-14 px-8 rounded-2xl bg-white/20 text-white border border-white/10"
            >
              Day Completed
            </Button>
          )}

          {attendanceUIState === "DAY_MISSED" && (
            <Button
              disabled
              className="h-14 px-8 rounded-2xl bg-red-500/20 text-white border border-red-300/20"
            >
              Marked Absent
            </Button>
          )}
        </div>
      </div>
    </div>
  )}

  {/* TABLE SECTION */}
  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

   

    <div className="p-2 md:p-4">
      <AttendanceTable />
    </div>
  </div>
</div>
    </>
  );
};

export default Attendance;
