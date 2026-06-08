const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    // Employee reference (best practice)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // ya "User" jo bhi tumhara model ho
      required: true,
    },

    // Leave Type reference
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leave", // Leave master model
      required: true,
    },

    createdBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Company",
              required: true,
            },

    // Leave status
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // Leave duration
    fromDate: {
      type: Date,
      required: true,
    },

    toDate: {
      type: Date,
      required: true,
    },

    // Total leave days (optional but recommended)
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },

    // Reason / description
    description: {
      type: String,
      trim: true,
    },

    appliedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

module.exports = { LeaveRequest };
