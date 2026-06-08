import React from "react";

const EmployeeAttendanceCalendar = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-2xl font-bold mb-6">April 2026 Attendance</h2>

      <div className="grid grid-cols-7 gap-3 text-center font-semibold mb-3">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => (
          <div
            key={day}
            className="border rounded-xl min-h-[95px] p-2 bg-green-50"
          >
            <div className="font-bold">{day}</div>
            <div className="text-green-600 text-sm mt-2">Present</div>
            <div className="text-xs text-gray-500">09:15 AM</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeAttendanceCalendar;