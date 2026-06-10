const mongoose = require("mongoose");

const userPreferencesSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      enum: ["en", "es", "fr", "de"],
      default: "en",
    },
    compactView: {
      type: Boolean,
      default: false,
    },
    notifications: {
      email: { type: Boolean, default: true },
      tasks: { type: Boolean, default: true },
      leave: { type: Boolean, default: true },
      expenses: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const DEFAULT_USER_PREFERENCES = {
  language: "en",
  compactView: false,
  notifications: {
    email: true,
    tasks: true,
    leave: true,
    expenses: false,
  },
};

module.exports = { userPreferencesSchema, DEFAULT_USER_PREFERENCES };