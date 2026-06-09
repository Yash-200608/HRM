const mongoose = require("mongoose");

const performanceReviewSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    cycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PerformanceCycle",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    summary: { type: String, default: "" },
    goals: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "ACKNOWLEDGED"],
      default: "PENDING",
      index: true,
    },
    employeeAcknowledgedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

performanceReviewSchema.index({ companyId: 1, cycleId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model("PerformanceReview", performanceReviewSchema);