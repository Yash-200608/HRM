const {
  deleteConversation,
  getConversation,
  listConversations,
} = require("../services/aiConversationMemoryService.js");

async function listConversationsHandler(req, res) {
  try {
    const organizationId = req.user?.companyId;
    if (!organizationId) {
      return res.status(403).json({
        code: "ORGANIZATION_REQUIRED",
        message: "Organization context is required",
      });
    }

    const limit = Number(req.query?.limit) || 20;
    const conversations = await listConversations({
      organizationId,
      userId: req.user.id,
      limit,
    });

    return res.json({ conversations, scope: req.aiScope || "command_center" });
  } catch (error) {
    return res.status(500).json({
      code: "AI_CONVERSATIONS_LIST_FAILED",
      message: error.message || "Failed to list conversations",
    });
  }
}

async function getConversationHandler(req, res) {
  try {
    const organizationId = req.user?.companyId;
    if (!organizationId) {
      return res.status(403).json({
        code: "ORGANIZATION_REQUIRED",
        message: "Organization context is required",
      });
    }

    const conversation = await getConversation({
      organizationId,
      userId: req.user.id,
      conversationId: req.params.conversationId,
    });

    if (!conversation) {
      return res.status(404).json({
        code: "AI_CONVERSATION_NOT_FOUND",
        message: "Conversation not found",
      });
    }

    return res.json({ conversation });
  } catch (error) {
    return res.status(500).json({
      code: "AI_CONVERSATION_FETCH_FAILED",
      message: error.message || "Failed to load conversation",
    });
  }
}

async function deleteConversationHandler(req, res) {
  try {
    const organizationId = req.user?.companyId;
    if (!organizationId) {
      return res.status(403).json({
        code: "ORGANIZATION_REQUIRED",
        message: "Organization context is required",
      });
    }

    const result = await deleteConversation({
      organizationId,
      userId: req.user.id,
      conversationId: req.params.conversationId,
    });

    return res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      code: status === 404 ? "AI_CONVERSATION_NOT_FOUND" : "AI_CONVERSATION_DELETE_FAILED",
      message: error.message || "Failed to delete conversation",
    });
  }
}

module.exports = {
  deleteConversationHandler,
  getConversationHandler,
  listConversationsHandler,
};