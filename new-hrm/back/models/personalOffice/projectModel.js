const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    /** Company & Admin reference */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
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

    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    /** ✅ SubTasks reference */
    subTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubTask",
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

/** Useful compound index */
projectSchema.index({ companyId: 1, name: 1 });

module.exports = mongoose.model("Project", projectSchema);
