import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "@/lib/axios";
import {
  CalendarDays,
  PartyPopper,
} from "lucide-react";

const Holiday = () => {
  const [holidays, setHolidays] = useState<any[]>([]);

  // =========================
  // FETCH HOLIDAYS
  // =========================
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
       const res = await axios.get("api/holiday");

console.log("HOLIDAY API RESPONSE:", res.data);

const holidayData =
  Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.holidays)
    ? res.data.holidays
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];

setHolidays(holidayData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchHolidays();
  }, []);

  // =========================
  // FIND HOLIDAY
  // =========================
  const getHoliday = (date: Date) => {
    return holidays.find(
      (holiday) =>
        new Date(holiday.date).toDateString() ===
        date.toDateString()
    );
  };

  // =========================
  // MONTH CARD
  // =========================
  const renderCalendar = (monthIndex: number) => {
    const currentYear = new Date().getFullYear();

    const monthDate = new Date(
      currentYear,
      monthIndex,
      1
    );

    return (
      <div
        key={monthIndex}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b bg-white  ">
          <h2 className="text-xl font-bold text-black">
            {monthDate.toLocaleString("default", {
              month: "long",
            })}
          </h2>
        </div>

        {/* CALENDAR */}
        <div className="p-4 employee-calendar">
          <Calendar
            activeStartDate={monthDate}
            view="month"
            showNavigation={false}
            calendarType="gregory"

            // ONLY CURRENT MONTH
            tileDisabled={({ date, view }) =>
              view === "month" &&
              date.getMonth() !== monthIndex
            }

            // CUSTOM STYLE
            tileClassName={({ date, view }) => {
              if (view !== "month") return "";

              const holiday = getHoliday(date);

              // HOLIDAY
              if (holiday) {
                return "holiday-tile";
              }

              // SUNDAY
              if (date.getDay() === 0) {
                return "sunday-tile";
              }

              return "normal-tile";
            }}

            // HOLIDAY MARK
            tileContent={({ date, view }) => {
              if (view !== "month") return null;

              const holiday = getHoliday(date);

              if (!holiday) return null;

              return (
                <div
                  className="holiday-dot"
                  title={`${holiday.name} • ${holiday.remark}`}
                >
                  🎉
                </div>
              );
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] p-6">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <CalendarDays
            size={30}
            className="text-blue-600"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Company Holidays
          </h1>

          <p className="text-gray-500 mt-1">
            View all company holidays & events
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {/* TOTAL */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Holidays
          </p>

          <h2 className="text-3xl font-bold mt-2 text-gray-900">
            {holidays.length}
          </h2>
        </div>

        {/* SUNDAY */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Weekly Off
          </p>

          <h2 className="text-2xl font-bold mt-2 text-red-500">
            Sundays
          </h2>
        </div>

        {/* YEAR */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Calendar Year
          </p>

          <h2 className="text-3xl font-bold mt-2 text-blue-600">
            {new Date().getFullYear()}
          </h2>
        </div>
      </div>

      {/* HOLIDAY LIST */}
      {!!holidays.length && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <PartyPopper className="text-green-600" />

            <h2 className="text-xl font-bold text-gray-900">
              Upcoming Holidays
            </h2>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {holidays.map((holiday) => (
              <div
                key={holiday._id}
                className="border border-gray-200 rounded-2xl p-5 hover:border-green-300 hover:bg-green-50 transition"
              >
                <h3 className="font-semibold text-lg text-gray-800">
                  {holiday.name}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {new Date(
                    holiday.date
                  ).toDateString()}
                </p>

                {holiday.remark && (
                  <p className="mt-3 text-gray-700 text-sm leading-6">
                    {holiday.remark}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDAR GRID */}
      <div className="grid 2xl:grid-cols-4 xl:grid-cols-3 md:grid-cols-2 gap-6">
        {[...Array(12)].map((_, i) =>
          renderCalendar(i)
        )}
      </div>

      {/* CUSTOM CSS */}
      <style>{`
        .employee-calendar .react-calendar {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
        }

        .employee-calendar .react-calendar__month-view__weekdays {
          margin-bottom: 10px;
        }

        .employee-calendar .react-calendar__month-view__weekdays__weekday {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .employee-calendar .react-calendar__tile {
          padding: 5px;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 500;
          background: transparent;
          transition: all 0.2s ease;
          position: relative;
        }

        .employee-calendar .react-calendar__tile:enabled:hover {
          background: #eff6ff;
        }

        .employee-calendar .react-calendar__tile--now {
          background: #dbeafe !important;
          color: #1d4ed8;
          font-weight: 700;
        }

        .employee-calendar .react-calendar__tile--active {
          background: #2563eb !important;
          color: white !important;
        }

        .normal-tile {
          color: #111827;
        }

        .sunday-tile {
          color: #ef4444 !important;
          font-weight: 600;
        }

        .holiday-tile {
          background: #10b981 !important;
          color: white !important;
          font-weight: 700 !important;
        }

        .holiday-dot {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
        }

        .employee-calendar .react-calendar__tile:disabled {
          background: transparent !important;
          opacity: 0.15;
        }

        .employee-calendar abbr {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default Holiday;