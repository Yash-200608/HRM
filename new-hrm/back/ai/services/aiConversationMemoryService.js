const crypto = require("crypto");
const mongoose = require("mongoose");
const AiConversation = require("../../models/personalOffice/aiConversationModel");
const { recordAuditEvent } = require("../../service/auditService");

const MAX_TITLE_LENGTH = 120;

function normalizeOrganizationId(organizationId) {
  return String(organizationId || "").trim();
}

function normalizeUserId(userId) {
  return String(userId || "").trim();
}

function buildConversationTitle(message) {
  const text = String(message || "").trim().replace(/\s+/g, " ");
  if (!text) return "AI Conversation";
  return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1)}…` : text;
}

function toPublicMessage(message) {
  if (!message) return null;
  return {
    role: message.role,
    content: message.content,
    toolsUsed: message.toolsUsed || [],
    pendingActionCount: message.pendingActionCount || 0,
    createdAt: message.createdAt,
  };
}

function toPublicConversation(conversation) {
  if (!conversation) return null;
  return {
    id: conversation.conversationId,
    title: conversation.title,
    scope: conversation.scope,
    messageCount: conversation.messages?.length || 0,
    messages: (conversation.messages || []).map(toPublicMessage),
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function toConversationSummary(conversation) {
  if (!conversation) return null;
  return {
    id: conversation.conversationId,
    title: conversation.title,
    scope: conversation.scope,
    messageCount: conversation.messages?.length || 0,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

async function findOwnedConversation({ organizationId, userId, conversationId }) {
  const orgId = normalizeOrganizationId(organizationId);
  const uid = normalizeUserId(userId);
  const id = String(conversationId || "").trim();

  if (!orgId || !uid || !id) {
    return null;
  }

  return AiConversation.findOne({
    conversationId: id,
    organizationId: orgId,
    userId: uid,
  }).lean();
}

async function listConversations({ organizationId, userId, limit = 20 }) {
  const orgId = normalizeOrganizationId(organizationId);
  const uid = normalizeUserId(userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  const rows = await AiConversation.find({
    organizationId: orgId,
    userId: uid,
  })
    .sort({ lastMessageAt: -1 })
    .limit(safeLimit)
    .lean();

  return rows.map(toConversationSummary);
}

async function getConversation({ organizationId, userId, conversationId }) {
  const conversation = await findOwnedConversation({ organizationId, userId, conversationId });
  return toPublicConversation(conversation);
}

async function createConversation({
  organizationId,
  userId,
  scope,
  firstMessage,
  retentionDays = 90,
  conversationId = null,
}) {
  const orgId = normalizeOrganizationId(organizationId);
  const uid = normalizeUserId(userId);
  const days = Math.max(Number(retentionDays) || 90, 1);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const convId = conversationId || crypto.randomUUID();

  const conversation = await AiConversation.create({
    conversationId: convId,
    organizationId: orgId,
    userId: uid,
    scope: scope || "command_center",
    title: buildConversationTitle(firstMessage),
    messages: [],
    lastMessageAt: new Date(),
    expiresAt,
  });

  return toPublicConversation(conversation.toObject());
}

async function appendMessages({
  organizationId,
  userId,
  conversationId,
  messages = [],
}) {
  const conversation = await findOwnedConversation({ organizationId, userId, conversationId });
  if (!conversation) {
    const err = new Error("Conversation not found");
    err.statusCode = 404;
    throw err;
  }

  const payload = messages.map((m) => ({
    role: m.role,
    content: m.content,
    toolsUsed: m.toolsUsed || [],
    pendingActionCount: m.pendingActionCount || 0,
    createdAt: m.createdAt || new Date(),
  }));

  const updated = await AiConversation.findOneAndUpdate(
    {
      conversationId: conversation.conversationId,
      organizationId: conversation.organizationId,
      userId: conversation.userId,
    },
    {
      $push: { messages: { $each: payload } },
      $set: { lastMessageAt: new Date() },
    },
    { new: true }
  ).lean();

  return toPublicConversation(updated);
}

async function getHistoryForLlm({
  organizationId,
  userId,
  conversationId,
  maxMessages = 12,
}) {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const conversation = await findOwnedConversation({ organizationId, userId, conversationId });
  if (!conversation) {
    return [];
  }

  const limit = Math.min(Math.max(Number(maxMessages) || 12, 0), 50);
  const messages = conversation.messages || [];
  const slice = limit > 0 ? messages.slice(-limit) : [];

  return slice
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: String(m.content || ""),
    }));
}

async function recordConversationTurn({
  organizationId,
  userId,
  conversationId,
  scope,
  userMessage,
  assistantMessage,
  toolsUsed = [],
  pendingActionCount = 0,
  retentionDays = 90,
  policyEnabled = true,
}) {
  if (!policyEnabled) {
    return { conversationId: null, persisted: false };
  }

  if (mongoose.connection.readyState !== 1) {
    return { conversationId: conversationId || null, persisted: false };
  }

  const orgId = normalizeOrganizationId(organizationId);
  const uid = normalizeUserId(userId);
  let convId = String(conversationId || "").trim() || null;

  if (!convId) {
    const created = await createConversation({
      organizationId: orgId,
      userId: uid,
      scope,
      firstMessage: userMessage,
      retentionDays,
    });
    convId = created.id;
  } else {
    const existing = await findOwnedConversation({
      organizationId: orgId,
      userId: uid,
      conversationId: convId,
    });
    if (!existing) {
      const created = await createConversation({
        organizationId: orgId,
        userId: uid,
        scope,
        firstMessage: userMessage,
        retentionDays,
        conversationId: convId,
      });
      convId = created.id;
    }
  }

  await appendMessages({
    organizationId: orgId,
    userId: uid,
    conversationId: convId,
    messages: [
      { role: "user", content: userMessage },
      {
        role: "assistant",
        content: assistantMessage,
        toolsUsed,
        pendingActionCount,
      },
    ],
  });

  await recordAuditEvent({
    actorId: uid,
    actorRole: null,
    companyId: orgId,
    action: "AI_CONVERSATION_UPDATED",
    resourceType: "ai_conversation",
    resourceId: convId,
    metadata: { scope, messageCount: 2 },
  }).catch(() => {});

  return { conversationId: convId, persisted: true };
}

async function deleteConversation({ organizationId, userId, conversationId }) {
  const conversation = await findOwnedConversation({ organizationId, userId, conversationId });
  if (!conversation) {
    const err = new Error("Conversation not found");
    err.statusCode = 404;
    throw err;
  }

  await AiConversation.deleteOne({ _id: conversation._id });

  return { deleted: true, id: conversation.conversationId };
}

module.exports = {
  listConversations,
  getConversation,
  createConversation,
  appendMessages,
  getHistoryForLlm,
  recordConversationTurn,
  deleteConversation,
  buildConversationTitle,
};