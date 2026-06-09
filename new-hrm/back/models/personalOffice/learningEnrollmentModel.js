const mongoose = require("mongoose");

const learningEnrollmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningCourse",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ENROLLED", "IN_PROGRESS", "COMPLETED"],
      default: "ENROLLED",
      index: true,
    },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date, default: null },
    quizScorePercent: { type: Number, default: null, min: 0, max: 100 },
    quizPassed: { type: Boolean, default: false },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningCertificate",
      default: null,
    },
  },
  { timestamps: true }
);

learningEnrollmentSchema.index({ companyId: 1, courseId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model("LearningEnrollment", learningEnrollmentSchema);