import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "@/lib/axios";
import {
  CalendarDays,
  Plus,
  X,
  Trash2,
} from "lucide-react";

const HolidayManagement = () => {
 const [holidays, setHolidays] = useState<any[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<Date | null>(null);

  const [showModal, setShowModal] = useState(false);

  const [holidayName, setHolidayName] = useState("");
  const [remark, setRemark] = useState("");

  const [loading, setLoading] = useState(false);

  const year = new Date().getFullYear();

  // =========================
  // FETCH
  // =========================
  const fetchHolidays = async () => {
    try {
     const res = await axios.get("api/holiday");


const holidayData = Array.isArray(res.data)
  ? res.data
  : Array.isArray(res.data?.data)
  ? res.data.data
  : [];

setHolidays(holidayData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // =========================
  // OPEN MODAL
  // =========================
  const openModal = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  // =========================
  // ADD HOLIDAY
  // =========================
  const addHoliday = async () => {
    if (!holidayName || !selectedDate) {
      return alert("Holiday name required");
    }

    try {
      setLoading(true);

      await axios.post("api/holiday", {
        name: holidayName,
        date: selectedDate,
        remark,
      });

      await fetchHolidays();

      setHolidayName("");
      setRemark("");
      setShowModal(false);
    } catch (err: any) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
          "Failed to create holiday"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteHoliday = async (id: string) => {
    try {
      await axios.delete(`api/holiday/${id}`);

      fetchHolidays();
    } catch (err) {
      console.error(err);
    }
  };

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
    const monthDate = new Date(year, monthIndex, 1);

    return (
      <div
        key={monthIndex}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
      >
        {/* MONTH */}
        <div className="px-5 py-4 border-b bg-white">
          <h2 className="font-semibold text-gray-800 text-lg">
            {monthDate.toLocaleString("default", {
              month: "long",
            })}
          </h2>
        </div>

        {/* CALENDAR */}
        <div className="p-4 holiday-calendar">
          <Calendar
            activeStartDate={monthDate}
            view="month"
            showNavigation={false}
            onClickDay={openModal}
            calendarType="gregory"

            // ONLY CURRENT MONTH
            tileDisabled={({ date, view }) =>
              view === "month" &&
              date.getMonth() !== monthIndex
            }

            // TILE CLASS
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

            // TOOLTIP
            tileContent={({ date, view }) => {
              if (view !== "month") return null;

              const holiday = getHoliday(date);

              if (!holiday) return null;

              return (
                <div
                  className="holiday-tooltip"
                  title={`${holiday.name} • ${holiday.remark}`}
                >
                  <span>•</span>
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
        <div className="bg-blue-100 p-3 rounded-xl">
          <CalendarDays
            size={28}
            className="text-blue-600"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Holiday Management
          </h1>

          <p className="text-gray-500 mt-1">
            Manage yearly company holidays
          </p>
        </div>
      </div>

      {/* TOP INFO */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8 shadow-sm">
        <div className="flex flex-wrap gap-5 items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg text-gray-800">
              {year} Company Holiday Calendar
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Click any date to add holiday
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>

              <span className="text-gray-700">
                Holiday
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>

              <span className="text-gray-700">
                Sunday
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CALENDARS */}
      <div className="grid 2xl:grid-cols-4 xl:grid-cols-3 md:grid-cols-2 gap-6">
        {[...Array(12)].map((_, i) =>
          renderCalendar(i)
        )}
      </div>

      {/* HOLIDAY LIST */}
      {Array.isArray(holidays) && holidays.length > 0 && (
        <div className="mt-10 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Added Holidays
          </h2>

          <div className="space-y-4">
            {holidays.map((holiday) => (
              <div
                key={holiday._id}
                className="border border-gray-200 rounded-xl p-5 flex justify-between gap-4 hover:border-blue-200 transition"
              >
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    {holiday.name}
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
                    {new Date(
                      holiday.date
                    ).toDateString()}
                  </p>

                  {holiday.remark && (
                    <p className="text-gray-700 mt-3">
                      {holiday.remark}
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    deleteHoliday(holiday._id)
                  }
                  className="h-fit bg-red-50 hover:bg-red-100 text-red-600 p-3 rounded-xl transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* HEADER */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Add Holiday
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedDate?.toDateString()}
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Holiday Name
                </label>

                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) =>
                    setHolidayName(e.target.value)
                  }
                  placeholder="Ex: Diwali"
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark
                </label>

                <textarea
                  rows={4}
                  value={remark}
                  onChange={(e) =>
                    setRemark(e.target.value)
                  }
                  placeholder="Optional note..."
                  className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 h-11 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={addHoliday}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 h-11 rounded-xl transition flex items-center gap-2"
                >
                  <Plus size={18} />

                  {loading
                    ? "Adding..."
                    : "Add Holiday"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CSS */}
      <style>{`
        .holiday-calendar .react-calendar {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
        }

        .holiday-calendar .react-calendar__month-view__weekdays {
          margin-bottom: 10px;
        }

        .holiday-calendar .react-calendar__month-view__weekdays__weekday {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .holiday-calendar .react-calendar__tile {
          border-radius: 5px;
          font-size: 14px;
          font-weight: 500;
          background: transparent;
          transition: all 0.2s ease;
          position: relative;
          padding:5px;
        }

        .holiday-calendar .react-calendar__tile:enabled:hover {
          background: #eff6ff;
        }

        .holiday-calendar .react-calendar__tile--now {
          background: #dbeafe !important;
          color: #1d4ed8;
          font-weight: 700;
        }

        .holiday-calendar .react-calendar__tile--active {
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

        .holiday-tooltip {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: white;
        }

        .holiday-calendar .react-calendar__tile:disabled {
          background: transparent !important;
          opacity: 0.15;
        }

        .holiday-calendar abbr {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default HolidayManagement;