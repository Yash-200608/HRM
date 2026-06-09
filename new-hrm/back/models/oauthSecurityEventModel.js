const mongoose = require("mongoose");

const oauthSecurityEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        "oauth_login_success",
        "oauth_login_failure",
        "identity_linked",
        "identity_revoked",
        "nonce_failure",
        "tenant_failure",
      ],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["google", "microsoft", null],
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    accountType: {
      type: String,
      enum: ["employee", "admin", "super_admin", null],
      default: null,
      index: true,
    },
    identityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    ip: {
      type: String,
      default: "",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

oauthSecurityEventSchema.index({ createdAt: -1 });
oauthSecurityEventSchema.index({ eventType: 1, createdAt: -1 });

const OAuthSecurityEvent = mongoose.model("OAuthSecurityEvent", oauthSecurityEventSchema);

module.exports = OAuthSecurityEvent;
