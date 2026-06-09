const mongoose = require("mongoose");

const platformOutboxReceiptSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    topic: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    processedAt: { type: Date, default: Date.now },
    result: { type: String, enum: ["processed", "ignored"], default: "processed" },
  },
  {
    collection: "platform_outbox_receipts",
    versionKey: false,
    timestamps: false,
  }
);

module.exports = mongoose.model("PlatformOutboxReceipt", platformOutboxReceiptSchema);