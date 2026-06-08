const mongoose = require("mongoose");

const resignationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },

    lastWorkingDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    // ✅ Admin remarks
    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    // ✅ Who approved/rejected
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // or Admin model if separate
      default: null,
    },
  },
  { timestamps: true }
);


// ==============================
// 🔥 INDEXES (IMPORTANT)
// ==============================

// Fast company filtering
resignationSchema.index({ companyId: 1, status: 1 });

// Prevent duplicate pending resignation
resignationSchema.index(
  { employeeId: 1, companyId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);

module.exports = mongoose.model("Resignation", resignationSchema);