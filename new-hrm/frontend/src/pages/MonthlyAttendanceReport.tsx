import React, { useEffect, useState } from "react";

import {
  Search,
  Download,
  Calendar,
} from "lucide-react";

import { getMonthlyAttendanceReport } from "@/services/monthlyAttendanceService";

const MonthlyAttendanceReport = () => {

  const [loading, setLoading] =
    useState(false);

  const [report, setReport] =
    useState<any[]>([]);

  const [summary, setSummary] =
    useState({
      present: 0,
      absent: 0,
      halfDay: 0,
      overtime: 0,
      holidays: 0,
      clockedIn: 0,
      late: 0,
    });

  const [daysInMonth, setDaysInMonth] =
    useState(31);

  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [search, setSearch] =
    useState("");

  // =========================================
  // FETCH REPORT
  // =========================================

  const fetchReport = async () => {

    try {

      setLoading(true);

      const res =
        await getMonthlyAttendanceReport({
          month,
        });

      setReport(res.data.rows || []);

      setSummary(
        res.data.summary || {
          present: 0,
          absent: 0,
          halfDay: 0,
          overtime: 0,
          holidays: 0,
          late: 0,
        }
      );

      setDaysInMonth(
        res.data.daysInMonth || 31
      );

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {

    fetchReport();

  }, [month]);

  // =========================================
  // FILTERED DATA
  // =========================================

  const filteredReport = (
    Array.isArray(report)
      ? report
      : []
  ).filter((item) =>
    item.employeeName
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  // =========================================
  // STATUS COLORS
  // =========================================

  const getStatusStyle = (
    status: string
  ) => {

    switch (status) {

      case "Present":
        return "bg-green-500 text-white";

      case "Absent":
        return "bg-red-500 text-white";

      case "Half Day":
        return "bg-yellow-500 text-white";

      case "Overtime":
        return "bg-blue-500 text-white";

      case "Holiday":
        return "bg-cyan-500 text-white";

      case "Working":
        return "bg-purple-500 text-white";

      case "Clocked In":
        return "bg-cyan-500 text-white";

      default:
        return "bg-gray-200 text-black";
    }
  };

  // =========================================
  // SHORT STATUS
  // =========================================

  const getShortStatus = (
    status: string
  ) => {

    switch (status) {

      case "Present":
        return "P";

      case "Absent":
        return "A";

      case "Half Day":
        return "H";

      case "Overtime":
        return "OT";

      case "Holiday":
        return "HOL";

      case "Working":
        return "W";

      case "Clocked In":
        return "CI";

      default:
        return "-";
    }
  };

  // =========================================
  // EXPORT CSV
  // =========================================

  const exportCSV = () => {

    let csv =
      "Employee,Department,";

    for (
      let i = 1;
      i <= daysInMonth;
      i++
    ) {

      csv += `${i},`;

    }

    csv += "\n";

    filteredReport.forEach((row) => {

      csv += `${row.employeeName},${row.department},`;

      for (
        let i = 1;
        i <= daysInMonth;
        i++
      ) {

        csv += `${
          row.days[i]?.status || "-"
        },`;

      }

      csv += "\n";
    });

    const blob = new Blob([csv], {
      type: "text/csv",
    });

    const url =
      window.URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `attendance-${month}.csv`;

    a.click();
  };

  // =========================================
  // ROW SUMMARY
  // =========================================

  const getRowCount = (
    row: any,
    status: string
  ) => {

    return Object.values(row.days).filter(
      (d: any) =>
        d?.status === status
    ).length;
  };

  const getLateCount = (row: any) => {

    return Object.values(row.days).filter(
      (d: any) => d?.isLate
    ).length;
  };

  console.log(filteredReport)

  return (
    <div className="p-6">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-3xl font-bold">
            Monthly Attendance
          </h1>

          <p className="text-gray-500">
            Team attendance analytics
          </p>

        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
        >
          <Download size={18} />

          Export CSV
        </button>
      </div>

      {/* ================================= */}
      {/* FILTERS */}
      {/* ================================= */}

      <div className="bg-white border rounded-xl p-5 mb-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* MONTH */}

          <div>

            <label className="text-sm font-medium">
              Month
            </label>

            <div className="relative mt-1">

              <Calendar
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                type="month"
                value={month}
                onChange={(e) =>
                  setMonth(
                    e.target.value
                  )
                }
                className="w-full border rounded-lg pl-10 pr-3 py-2"
              />
            </div>
          </div>

          {/* SEARCH */}

          <div>

            <label className="text-sm font-medium">
              Employee
            </label>

            <div className="relative mt-1">

              <Search
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                className="w-full border rounded-lg pl-10 pr-3 py-2"
              />
            </div>
          </div>

          {/* REFRESH */}

          <div className="flex items-end">

            <button
              onClick={fetchReport}
              className="w-full bg-blue-600 text-white rounded-lg py-2"
            >
              Refresh
            </button>

          </div>
        </div>
      </div>

      {/* ================================= */}
      {/* SUMMARY */}
      {/* ================================= */}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-gray-500 text-sm">
            Present
          </h2>

          <p className="text-2xl font-bold text-green-600">
            {summary.present}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-gray-500 text-sm">
            Absent
          </h2>

          <p className="text-2xl font-bold text-red-600">
            {summary.absent}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-gray-500 text-sm">
            Half Day
          </h2>

          <p className="text-2xl font-bold text-yellow-600">
            {summary.halfDay}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-gray-500 text-sm">
            Overtime
          </h2>

          <p className="text-2xl font-bold text-blue-600">
            {summary.overtime}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-gray-500 text-sm">
            Holidays
          </h2>

          <p className="text-2xl font-bold text-cyan-600">
            {summary.holidays}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-gray-500 text-sm">
            Late
          </h2>

          <p className="text-2xl font-bold text-orange-600">
            {summary.late}
          </p>
        </div>
      </div>

      {/* ================================= */}
      {/* TABLE */}
      {/* ================================= */}

      <div className="bg-white border rounded-xl overflow-auto">

        <table className="min-w-full border-collapse">

          <thead className="bg-gray-100 sticky top-0 z-10">

            <tr>

              <th className=" sticky
    left-0
    z-30
    bg-white
    min-w-[220px]
">
                Employee
              </th>

              <th className="p-3 border text-left">
                Department
              </th>

              {Array.from(
                {
                  length: daysInMonth,
                },
                (_, i) => (
                  <th
                    key={i}
                    className="p-2 border text-center min-w-[70px]"
                  >
                    {i + 1}
                  </th>
                )
              )}

              <th className="p-3 border">
                P
              </th>

              <th className="p-3 border">
                A
              </th>

              <th className="p-3 border">
                H
              </th>

              <th className="p-3 border">
                OT
              </th>

              <th className="p-3 border">
                Late
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredReport.map(
              (row, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50"
                >

                  {/* EMPLOYEE */}

                  <td className="p-3 border  whitespace-nowrap sticky
    left-0
    z-30
    bg-white
    min-w-[220px]
">

                    <div className="font-semibold">
                      {row.employeeName}
                    </div>


                  </td>

                  {/* DEPARTMENT */}

                  <td className="p-3 border whitespace-nowrap">
                    {row.department}
                  </td>

                  {/* DAYS */}

                  {Array.from(
                    {
                      length:
                        daysInMonth,
                    },
                    (_, i) => {

                      const data =
                        row.days[
                          i + 1
                        ];

                      return (
                        <td
                          key={i}
                          className="p-2 border text-center"
                        >

                          <div className="relative group">

  <div
    className={`text-xs px-2 py-1 rounded-md inline-block font-semibold cursor-pointer ${getStatusStyle(
      data?.status
    )}`}
  >
    {getShortStatus(data?.status)}
  </div>

  {/* Hover Tooltip */}

  {data && (
    <div
      className="
      invisible
      group-hover:visible
      opacity-0
      group-hover:opacity-100
      transition-all
      duration-200
      absolute
      z-50
      left-1/2
      -translate-x-1/2
      top-full
      mt-2
      w-56
      rounded-xl
      bg-slate-900
      text-white
      text-xs
      p-3
      shadow-xl
      "
    >
      <div className="space-y-1">

        <div>
          <strong>Status:</strong> {data.status || "--"}
        </div>

        <div>
          <strong>Clock In:</strong>{" "}
          {data.clockInTime
            ? new Date(data.clockInTime).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "--"}
        </div>

        <div>
          <strong>Clock Out:</strong>{" "}
          {data.clockOutTime
            ? new Date(data.clockOutTime).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "--"}
        </div>

        <div>
          <strong>Hours:</strong>{" "}
          {data.hoursWorked || "0h"}
        </div>

        <div>
          <strong>Overtime:</strong>{" "}
          {data.overtime || "0h"}
        </div>

        <div>
          <strong>Late:</strong>{" "}
          {data.isLate ? "Yes" : "No"}
        </div>

      </div>
    </div>
  )}

</div>

                          {data?.isLate && (
                            <div className="text-[10px] text-orange-600 mt-1">
                              Late
                            </div>
                          )}

                        </td>
                      );
                    }
                  )}

                  {/* SUMMARY */}

                  <td className="p-3 border text-center font-semibold text-green-600">
                    {getRowCount(
                      row,
                      "Present"
                    )}
                  </td>

                  <td className="p-3 border text-center font-semibold text-red-600">
                    {getRowCount(
                      row,
                      "Absent"
                    )}
                  </td>

                  <td className="p-3 border text-center font-semibold text-yellow-600">
                    {getRowCount(
                      row,
                      "Half Day"
                    )}
                  </td>

                  <td className="p-3 border text-center font-semibold text-blue-600">
                    {getRowCount(
                      row,
                      "Overtime"
                    )}
                  </td>

                  <td className="p-3 border text-center font-semibold text-orange-600">
                    {getLateCount(
                      row
                    )}
                  </td>

                </tr>
              )
            )}

          </tbody>
        </table>

        {/* EMPTY */}

        {!loading &&
          filteredReport.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              No attendance data found
            </div>
          )}

        {/* LOADING */}

        {loading && (
          <div className="p-10 text-center">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyAttendanceReport;