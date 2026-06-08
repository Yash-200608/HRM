import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  Briefcase,
  Wallet,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  getEmployeebyId,
  getAttendanceById,
  getSingleleaveRequestsByDate,
  getSinglePayRoll,
} from "@/services/Service";
import {
  getEmployeeLetter,
} from "@/services/Service";

const MyAccount = () => {
  const { user } = useAuth();
const [allLetter, setAllLetter] = useState<any[]>([]);
const [previewDoc, setPreviewDoc] = useState<any>(null);
const [isPreview, setIsPreview] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const employeeId = user?._id;
  const companyId = user?.createdBy?._id; 


  const formatDate = (d: any) =>
    d ? new Date(d).toLocaleDateString("en-IN") : "--";
const formatTime = (time: any) => {
  if (!time) return "--";

  return new Date(time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!employeeId || !companyId) return;

        // 🔥 PROFILE (same as admin)
        const emp = await getEmployeebyId(employeeId, companyId);
        setProfile(emp?.employee || null);

        // 🔥 CURRENT MONTH
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // 🔥 PARALLEL API CALLS
       const [att, lev, pay, letters] = await Promise.all([
  getAttendanceById(employeeId, month, year, companyId),
  getSingleleaveRequestsByDate(employeeId, companyId, month, year),
  getSinglePayRoll(employeeId, companyId),
  getEmployeeLetter(employeeId),
]);

setAllLetter(letters?.letters || []);
        setAttendance(att?.data?.records || []);
        setLeaves(lev?.data?.requests || []);
        setPayrolls(pay || []);
      } catch (err) {
        console.error("PROFILE ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div>No profile found</div>;
console.log("ATTENDANCE =>", attendance);
 return (
  <>
    <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-8">

      {/* TOP HEADER */}

      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
            Employee Workspace
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            My Account
          </h1>

          <p className="mt-3 max-w-2xl text-base text-slate-500">
            Manage your attendance, payroll, company letters, leave records and documents.
          </p>

        </div>

        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

          <div className="rounded-2xl bg-emerald-100 p-3">
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>

          <div>

            <p className="text-xs uppercase tracking-widest text-slate-400">
              Employee Status
            </p>

            <p className="font-semibold text-slate-900">
              Active Employee
            </p>

          </div>

        </div>

      </div>

      {/* HERO PROFILE */}

      <div
        className="
        relative
        overflow-hidden
        rounded-[36px]
        border
        border-slate-200
        bg-gradient-to-br
        from-slate-950
        via-slate-900
        to-blue-950
        p-8
        text-white
        shadow-2xl
        "
      >

        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">

          {/* LEFT */}

          <div className="flex flex-col gap-6 md:flex-row md:items-center">

            <div className="relative">

              <img
                src={profile.profileImage || "/default.png"}
                alt="profile"
                className="
                h-32
                w-32
                rounded-[32px]
                border-4
                border-white/10
                object-cover
                shadow-2xl
                "
              />

              <div className="absolute -bottom-2 -right-2 rounded-2xl border border-white/10 bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                ACTIVE
              </div>

            </div>

            <div>

              <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm text-slate-200 backdrop-blur-xl">
                Smart HRMS Workspace
              </div>

              <h2 className="text-5xl font-black tracking-tight">
                {profile.fullName}
              </h2>

              <p className="mt-2 text-xl text-slate-300">
                {profile.designation}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {profile.department?.name}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

<div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
  Employee ID: {profile.employeeId || "--"}
</div>



                <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
                  <Phone className="h-4 w-4" />
                  {profile.contact}
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
  Blood Group: {profile.bloodGroup || "--"}
</div>

    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
      <span className="">
        Address :
      </span>

      <span className="">
        {profile.address || "--"}
      </span>
    </div>

                <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(profile.joinDate)}
                </div>


              </div>

            </div>

          </div>

          {/* RIGHT STATS */}

          <div className="grid grid-cols-2 gap-4 xl:min-w-[260px]">

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">

              <p className="text-sm text-slate-300">
                Attendance
              </p>

              <h3 className="mt-3 text-4xl font-black">
                {attendance?.length || 0}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Records
              </p>

            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">

              <p className="text-sm text-slate-300">
                Leaves
              </p>

              <h3 className="mt-3 text-4xl font-black">
                {leaves?.length || 0}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Requests
              </p>

            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">

              <p className="text-sm text-slate-300">
                Payroll
              </p>

              <h3 className="mt-3 text-4xl font-black">
                {payrolls?.length || 0}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Slips
              </p>

            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">

              <p className="text-sm text-slate-300">
                Documents
              </p>

              <h3 className="mt-3 text-4xl font-black">
                {Object.values(profile?.documents || {})?.filter(Boolean)?.length}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Uploaded
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* QUICK ACTIONS */}

      <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">

        <div className="mb-6 flex items-center justify-between">

          <div>

            <h3 className="text-2xl font-black text-slate-900">
              Quick Actions
            </h3>

            <p className="mt-1 text-slate-500">
              Access important employee documents instantly.
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          {["loi", "offer", "fnf"]?.map((type) => {

            const labelMap: any = {
              loi: "Letter Of Intent",
              offer: "Offer Letter",
              fnf: "FnF Letter",
            };

            const existingLetter = allLetter?.find(
              (letter: any) => letter.letterType === type
            );

            return existingLetter ? (

              <button
                key={type}
                onClick={() => {

                  if (existingLetter?.pdfUrl) {

                    setPreviewDoc({
                      name: existingLetter?.letterType,
                      url: `${import.meta.env.VITE_API_URL}${existingLetter?.pdfUrl}`,
                      type: "pdf",
                    });

                    setIsPreview(true);
                    return;
                  }

                  if (existingLetter?.pdfData) {

                    const blob = new Blob(
                      [
                        Uint8Array.from(
                          atob(existingLetter.pdfData),
                          (c) => c.charCodeAt(0)
                        ),
                      ],
                      {
                        type: "application/pdf",
                      }
                    );

                    const url = URL.createObjectURL(blob);

                    setPreviewDoc({
                      name: existingLetter?.letterType,
                      url,
                      type: "pdf",
                    });

                    setIsPreview(true);
                  }
                }}
                className="
                group
                rounded-[28px]
                border
                border-slate-200
                bg-slate-50
                p-6
                text-left
                transition-all
                hover:-translate-y-1
                hover:border-blue-200
                hover:bg-blue-50
                hover:shadow-xl
                "
              >

                <div className="mb-5 inline-flex rounded-2xl bg-blue-100 p-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>

                <h4 className="text-lg font-bold text-slate-900">
                  {labelMap[type]}
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  View official company document.
                </p>

                <div className="mt-5 text-sm font-semibold text-blue-600">
                  Open Document →
                </div>

              </button>

            ) : (

              <div
                key={type}
                className="
                rounded-[28px]
                border
                border-dashed
                border-slate-200
                bg-slate-50
                p-6
                opacity-70
                "
              >

                <div className="mb-5 inline-flex rounded-2xl bg-slate-200 p-4">
                  <FileText className="h-6 w-6 text-slate-500" />
                </div>

                <h4 className="text-lg font-bold text-slate-700">
                  {labelMap[type]}
                </h4>

                <p className="mt-2 text-sm text-slate-400">
                  Not available yet.
                </p>

              </div>

            );
          })}

          {/* SALARY */}

          <button
            className="
            rounded-[28px]
            border
            border-emerald-200
            bg-gradient-to-br
            from-emerald-500
            to-emerald-600
            p-6
            text-left
            text-white
            shadow-lg
            transition-all
            hover:-translate-y-1
            hover:shadow-2xl
            "
          >

            <div className="mb-5 inline-flex rounded-2xl bg-white/20 p-4">
              <Wallet className="h-6 w-6" />
            </div>

            <h4 className="text-lg font-bold">
              Salary Slips
            </h4>

            <p className="mt-2 text-sm text-emerald-100">
              Access all payroll records.
            </p>

            <div className="mt-5 text-sm font-semibold">
              View Salary →
            </div>

          </button>

        </div>

      </div>

      {/* MAIN GRID */}

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">

        {/* ATTENDANCE */}

        <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <h3 className="text-2xl font-black text-slate-900">
                Attendance
              </h3>

              <p className="mt-1 text-slate-500">
                Recent work session records.
              </p>

            </div>

            <div className="rounded-2xl bg-blue-100 p-3">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>

          </div>

          <div className="space-y-4">

            {attendance.length ? (

              attendance.map((a, i) => (

                <div
                  key={i}
                  className="
                  flex
                  items-center
                  justify-between
                  rounded-3xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-5
                  transition-all
                  hover:border-blue-100
                  hover:bg-blue-50
                  "
                >

                  <div>

                    <p className="font-semibold text-slate-900">
                      {formatDate(a.attendanceDate)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                     {formatTime(a.clockInTime || a.clockInTime)} → {formatTime(a.clockOutTime || a.clockOutTime)}
                    </p>

                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-bold ${
                      a.status === "Clock In"
                        ? "bg-emerald-100 text-emerald-600"
                        : a.status === "Clock Out"
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {a.status}
                  </span>

                </div>

              ))

            ) : (

              <div className="rounded-3xl bg-slate-50 p-10 text-center text-slate-400">
                No attendance data
              </div>

            )}

          </div>

        </div>

        {/* LEAVES */}

        <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <h3 className="text-2xl font-black text-slate-900">
                Leave Requests
              </h3>

              <p className="mt-1 text-slate-500">
                Leave application history.
              </p>

            </div>

            <div className="rounded-2xl bg-emerald-100 p-3">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>

          </div>

          <div className="space-y-4">

            {leaves.length ? (

              leaves.map((l) => (

                <div
                  key={l._id}
                  className="
                  flex
                  items-center
                  justify-between
                  rounded-3xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-5
                  transition-all
                  hover:border-emerald-100
                  hover:bg-emerald-50
                  "
                >

                  <div>

                    <p className="font-semibold text-slate-900">
                      {l.leaveType?.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(l.fromDate)}
                    </p>

                  </div>

                  <span
                    className="
                    rounded-full
                    bg-emerald-100
                    px-4
                    py-2
                    text-xs
                    font-bold
                    text-emerald-600
                    "
                  >
                    {l.status}
                  </span>

                </div>

              ))

            ) : (

              <div className="rounded-3xl bg-slate-50 p-10 text-center text-slate-400">
                No leaves found
              </div>

            )}

          </div>

        </div>

        {/* PAYROLL */}

        <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <h3 className="text-2xl font-black text-slate-900">
                Payroll
              </h3>

              <p className="mt-1 text-slate-500">
                Monthly salary summaries.
              </p>

            </div>

            <div className="rounded-2xl bg-yellow-100 p-3">
              <Wallet className="h-5 w-5 text-yellow-600" />
            </div>

          </div>

          <div className="space-y-4">

            {payrolls.length ? (

              payrolls.map((p, i) => (

                <div
                  key={i}
                  className="
                  flex
                  items-center
                  justify-between
                  rounded-3xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-5
                  "
                >

                  <div>

                    <p className="font-semibold text-slate-900">
                      {p.month}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Payroll Generated
                    </p>

                  </div>

                  <h4 className="text-2xl font-black text-slate-900">
                    ₹{p.netSalary || "--"}
                  </h4>

                </div>

              ))

            ) : (

              <div className="rounded-3xl bg-slate-50 p-10 text-center text-slate-400">
                No salary data
              </div>

            )}

          </div>

        </div>

        {/* DOCUMENTS */}

        <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <h3 className="text-2xl font-black text-slate-900">
                Documents
              </h3>

              <p className="mt-1 text-slate-500">
                Employee verification records.
              </p>

            </div>

            <div className="rounded-2xl bg-purple-100 p-3">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>

          </div>

          <div className="space-y-4">

            {Object.entries(profile?.documents || {}).map(([k, v]: any) => (

              <div
                key={k}
                className="
                flex
                items-center
                justify-between
                rounded-3xl
                border
                border-slate-100
                bg-slate-50
                p-5
                "
              >

                <div>

                  <p className="font-semibold capitalize text-slate-900">
                    {k}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Company Document Verification
                  </p>

                </div>

                <span
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
                    v
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {v ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}

                  {v ? "Uploaded" : "Missing"}

                </span>

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* PDF PREVIEW */}

      {isPreview && previewDoc && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 p-5">

              <div>

                <h2 className="text-2xl font-black capitalize text-slate-900">
                  {previewDoc?.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Employee document preview
                </p>

              </div>

              <button
                onClick={() => {
                  setIsPreview(false);
                  setPreviewDoc(null);
                }}
                className="
                rounded-2xl
                bg-red-500
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition-all
                hover:bg-red-600
                "
              >
                Close
              </button>

            </div>

            <iframe
              src={previewDoc?.url}
              title="PDF Preview"
              className="h-[calc(92vh-88px)] w-full"
            />

          </div>

        </div>

      )}

    </div>
  </>
);
};

export default MyAccount;