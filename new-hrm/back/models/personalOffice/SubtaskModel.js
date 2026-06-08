const mongoose = require("mongoose");

const subTaskSchema = new mongoose.Schema(
  {
    /** Company & Admin reference */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    //  🔥 refPath use karo (Dynamic Reference)  y dynamic reference hai jo multiple model ko handle karta hai
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "createdByRole",
    },

    createdByRole: {
      type: String,
      enum: ["Admin", "Employee"],
      required: true,
    },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    // jisko y sub task assign hua hai ya mila hai uski id
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    /** Project Details */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
    },

    /** Dates */
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    /** Priority */
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    /** Status (future ready) */
    status: {
      type: String,
      enum: ["active", "completed", "pending", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

/** Useful compound index */
subTaskSchema.index({ companyId: 1, name: 1 });

module.exports = mongoose.model("SubTask", subTaskSchema);
