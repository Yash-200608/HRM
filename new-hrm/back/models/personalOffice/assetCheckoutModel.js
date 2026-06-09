const mongoose = require("mongoose");

const assetCheckoutSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    checkedOutAt: { type: Date, default: Date.now },
    dueAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    conditionOut: { type: String, default: "GOOD" },
    conditionIn: { type: String, default: null },
    notes: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    status: {
      type: String,
      enum: ["OPEN", "RETURNED", "OVERDUE"],
      default: "OPEN",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AssetCheckout", assetCheckoutSchema);