
const mongoose = require("mongoose");

// Employee Schema
const employeeSchema = new mongoose.Schema(
  {
    // Basic Info
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      default: "employee"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
  type: String,
  trim: true,
  default: "",
},

address: {
  type: String,
  trim: true,
  default: "",
},

bloodGroup: {
  type: String,
  trim: true,
  default: "",
},

    // Work Info
    // department: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    roleResponsibility: {
      type: String,
      trim: true,
      default: "",
    },

    // Employee Type & Status
    employeeType: {
      type: String,
      enum: ["permanent", "contract", "intern"],
      default: "permanent",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "RELIEVED", "ON_HOLD"],
      default: "ACTIVE",
      index: true,
    },
    //  join date  jab ki hogi usi din s status active hoga varna on hold hoga
    // Dates
    joinDate: {
      type: Date,
      required: true,
    },

    dateOfBirth: {
  type: Date,
  required: true,
  default: null,
},

    relievingDate: {
      type: Date,
      default: null,
    },

    // Salary (Current Snapshot)
    monthSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    lpa: {
      type: Number,
      default: 0,
      min: 0,
    },

    taskRole: {
      type: String,
      enum: ["none", "manager"],
      default: "none",
    },
    taskRoleStatus: {
      type: String,
      enum: ["none", "active", "inactive"],
      default: "none",
    },

    taskRoleDescription: {
      type: String,
      trim: true,
      default: "none"
    },
    // Profile
    profileImage: {
      type: String,
      default: "",
    },

    // Documents (Current Active Documents)
    documents: {
      aadhaar: {
        type: String,
        default: "",
      },
      panCard: {
        type: String,
        default: "",
      },
      bankPassbook: {
        type: String,
        default: "",
      },
      salarySlip: {
        type: String,
        default: "",
      },
      ifscCode: {
        type: String,
        default: ""
      }
    },

    // Meta
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    specialLeaveBalance: {
      type: Number,
      default: 0
    },
    assignedRole: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "AccessRole",
  default: null
},
    refreshToken: String
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for faster filtering
employeeSchema.index({ status: 1, department: 1 });

// Create Employee model
const Employee = mongoose.model("Employee", employeeSchema);

module.exports = { Employee };

