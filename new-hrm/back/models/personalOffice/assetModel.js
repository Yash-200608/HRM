const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    serialNumber: { type: String, default: null, trim: true },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"],
      default: "AVAILABLE",
      index: true,
    },
    purchaseDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Asset", assetSchema);