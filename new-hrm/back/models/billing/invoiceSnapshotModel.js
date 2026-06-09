const mongoose = require("mongoose");

const invoiceSnapshotSchema = new mongoose.Schema(
  {
    publicId: { type: String, index: true },
    invoiceNumber: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String, index: true },
    currency: { type: String, default: "INR" },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountDue: { type: Number, default: null },
    dueAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    lineItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  {
    collection: "invoices",
    versionKey: false,
    timestamps: false,
  }
);

module.exports = mongoose.model("InvoiceSnapshot", invoiceSnapshotSchema);