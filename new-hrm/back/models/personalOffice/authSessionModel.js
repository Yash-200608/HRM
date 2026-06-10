const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    accountType: {
      type: String,
      enum: ["admin", "employee", "super_admin"],
      required: true,
    },
    refreshTokenHash: { type: String, default: null },
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
    lastActiveAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

authSessionSchema.index({ userId: 1, accountType: 1, revokedAt: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AuthSession", authSessionSchema, "auth_sessions");