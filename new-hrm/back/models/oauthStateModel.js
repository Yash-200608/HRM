const mongoose = require("mongoose");

const oauthStateSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "microsoft"],
      required: true,
      index: true,
    },
    stateHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    nonceHash: {
      type: String,
      required: true,
    },
    expectedRole: {
      type: String,
      enum: ["employee", "admin", "super_admin", null],
      default: null,
    },
    purpose: {
      type: String,
      enum: ["login", "link"],
      default: "login",
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
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const OAuthState = mongoose.model("OAuthState", oauthStateSchema);

module.exports = OAuthState;
