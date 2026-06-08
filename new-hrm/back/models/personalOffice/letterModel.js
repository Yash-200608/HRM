const mongoose = require("mongoose");

const letterSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    letterType: {
      type: String,
      enum: ["loi", "offer", "fnf"],
      required: true,
    },

    pdfUrl: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
    },

    size: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Letter ||
  mongoose.model("Letter", letterSchema);