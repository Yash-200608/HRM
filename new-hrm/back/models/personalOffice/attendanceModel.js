const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
attendanceDate: {
  type: Date,
  required: true,
},
  clockInTime: {
    type: Date,
    default: null,
  },

  clockOutTime: {
    type: Date,
    default: null,
  },

  hoursWorked: {
    type: Number,
    default: 0,
  },

  overtime: {
    type: Number,
    default: 0,
  },

  status: {
    type: String,
    enum: [
      "Clocked In",
    "Working",
    "Absent",
    "Half Day",
    "Present",
    "Overtime",
    "Holiday",
    ],
    default: "Absent",
  },

  isLate: {
    type: Boolean,
    default: false,
  },

  notes: {
    type: String,
    default: "",
  },
},
{
  timestamps: true,
}
);

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);