const mongoose = require("mongoose");

const oauthIdentitySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "microsoft"],
      required: true,
      index: true,
    },
    issuer: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    tenantId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ["employee", "admin", "super_admin"],
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    disabledAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

oauthIdentitySchema.index({ provider: 1, issuer: 1, subject: 1 }, { unique: true });
oauthIdentitySchema.index({ provider: 1, accountType: 1, userId: 1 }, { unique: true });

const OAuthIdentity = mongoose.model("OAuthIdentity", oauthIdentitySchema);

module.exports = OAuthIdentity;
