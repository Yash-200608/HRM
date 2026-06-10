const assert = require("node:assert/strict");
const { test } = require("node:test");
const { buildConversationTitle } = require("../ai/services/aiConversationMemoryService.js");
const { buildInitialMessages } = require("../ai/agents/commandCenterAgent.js");

test("buildConversationTitle truncates long user prompts", () => {
  const title = buildConversationTitle("a".repeat(200));
  assert.ok(title.length <= 120);
  assert.match(title, /…$/);
});

test("buildConversationTitle falls back for empty input", () => {
  assert.equal(buildConversationTitle(""), "AI Conversation");
});

test("buildInitialMessages prepends conversation history before current query", () => {
  const messages = buildInitialMessages({
    query: "What changed since yesterday?",
    ctx: {
      companyId: "org-1",
      role: "admin",
      tenantContext: { planCode: "professional" },
    },
    historyMessages: [
      { role: "user", content: "Show pending leaves" },
      { role: "assistant", content: "You have 3 pending leave requests." },
    ],
  });

  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.equal(messages[1].content, "Show pending leaves");
  assert.equal(messages[2].role, "assistant");
  assert.equal(messages[3].role, "user");
  assert.equal(messages[3].content, "What changed since yesterday?");
});