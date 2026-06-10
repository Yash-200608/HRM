const mongoose = require("mongoose");

const scopePolicySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    allowActionTools: { type: Boolean, default: true },
    allowPredictiveIntelligence: { type: Boolean, default: true },
  },
  { _id: false }
);

const employeeRestrictionsSchema = new mongoose.Schema(
  {
    blockActionTools: { type: Boolean, default: true },
    blockPredictiveIntelligence: { type: Boolean, default: true },
    blockSeatUtilization: { type: Boolean, default: true },
  },
  { _id: false }
);

const memoryPolicySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 30, min: 1, max: 365 },
    maxMessagesPerConversation: { type: Number, default: 50, min: 5, max: 200 },
    contextWindowMessages: { type: Number, default: 10, min: 0, max: 30 },
  },
  { _id: false }
);

const aiPolicySchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: true },
    scopes: {
      command_center: {
        type: scopePolicySchema,
        default: () => ({}),
      },
      employee_copilot: {
        type: scopePolicySchema,
        default: () => ({ enabled: false, allowActionTools: false, allowPredictiveIntelligence: false }),
      },
      manager_copilot: {
        type: scopePolicySchema,
        default: () => ({ enabled: true, allowActionTools: true, allowPredictiveIntelligence: true }),
      },
    },
    blockedTools: {
      type: [String],
      default: [],
    },
    allowedTools: {
      type: [String],
      default: null,
    },
    employeeRestrictions: {
      type: employeeRestrictionsSchema,
      default: () => ({}),
    },
    memory: {
      type: memoryPolicySchema,
      default: () => ({}),
    },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("AiPolicy", aiPolicySchema, "ai_policies");