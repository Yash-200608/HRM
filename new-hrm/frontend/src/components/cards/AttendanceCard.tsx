import React, { useMemo, useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/redux-toolkit/hooks/hook";
import { useAuth } from "@/contexts/AuthContext";
import { getAttendanceData } from "@/services/Service";
import { getAttendance } from "@/redux-toolkit/slice/allPage/attendanceSlice";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const formatTime = (time: any) => {
  if (!time || time === "-") return "-";

  // OLD STRING FORMAT SUPPORT
  if (typeof time === "string" && !time.includes("T")) {
    return time;
  }

  const parsedTime = new Date(time);

  if (isNaN(parsedTime.getTime())) {
    return "-";
  }

  return parsedTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};


const formatDate = (date: any) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatHours = (hours: number) => {

  if (!hours || hours <= 0) {
    return "0h 0m";
  }

  const totalMinutes = Math.round(hours * 60);

  const hrs = Math.floor(totalMinutes / 60);

  const mins = totalMinutes % 60;

  return `${hrs}h ${mins}m`;
};

const AttendanceTable = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const attendanceList = useAppSelector(
    (state: any) => state.attendance.attendance
  );

  // ================= MONTH =================
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();

    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  // ================= SEARCH =================
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ================= PAGINATION =================
  const [currentPage, setCurrentPage] = useState(1);

  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // ================= LOADING =================
  const [loading, setLoading] = useState(false);

  // ================= EXTRACT MONTH/YEAR =================
  const [year, month] = selectedMonth.split("-").map(Number);


  const departments = [
  ...new Set(
    attendanceList
      .map((att: any) => att?.userId?.department?.name)
      .filter(Boolean)
  )
];



const downloadAttendanceCSV = () => {
  const employeeSummary: any = {};

  filteredAttendance.forEach((att: any) => {
    const employeeId = att?.userId?._id;

    if (!employeeSummary[employeeId]) {
      employeeSummary[employeeId] = {
        Employee: att?.userId?.fullName || "N/A",
        Department:
          att?.userId?.department?.name || "N/A",

        Present: 0,
        Absent: 0,
        HalfDay: 0,
        Holiday: 0,
        ClockedIn: 0,

        LateCount: 0,

        TotalHours: 0,
        OvertimeHours: 0,
      };
    }

    // Status Counts
    if (att?.status === "Present")
      employeeSummary[employeeId].Present++;

    if (att?.status === "Absent")
      employeeSummary[employeeId].Absent++;

    if (att?.status === "Half Day")
      employeeSummary[employeeId].HalfDay++;

    if (att?.status === "Holiday")
      employeeSummary[employeeId].Holiday++;

    if (att?.status === "Clocked In")
      employeeSummary[employeeId].ClockedIn++;

    // Late Count
    if (att?.isLate)
      employeeSummary[employeeId].LateCount++;

    // Hours
    employeeSummary[employeeId].TotalHours += Number(
      att?.hoursWorked || 0
    );

    // Overtime
    employeeSummary[employeeId].OvertimeHours += Number(
      att?.overtime || 0
    );
  });

  const exportData = Object.values(
    employeeSummary
  ).map((emp: any) => ({
    ...emp,
    TotalHours: emp.TotalHours.toFixed(2),
    OvertimeHours:
      emp.OvertimeHours.toFixed(2),
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(exportData);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Attendance Summary"
  );

  const excelBuffer = XLSX.write(
    workbook,
    {
      bookType: "xlsx",
      type: "array",
    }
  );

  const fileData = new Blob(
    [excelBuffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  saveAs(
    fileData,
    `Attendance-${selectedMonth}.xlsx`
  );
};


  // ================= FETCH =================
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);

        const companyId =
          user?.companyId?._id ||
          user?.companyId ||
          user?.createdBy?._id ||
          user?.createdBy;


        if (!companyId) return;

        const res = await getAttendanceData(
          month,
          year,
          companyId
        );

        if (Array.isArray(res?.data?.records)) {

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
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchAttendance();
    }
  }, [selectedMonth, user]);

  
  // ================= FILTER =================
  const filteredAttendance = useMemo(() => {
    let filtered = [...attendanceList];
    if (departmentFilter !== "all") {
  filtered = filtered.filter(
    (att: any) =>
      att?.userId?.department?.name ===
      departmentFilter
  );
}

if (statusFilter !== "all") {
  filtered = filtered.filter(
    (att: any) => att?.status === statusFilter
  );
}

    // employee filter
   const canViewAllAttendance =
  user?.role === "admin" ||
  user?.role === "super_admin" ||
  (user as any)?.assignedRole?.permissions?.attendance?.edit;

if (!canViewAllAttendance) {
  filtered = filtered.filter(
    (att: any) => att.userId?._id === user?._id
  );
}



    // search filter
    if (search.trim()) {
      filtered = filtered.filter((att: any) =>
        att.userId?.fullName
          ?.toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    // alphabetical sorting
    filtered.sort((a: any, b: any) =>
      (a?.userId?.fullName || "").localeCompare(
        b?.userId?.fullName || ""
      )
    );

    return filtered;
 }, [
  attendanceList,
  user,
  search,
  departmentFilter,
  statusFilter
]);

  // ================= PAGINATED DATA =================
  const totalPages = Math.ceil(
    filteredAttendance.length / entriesPerPage
  );

  const paginatedAttendance = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;

    const end = start + entriesPerPage;

    return filteredAttendance.slice(start, end);
  }, [
    filteredAttendance,
    currentPage,
    entriesPerPage,
  ]);

  // ================= PAGE CHANGE =================
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  
    const canManageAttendance =
  user?.role === "admin" ||
  user?.role === "super_admin" ||
  (user as any)?.assignedRole?.permissions?.attendance?.edit;

  return (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
    
    {/* ================= HEADER ================= */}
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-8">
      {canManageAttendance && (
      <button
  onClick={downloadAttendanceCSV}
  className="
  px-4 py-3
  bg-green-600
  text-white
  rounded-2xl
  text-sm
  font-medium
  hover:bg-green-700
  transition
  "
>
  Export Excel
</button>
)}

      <div className="flex flex-col md:flex-row gap-3">
        
        {/* SEARCH */}
        <div className="relative">
          {canManageAttendance && (

          <select
  value={departmentFilter}
  onChange={(e) => {
    setDepartmentFilter(e.target.value);
    setCurrentPage(1);
  }}
  className="border border-gray-200 rounded-2xl px-4 py-3 text-sm"
>
  <option value="all">
    All Departments
  </option>

{(departments as any).map((dept, index) => (
  <option key={`${dept}-${index}`} value={dept}>
    {dept}
  </option>
))}
</select>
          )}

{canManageAttendance && (
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-[260px] border border-gray-200 
            rounded-2xl px-4 py-3 text-sm outline-none 
            focus:ring-4 focus:ring-blue-100 
            focus:border-blue-500 transition"
          />
)}
          
        </div>

        {/* MONTH */}
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-2xl px-4 py-3 text-sm 
          outline-none focus:ring-4 focus:ring-blue-100 
          focus:border-blue-500 transition"
        />

        {/* ENTRIES */}
        <select
          value={entriesPerPage}
          onChange={(e) => {
            setEntriesPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-2xl px-4 py-3 text-sm 
          outline-none focus:ring-4 focus:ring-blue-100 
          focus:border-blue-500 transition"
        >
          <option value={10}>10 entries</option>
          <option value={25}>25 entries</option>
          <option value={50}>50 entries</option>
          <option value={100}>100 entries</option>
        </select>
      </div>
    </div>

    {/* ================= LOADING ================= */}
    {loading ? (
      <div className="py-16 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>

        <p className="text-gray-500 mt-4 text-sm">
          Loading attendance records...
        </p>
      </div>
    ) : (
      <>
        {/* ================= TABLE ================= */}
        <div
  className="
  overflow-x-auto
  rounded-3xl
  border border-slate-200
  bg-white
  shadow-sm
  scrollbar-thin
  scrollbar-thumb-slate-300
  scrollbar-track-transparent
  "
>
          
          <table className="w-full min-w-[1250px] border-separate border-spacing-0">
            
            {/* ================= HEAD ================= */}
            <thead
  className="
  bg-slate-50
  sticky
  top-0
  z-10
  backdrop-blur-sm
  "
>
              <tr className="text-left">
                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Sr No.
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Employee
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Date
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Status
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Clock In
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Clock Out
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Hours
                </th>
                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Late
                </th>

                <th className="
px-6
py-5
text-[11px]
font-bold
tracking-[1px]
uppercase
text-slate-500
border-b
border-slate-200
whitespace-nowrap
bg-slate-50
">
                  Overtime
                </th>
              </tr>
            </thead>

            {/* ================= BODY ================= */}
            <tbody className="divide-y divide-gray-100">
              
              {paginatedAttendance.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-20 text-center"
                  >
                    <div className="flex flex-col items-center">
                      
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                        📅
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-gray-800">
                        No Attendance Found
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        No attendance records available for this month
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAttendance.map(
                  (att: any, index: number) => {
                    const hours =
  Number(att.hoursWorked || att.hours || 0);

                    const overtime =
  Number(att.overtime || 0) > 0
    ? Number(att.overtime).toFixed(2)
    : hours > 9
    ? (hours - 9).toFixed(2)
    : "0";

                    return (
                      <tr
                        key={att._id}
                        className="
group
hover:bg-blue-50/40
transition-all
duration-300
even:bg-slate-50/40
"
                      >
                        
                        {/* SR NO */}
                        <td className="px-5 py-5 text-sm text-gray-600 font-medium">
                          {(currentPage - 1) *
                            entriesPerPage +
                            index +
                            1}
                        </td>

                        {/* EMPLOYEE */}
                        <td className="px-5 py-5 min-w-[260px]">
                          
                          <div className="flex items-center gap-3">
                            
                            <div
className="
w-12
h-12
rounded-2xl
bg-gradient-to-br
from-blue-100
to-indigo-100
text-blue-700
flex
items-center
justify-center
font-bold
text-sm
shadow-sm
shrink-0
group-hover:scale-105
transition
"
>
                              {att.userId?.fullName
                                ?.charAt(0)
                                ?.toUpperCase() || "N"}
                            </div>

                            <div className="min-w-0">
                              
                              <p
                                className="font-semibold text-gray-900 
                                truncate max-w-[180px]"
                              >
                                {att.userId?.fullName || "N/A"}
                              </p>

                              <p className="text-xs text-gray-500 truncate">
                                {att.userId?.designation ||
                                  "Employee"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* DATE */}
                        <td className="px-5 py-5 text-sm text-gray-700 font-medium">
                         {formatDate(att.attendanceDate || att.date)}
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full 
                            text-xs font-semibold border whitespace-nowrap

                            ${
                              att.status === "Present"
                                ? "bg-green-50 text-green-700 border-green-200"

                                : att.status === "Half Day"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"

                                : att.status === "Absent"
                                ? "bg-red-50 text-red-700 border-red-200"

                                : att.status === "Overtime"
                                ? "bg-blue-50 text-blue-700 border-blue-200"

                                :att.status === "Clocked In"
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"

                                : att.status === "Holiday"
                                ? "bg-purple-50 text-purple-700 border-purple-200"

                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>

                        {/* CLOCK IN */}
                        <td className="px-5 py-5">
                         <div
className="
inline-flex
items-center
justify-center
min-w-[95px]
px-4
py-2.5
rounded-2xl
bg-slate-100
text-slate-800
text-sm
font-semibold
shadow-sm
whitespace-nowrap
"
>
                          {formatTime(att.clockInTime || att.clockIn)}
                          </div>
                        </td>

                        {/* CLOCK OUT */}
                        <td className="px-5 py-5">
                         <div
className="
inline-flex
items-center
justify-center
min-w-[95px]
px-4
py-2.5
rounded-2xl
bg-slate-100
text-slate-800
text-sm
font-semibold
shadow-sm
whitespace-nowrap
"
>
                            {formatTime(att.clockOutTime || att.clockOut)}
                          </div>
                        </td>

                        {/* HOURS */}
                        <td className="px-5 py-5">
                          <span
className="
inline-flex
items-center
justify-center
min-w-[90px]
font-bold
text-slate-900
text-[15px]
whitespace-nowrap
"
>
                            {formatHours(hours)}
                            
                          </span>
                        </td>
                        
                        <td className="px-5 py-5">
{att?.isLate ? (
  <span className="text-red-500 font-medium">
    Yes
  </span>
) : (
  <span className="text-slate-400">
    No
  </span>
)}
 </td>
                        {/* OVERTIME */}
                        <td className="px-5 py-5">
                          {overtime !== "0" ? (
                            <span
                               
                             className="
inline-flex
items-center
justify-center
min-w-[105px]
px-4
py-2
rounded-2xl
bg-gradient-to-r
from-blue-50
to-indigo-50
text-blue-700
text-sm
font-bold
shadow-sm
whitespace-nowrap
"
                            >
                              +{overtime} hrs
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-5 mt-7">
          
          {/* ENTRIES INFO */}
          <div className="text-sm text-gray-500">
            Showing{" "}
            <span
className="
inline-flex
items-center
justify-center
min-w-[90px]
font-bold
text-slate-900
text-[15px]
whitespace-nowrap
"
>
              {paginatedAttendance.length}
            </span>{" "}
            of{" "}
            <span
className="
inline-flex
items-center
justify-center
min-w-[90px]
font-bold
text-slate-900
text-[15px]
whitespace-nowrap
"
>
              {filteredAttendance.length}
            </span>{" "}
            attendance records
          </div>

          {/* PAGINATION */}
          <div className="flex items-center gap-2 flex-wrap">
            
            <button
              disabled={currentPage === 1}
              onClick={() =>
                handlePageChange(currentPage - 1)
              }
              className="px-4 py-2 rounded-xl border border-gray-200 
              text-sm font-medium hover:bg-gray-50 
              disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Prev
            </button>

            {Array.from(
              { length: totalPages },
              (_, i) => (
                <button
                  key={i}
                  onClick={() =>
                    handlePageChange(i + 1)
                  }
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition
                  
                  ${
                    currentPage === i + 1
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              )
            )}

            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                handlePageChange(currentPage + 1)
              }
              className="px-4 py-2 rounded-xl border border-gray-200 
              text-sm font-medium hover:bg-gray-50 
              disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      </>
    )}
  </div>
);
};

export default AttendanceTable;