const mongoose = require("mongoose");

const conversationMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    toolsUsed: { type: [String], default: [] },
    pendingActionCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    scope: {
      type: String,
      default: "command_center",
      index: true,
    },
    title: {
      type: String,
      default: "AI Conversation",
      trim: true,
    },
    messages: {
      type: [conversationMessageSchema],
      default: [],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

aiConversationSchema.index({ organizationId: 1, userId: 1, lastMessageAt: -1 });
aiConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AiConversation", aiConversationSchema, "ai_conversations");