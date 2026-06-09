const mongoose = require("mongoose");

const subscriptionSnapshotSchema = new mongoose.Schema(
  {
    publicId: { type: String, index: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    planCode: { type: String, default: "free" },
    status: { type: String, default: "TRIAL" },
    employeeLimit: { type: Number, default: null },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    creditBalance: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    featureSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  {
    collection: "subscriptions",
    versionKey: false,
    timestamps: false,
  }
);

module.exports = mongoose.model("SubscriptionSnapshot", subscriptionSnapshotSchema);