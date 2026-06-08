const mongoose = require("mongoose");

const employeeHistorySchema = new mongoose.Schema(
  {
    // Reference to Employee
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    // What kind of change happened
    eventType: {
      type: String,
      enum: [
        "SALARY_CHANGE",
        "DOCUMENT_UPDATE",
        "RELIEVED",
        "PROMOTION",
        "DEPARTMENT_CHANGE",
        "PROFILE_UPDATE",
      ],
      required: true,
      index: true,
    },

    // Old vs New data snapshot
    oldData: {
      type: mongoose.Schema.Types.Mixed, // flexible
      default: {},
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Effective date (salary increase date etc.)
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },

    // Optional notes
    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    // Who made the change (admin / HR)
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company", // ya Admin
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Helpful indexes
employeeHistorySchema.index({ employeeId: 1, createdAt: -1 });

const EmployeeHistory = mongoose.model(
  "EmployeeHistory",
  employeeHistorySchema
);

module.exports = { EmployeeHistory };
