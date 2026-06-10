const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const express = require("express");
const { aiTenantGuard } = require("../ai/services/aiTenantGuard.js");
const { aiPermissionGuard } = require("../ai/services/aiPermissionGuard.js");
const { runCommandCenterQuery } = require("../ai/services/aiOrchestratorService.js");
const { getAiQueryLimiter, resetAiRateLimiterForTests } = require("../ai/services/aiRateLimiter.js");

afterEach(() => {
  resetAiRateLimiterForTests();
  delete process.env.AI_ENABLED;
  delete process.env.AI_RATE_LIMIT_MAX;
});

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function buildMockProvider(responseSequence) {
  let callIndex = 0;
  return {
    name: "mock",
    isConfigured: () => true,
    async complete() {
      const next = responseSequence[callIndex] || responseSequence[responseSequence.length - 1];
      callIndex += 1;
      return next;
    },
  };
}

test("runCommandCenterQuery executes read-only tools and returns sanitized response", async () => {
  const req = {
    user: {
      id: "admin-1",
      role: "admin",
      companyId: "org-1",
      entitlements: ["aiAssistant"],
      permissions: null,
    },
    tenantContext: { planCode: "professional", writable: true },
    correlationId: "corr-1",
    originalUrl: "/api/ai/command-center/query",
    method: "POST",
  };

  const provider = buildMockProvider([
    {
      content: null,
      toolCalls: [
        {
          id: "call-1",
          name: "getAvailableCapabilities",
          arguments: {},
        },
      ],
    },
    {
      content: "You can access attendance, leave, and payroll analytics.",
      toolCalls: [],
    },
  ]);

  const result = await runCommandCenterQuery(req, {
    query: "What can you help me with?",
    providerOverride: provider,
  });

  assert.match(result.answer, /attendance/i);
  assert.ok(result.toolsUsed.includes("getAvailableCapabilities"));
  assert.equal(result.disclaimer, "AI-generated summary. Verify before acting on this information.");
  assert.ok(result.conversationId);
  assert.deepEqual(result.pendingActions, []);
});

test("commandCenterAgent collects pending action drafts from tool results", async () => {
  const { runCommandCenterAgent } = require("../ai/agents/commandCenterAgent.js");

  const provider = buildMockProvider([
    {
      content: null,
      toolCalls: [
        {
          id: "call-draft-1",
          name: "draftAnnouncement",
          arguments: { title: "Policy Update", message: "New leave policy" },
        },
      ],
    },
    {
      content: "I prepared an announcement draft for your review.",
      toolCalls: [],
    },
  ]);

  const result = await runCommandCenterAgent({
    query: "Draft an announcement",
    ctx: {
      userId: "admin-1",
      companyId: "org-1",
      role: "admin",
      permissions: null,
      tenantContext: { planCode: "professional" },
      correlationId: "corr-2",
      entitlements: ["aiAssistant"],
    },
    provider,
    tools: [],
    executeToolFn: async () => ({
      toolName: "draftAnnouncement",
      success: true,
      data: {
        draftId: "draft-test-1",
        actionType: "draftAnnouncement",
        preview: { title: "Policy Update", message: "New leave policy" },
      },
      summary: "Announcement draft created.",
      requiresConfirmation: true,
      draftId: "draft-test-1",
      actionType: "draftAnnouncement",
    }),
    onToolExecuted: async () => {},
  });

  assert.equal(result.pendingActions.length, 1);
  assert.equal(result.pendingActions[0].draftId, "draft-test-1");
  assert.equal(result.pendingActions[0].actionType, "draftAnnouncement");
});

test("aiPermissionGuard denies employees without reports or ai permission", async () => {
  const app = express();
  app.post(
    "/api/ai/command-center/query",
    (req, _res, next) => {
      req.user = {
        id: "emp-1",
        role: "employee",
        companyId: "org-1",
        permissions: { attendance: { view: true } },
      };
      req.originalUrl = "/api/ai/command-center/query";
      req.method = "POST";
      next();
    },
    aiPermissionGuard("commandCenter"),
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/command-center/query`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.code, "AI_ACCESS_DENIED");
  } finally {
    await close(server);
  }
});

test("aiQueryLimiter returns 429 after threshold", async () => {
  process.env.AI_RATE_LIMIT_MAX = "2";
  const aiQueryLimiter = getAiQueryLimiter();

  const app = express();
  app.post(
    "/api/ai/command-center/query",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: "org-1" };
      req.ip = "203.0.113.10";
      next();
    },
    aiQueryLimiter,
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/ai/command-center/query`;

    const first = await fetch(url, { method: "POST" });
    const second = await fetch(url, { method: "POST" });
    const third = await fetch(url, { method: "POST" });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);
  } finally {
    await close(server);
  }
});

test("aiTenantGuard allows valid query payload", async () => {
  const app = express();
  app.use(express.json());
  app.post(
    "/api/ai/command-center/query",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: "org-1" };
      next();
    },
    aiTenantGuard,
    (req, res) => res.json({ companyId: req.user.companyId })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/command-center/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "List pending leaves" }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.companyId, "org-1");
  } finally {
    await close(server);
  }
});