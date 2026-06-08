const mongoose = require("mongoose");

// Define the schema
const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Jobs",
      required: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },

    coverLetter: {
      type: String,
      default: null,
    },

   status: {
            type: String,
            enum: ["applied","screening", "shortlisted", "interview", "selected", "rejected"],
            default: "applied",
        },

    feedback: {
      type: String,
      default: null, // Admin can provide feedback on application status
    },

    isDeleted: {
      type: Boolean,
      default: false, // For soft delete if required in future
    },
  },
  { timestamps: true } // createdAt and updatedAt
);

// ❌ Prevent duplicate applications by the same user on the same job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// 📊 Indexes for query optimization
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ job: 1 });

// Export the model
module.exports = mongoose.model("Application", applicationSchema);