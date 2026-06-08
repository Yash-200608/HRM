// models/RecentActivity.js
const mongoose = require("mongoose");

const recentActivitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
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
    date: {
      type: Date,
      default: Date.now,
    },

     companyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
        },
  },
  {
    timestamps: true, // createdAt & updatedAt automatic
  }
);

const RecentActivity = mongoose.model("RecentActivity", recentActivitySchema);

module.exports = RecentActivity
