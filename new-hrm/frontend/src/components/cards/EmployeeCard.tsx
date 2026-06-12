
import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import RelieveEmployeeCard from "@/components/cards/RelieveEmployeeCard";
import { EmployeeFormDialog } from "@/Forms/EmployeeFormDialog";
import { getEmployeebyId, handleGetPdfLetter, getAttendanceById, getSingleleaveRequestsByDate, handleAddPdfLetter as addPdfLetterApi, getSinglePayRoll ,uploadLetter,getEmployeeLetters  } from "@/services/Service";
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from "lucide-react";
import { getStatusColorfromEmployee, getEventColor, formatDate, getCurrentMonthAndYear } from "@/services/allFunctions";
import { Helmet } from "react-helmet-async";
import SalarySlipCard from '@/components/cards/SalarySlipCard';
import { cn } from '@/lib/utils';

import { socket } from "@/socket/socket";
import { resolveCompanyIdFromUser } from "@/lib/tenant";

export const formatClock = (time: string) => {
  if (!time) return "-";

  return new Date(time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const dummyLetters = [
  {
    letterType: "offer",
    pdfData: btoa("Dummy PDF Data")
  }
];
const isOnlyString = (value) => {
  if (!value) return false;

  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return !imageExtensions.test(value);
};



const EmployeeDashboard = () => {
  const { toast } = useToast();
  const [allLetters, setAllLetters] =
  useState([]);

  const [allLetter, setAllLetter] = useState(dummyLetters);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [relieveEmployeeId, setRelieveEmployeeId] = useState(null);
  const [isSalarySlipPreview, setIsSalarySlipPreview] = useState(false);
  const [showRelieve, setShowRelieve] = useState(false);
  const [singleUserData, setSingleUserData] = useState(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [employeeListRefresh, setEmployeeListRefresh] = useState(false);
  const [singlePayrolls, setSinglePayrolls] = useState<any[]>([]);
  const [pdfOpenForm, setPdfOpenForm] = useState(false);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [leaveList, setLeaveList] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(getCurrentMonthAndYear());
  const [leaveSelectedDate, setLeaveSelectedDate] = useState(getCurrentMonthAndYear());
  const { id } = useParams();
  const { user } = useAuth();
  const attendanceDateRef = useRef(null);
  const leaveDateRef = useRef(null);

  const companyId = resolveCompanyIdFromUser(user);



  const fetchLetters =
async () => {

  const res =
    await getEmployeeLetters(
      singleUserData?._id
    );

  setAllLetters(
    res?.data?.letters || []
  );
};

useEffect(() => {

  if (singleUserData?._id) {

    fetchLetters();
  }

}, [singleUserData]);



const handleUploadLetter =
async (
  file: File,
  type: string
) => {

  try {

    const formData =
      new FormData();

    formData.append(
      "pdf",
      file
    );

    formData.append(
      "employeeId",
      singleUserData?._id
    );

    if (companyId) {
      formData.append("companyId", companyId);
    }

    formData.append(
      "adminId",
      user?._id
    );

    formData.append(
      "letterType",
      type
    );

    await uploadLetter(
      formData
    );

    fetchLetters();

  } catch (error) {

    console.log(error);
  }
};



  // ================= Fetch Attendance =================
  const fetchAttendances = async (date: string) => {
    try {

      const selected = new Date(date);
      const month = selected.getMonth() + 1; // JS months = 0–11
      const year = selected.getFullYear();

      if (!month || !year || !companyId) return;

      const res = await getAttendanceById(id, month, year, companyId);
      if (Array.isArray(res?.data?.records)) {
        let data = res?.data?.records?.filter((item: any) => item?.userId?._id === id);
        setAttendanceList(data);
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description:
          err?.response?.data?.error || "Something went wrong",
      });
    }
  };


  // ================= Fetch Attendance =================
  const handleGetLeaveData = async (date: string) => {
    try {
      const selected = new Date(date);
      const month = selected.getMonth() + 1; // JS months = 0–11
      const year = selected.getFullYear();
      if (!id) return;

      const res = await getSingleleaveRequestsByDate(id, companyId, month, year);
      if (Array.isArray(res?.data?.requests)) {
        setLeaveList(res.data.requests);
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description:
          err?.response?.data?.error || "Something went wrong",
      });
    }
  };
  useEffect(() => {
    if (companyId) {
      fetchAttendances(selectedDate);
      handleGetLeaveData(leaveSelectedDate);
    }
  }, [companyId, selectedDate, leaveSelectedDate]);

  const showSalarySlip = async () => {
    if (!singlePayrolls || singlePayrolls.length === 0) return toast({ title: "Slip Error", description: "Salary Slip Not Found.", variant: "destructive" })
    setPdfOpenForm(true);
  }

  const handleGetEmployee = async () => {
    try {
      const data = await getEmployeebyId(id, companyId || undefined);
      if (data) {
        setSingleUserData(data.employee || null);
        setHistory(data.history || []);
        setTasks(data?.task || [])
      } else {
        setSingleUserData(null);
        setHistory([]);
        setTasks([]);
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Something went wrong",
      });
    }
  };


  //--------------------- Add Employee All Letters---------------------------------------
  const handleAddPdfLetter = async (type: string) => {
    const obj = {
      employeeId: id,
      letterType: type,
    };
    try {
      const response = await addPdfLetterApi(obj); // call the global function

      if (response.success) {
        GetPdfLetter(id); // refresh list if needed
      } else {
        console.error("Failed to add PDF letter", response.error);
        toast({
          title: "Error",
          description: `Something went wrong: ${response.error?.message || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      console.error("Error adding PDF letter:", err);
      toast({
        title: "Error",
        description: `Something Went Wrong: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  //--------------------- Get Employee All Letters---------------------------------------

  const GetPdfLetter = async (id) => {
    try {
      const data = await handleGetPdfLetter(id);

      if (data) {
        setAllLetter(Array.isArray(data) ? data : [data]);
      }
    } catch (err) {
      console.error("Error adding department:", err);
      toast({
        title: 'Error',
        description: `Something Went Wrong :- ${err.response?.data?.message}`,
      });
    }
  };
  useEffect(() => {
    socket.on("getPayrollRefresh", () => {
      if (user?.role === "admin") {
        handleGetSinglePayRoll();
      }
    });
    socket.on("getLeaveRefresh", () => {
      if (user?.role === "admin") {
        handleGetLeaveData(leaveSelectedDate);
      }
    });
    socket.on("getEmployeeRefresh", () => {
      if (user?.role === "admin") {
        handleGetEmployee();
      }
    });
    socket.on("getAttendanceRefresh", () => {
      if (user?.role === "admin") {
        fetchAttendances(selectedDate);
      }
    });

    return () => {
      socket.off("getPayrollRefresh");
      socket.off("getLeaveRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getAttendanceRefresh");
    };
  }, []);

  const handleGetSinglePayRoll = async () => {
    if (!id || !companyId) return;
    try {
      const data = await getSinglePayRoll(id, companyId);
      if (Array.isArray(data)) {
        setSinglePayrolls(data);
      }
    } catch (error) {
      console.error("Error fetching all payrolls:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (user.role === 'admin') {
      handleGetSinglePayRoll();
    }
  }, [user]);

  useEffect(() => {
    if (employeeListRefresh) {
      handleGetEmployee();
      setEmployeeListRefresh(false);
    }
  }, [employeeListRefresh]);

  useEffect(() => {
    if (!user || !id) return;
    handleGetEmployee();
    GetPdfLetter(id);
  }, [user, id, companyId]);
console.log("attendanceList => ", attendanceList);
  return (
  <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617]">
    
    <Helmet>
      <title>Employee Detail Page</title>
      <meta
        name="description"
        content="Employee dashboard and management"
      />
    </Helmet>

    {pdfOpenForm && (
      <SalarySlipCard
        data={singlePayrolls}
        onClose={() => setPdfOpenForm(false)}
      />
    )}

    {/* ======================= TOP HEADER ======================= */}

    <div className="sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">

      <div className="px-6 lg:px-10 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

        <div className="flex items-center gap-5">

          <div className="relative">

            <img
              src={singleUserData?.profileImage}
              alt={singleUserData?.fullName}
              className="w-20 h-20 rounded-3xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
            />

            <div
              className={`
                absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white
                ${
                  singleUserData?.status === "ACTIVE"
                    ? "bg-emerald-500"
                    : singleUserData?.status === "RELIEVED"
                    ? "bg-red-500"
                    : "bg-amber-500"
                }
              `}
            />

          </div>

          <div>

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {singleUserData?.fullName}
              </h1>

              <span
                className={`
                  rounded-full px-3 py-1 text-xs font-semibold border
                  ${getStatusColorfromEmployee(singleUserData?.status)}
                `}
              >
                {singleUserData?.status}
              </span>

            </div>

            <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
              {singleUserData?.designation} •{" "}
              {singleUserData?.department?.name}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">

              <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                Employee ID: {singleUserData?.employeeId  || "N/A"}
              </div>

              <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                Joined: {formatDate(singleUserData?.joinDate)}
              </div>

              <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {singleUserData?.employeeType}
              </div>

            </div>

          </div>

        </div>

        <div className="flex flex-wrap gap-3">

          <button
            onClick={() => {
              setIsEditDialogOpen(true);
              setIsDialogOpen(true);
            }}
            className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-sm font-semibold transition-all"
          >
            Edit Profile
          </button>

          <button
            onClick={() => {
              showSalarySlip();
            }}
            className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all"
          >
            Salary Slips
          </button>

          <button
            disabled={singleUserData?.status === "RELIEVED"}
            onClick={() => {
              setRelieveEmployeeId(singleUserData?._id);
              setShowRelieve(true);
            }}
            className={`
              rounded-2xl px-5 py-3 text-sm font-semibold transition-all

              ${
                singleUserData?.status === "RELIEVED"
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            `}
          >
            {singleUserData?.status === "RELIEVED"
              ? "Employee Relieved"
              : "Relieve Employee"}
          </button>

        </div>

      </div>

    </div>

    {/* ======================= DIALOGS ======================= */}

    <EmployeeFormDialog
      open={isDialogOpen}
      onClose={() => {
        setIsDialogOpen(false);
      }}
      isEditMode={isEditDialogOpen}
      initialData={singleUserData}
      setEmployeeListRefresh={setEmployeeListRefresh}
      selectedDepartmentId=""
    />

    {showRelieve && (
      <RelieveEmployeeCard
        onClose={() => setShowRelieve(false)}
        employeeId={relieveEmployeeId}
        setRelieveEmployeeId={setRelieveEmployeeId}
        setEmployeeListRefresh={setEmployeeListRefresh}
      />
    )}

    {/* ======================= MAIN ======================= */}

    <div className="px-6 lg:px-10 py-8">

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">

        {/* ================= LEFT SIDEBAR ================= */}

        <div className="xl:col-span-4 space-y-7">

          {/* PROFILE DETAILS */}

          <div className="rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">

            <div className="p-7 border-b border-slate-100 dark:border-slate-800">

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Employee Information
              </h2>

            </div>

            <div className="p-7 space-y-5">

              {[
                {
                  label: "Email",
                  value: singleUserData?.email,
                },
                {
                  label: "Contact",
                  value: singleUserData?.contact,
                },
                {
                  label: "Blood Group",
                  value: singleUserData?.bloodGroup,
                },
                {
                  label: "Address",
                  value: singleUserData?.address,
                },
                {
                  label: "Date of Birth",
                  value: singleUserData?.dateOfBirth
                    ? new Date(
                        singleUserData?.dateOfBirth
                      ).toLocaleDateString("en-IN")
                    : "N/A",
                },
                {
                  label: "Monthly Salary",
                  value: `₹${singleUserData?.monthSalary?.toLocaleString()}`,
                },
                {
                  label: "LPA",
                  value: `${singleUserData?.lpa} LPA`,
                },
              ].map((item, index) => (

                <div
                  key={index}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4"
                >

                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {item.label}
                  </div>

                  <div className="text-sm font-semibold text-right text-slate-900 dark:text-white">
                    {item.value || "N/A"}
                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* LETTERS */}

          <div className="rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">

            <div className="p-7 border-b border-slate-100 dark:border-slate-800">

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Employee Letters
              </h2>

            </div>

            <div className="p-7 grid grid-cols-1 gap-4">

              {[
                {
                  type: "loi",
                  label: "Letter of Intent",
                },
                {
                  type: "offer",
                  label: "Offer Letter",
                },
                {
                  type: "fnf",
                  label: "FnF Letter",
                },
              ].map((item) => {

                const existingLetter =
                  allLetters?.find(
                    (letter: any) =>
                      letter.letterType === item.type
                  );

                return (
                  <div
                    key={item.type}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.label}
                        </p>

                        <p className="text-sm text-slate-500">
                          PDF Document
                        </p>

                      </div>

                      {existingLetter ? (

                        <button
                          onClick={() => {

                            window.open(
                              `${import.meta.env.VITE_API_URL}${existingLetter.pdfUrl}`,
                              "_blank"
                            );
                          }}
                          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-medium"
                        >
                          View
                        </button>

                      ) : (

                        <label className="cursor-pointer">

                          <div className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Upload
                          </div>

                          <input
                            hidden
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {

                              if (
                                e.target.files?.[0]
                              ) {

                                handleUploadLetter(
                                  e.target.files[0],
                                  item.type
                                );
                              }
                            }}
                          />

                        </label>

                      )}

                    </div>

                  </div>
                );
              })}

            </div>

          </div>

        </div>

        {/* ================= RIGHT CONTENT ================= */}

        <div className="xl:col-span-8 space-y-7">

          {/* ANALYTICS */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div className="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">

              <p className="text-sm text-slate-500">
                Attendance Records
              </p>

              <h2 className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
                {attendanceList?.length || 0}
              </h2>

              <p className="mt-2 text-sm text-emerald-600">
                Monthly attendance logs
              </p>

            </div>

            <div className="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">

              <p className="text-sm text-slate-500">
                Leave Requests
              </p>

              <h2 className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
                {leaveList?.length || 0}
              </h2>

              <p className="mt-2 text-sm text-orange-500">
                Applied leave history
              </p>

            </div>

            <div className="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">

              <p className="text-sm text-slate-500">
                Assigned Tasks
              </p>

              <h2 className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
                {tasks?.length || 0}
              </h2>

              <p className="mt-2 text-sm text-blue-600">
                Active workflow items
              </p>

            </div>

          </div>

          {/* ATTENDANCE */}

          <div className="rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">

            <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Attendance History
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Monthly attendance sessions
                </p>

              </div>

              <input
                type="month"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />

            </div>

            <div className="p-7">

              {attendanceList &&
              attendanceList.length > 0 ? (

                <div className="space-y-4">

                  {attendanceList.map(
                    (attendance, i) => (

                      <div
                        key={i}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                      >

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                          <div>

                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {attendance.status}
                            </h3>

                            <p className="text-sm text-slate-500 mt-1">
                              {formatDate(attendance.date)}
                            </p>

                          </div>

                          <div className="flex items-center gap-6 text-sm">

                            <div>

                              <p className="text-slate-400">
                                Clock In
                              </p>

                              <p className="font-semibold text-slate-900 dark:text-white">
                                {formatClock(
                                  attendance?.clockInTime
                                )}
                              </p>

                            </div>

                            <div>

                              <p className="text-slate-400">
                                Clock Out
                              </p>

                              <p className="font-semibold text-slate-900 dark:text-white">
                                {formatClock(
                                  attendance?.clockInTime
                                )}
                              </p>

                            </div>

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="h-40 flex items-center justify-center text-slate-400">
                  No attendance records found
                </div>

              )}

            </div>

          </div>

          {/* LEAVES */}

          <div className="rounded-[32px] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">

            <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Leave History
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Employee leave records
                </p>

              </div>

              <input
                type="month"
                value={leaveSelectedDate}
                onChange={(e) =>
                  setLeaveSelectedDate(e.target.value)
                }
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />

            </div>

            <div className="p-7">

              {Array.isArray(leaveList) &&
              leaveList.length > 0 ? (

                <div className="space-y-4">

                  {leaveList.map((leave) => (

                    <div
                      key={leave._id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
                    >

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                        <div>

                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {leave.leaveType?.name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {leave.description}
                          </p>

                        </div>

                        <div className="text-right">

                          <span
                            className={`
                              rounded-full px-3 py-1 text-xs font-semibold

                              ${
                                leave.status ===
                                "Approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : leave.status ===
                                    "Rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }
                            `}
                          >
                            {leave.status}
                          </span>

                          <p className="mt-3 text-sm text-slate-500">
                            {new Date(
                              leave.fromDate
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              leave.toDate
                            ).toLocaleDateString()}
                          </p>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              ) : (

                <div className="h-40 flex items-center justify-center text-slate-400">
                  No leave records found
                </div>

              )}

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
);
};

export default EmployeeDashboard;
