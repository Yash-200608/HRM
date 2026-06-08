const mongoose = require("mongoose");

const EmployeeDocumentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true
    },

    documentType: {
      type: String,
      enum: [
        "SALARY_SLIP",
        "OFFER_LETTER",
        "JOINING_LETTER",
        "NOC",
        "RECOMMENDATION_LETTER",
        "RELIEVING_LETTER",
        "EXPERIENCE_LETTER"
      ],
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true
      // eg: "Salary Slip - Jan 2026"
    },

    fileUrl: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVISED", "ARCHIVED"],
      default: "ACTIVE"
    },

    issuedBy: {
      type: String,
      default: "Admin"
    },

    issuedAt: {
      type: Date,
      default: Date.now
    },

    /**
     * Flexible data per document
     */
    metadata: {
      month: String,        // for salary slip (2026-01)
      year: Number,
      salaryAmount: Number,
      remarks: String,
      purpose: String       // for NOC
    },

    /**
     * Link to previous document (if revised)
     */
    previousDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeDocument",
      default: null
    }
  },
  { timestamps: true }
);

 const EmployeeDocument =  mongoose.model(
  "EmployeeDocument",
  EmployeeDocumentSchema
);

module.exports = EmployeeDocument;
