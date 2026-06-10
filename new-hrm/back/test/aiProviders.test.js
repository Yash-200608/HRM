const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const {
  createGeminiProvider,
  formatGeminiProviderError,
  mapMessagesToGemini,
  mapToolsForGemini,
  parseGeminiResponse,
  resolveGeminiModels,
  sanitizeSchemaForGemini,
} = require("../ai/providers/geminiProvider.js");
const { createGrokProvider } = require("../ai/providers/grokProvider.js");
const {
  createProviderByName,
  getAiProvider,
  normalizeProviderName,
  resetAiProviderForTests,
  resolveProviderName,
} = require("../ai/providers/providerFactory.js");

const ENV_KEYS = [
  "AI_PROVIDER",
  "GROK_API_KEY",
  "XAI_API_KEY",
  "OPENAI_API_KEY",
  "GROK_BASE_URL",
  "XAI_BASE_URL",
  "OPENAI_BASE_URL",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_BASE_URL",
  "AI_MODEL",
  "GEMINI_MODEL_FALLBACKS",
];

function saveEnv() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  }
  resetAiProviderForTests();
}

let envSnapshot;

beforeEach(() => {
  envSnapshot = saveEnv();
});

afterEach(() => {
  restoreEnv(envSnapshot);
});

test("normalizeProviderName maps provider aliases", () => {
  assert.equal(normalizeProviderName("xai"), "grok");
  assert.equal(normalizeProviderName("google"), "gemini");
  assert.equal(normalizeProviderName("grok"), "grok");
  assert.equal(normalizeProviderName("gemini"), "gemini");
  assert.equal(normalizeProviderName("openai"), "openai");
});

test("createGrokProvider is configured when XAI_API_KEY is set", () => {
  delete process.env.GROK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.XAI_API_KEY = "test-xai-key";

  const provider = createGrokProvider();
  assert.equal(provider.name, "grok");
  assert.equal(provider.isConfigured(), true);
});

test("createGrokProvider prefers GROK_API_KEY over XAI_API_KEY", () => {
  process.env.GROK_API_KEY = "test-grok-key";
  process.env.XAI_API_KEY = "test-xai-key";

  const provider = createGrokProvider();
  assert.equal(provider.isConfigured(), true);
});

test("getAiProvider returns grok provider when AI_PROVIDER=grok", () => {
  process.env.AI_PROVIDER = "grok";
  process.env.XAI_API_KEY = "test-xai-key";

  const provider = getAiProvider();
  assert.equal(provider.name, "grok");
  assert.equal(resolveProviderName(), "grok");
});

test("createProviderByName supports xai alias", () => {
  process.env.XAI_API_KEY = "test-xai-key";
  const provider = createProviderByName("xai");
  assert.equal(provider.name, "grok");
});

test("createProviderByName rejects unknown providers", () => {
  assert.throws(() => createProviderByName("anthropic"), /Unsupported AI provider/);
});

test("createGeminiProvider is configured when GEMINI_API_KEY is set", () => {
  delete process.env.GOOGLE_API_KEY;
  process.env.GEMINI_API_KEY = "test-gemini-key";

  const provider = createGeminiProvider();
  assert.equal(provider.name, "gemini");
  assert.equal(provider.isConfigured(), true);
});

test("createGeminiProvider accepts GOOGLE_API_KEY alias", () => {
  delete process.env.GEMINI_API_KEY;
  process.env.GOOGLE_API_KEY = "test-google-key";

  const provider = createGeminiProvider();
  assert.equal(provider.isConfigured(), true);
});

test("getAiProvider returns gemini provider when AI_PROVIDER=gemini", () => {
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-gemini-key";

  const provider = getAiProvider();
  assert.equal(provider.name, "gemini");
});

test("createProviderByName supports google alias", () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  const provider = createProviderByName("google");
  assert.equal(provider.name, "gemini");
});

test("resolveGeminiModels deduplicates primary model and fallbacks", () => {
  process.env.AI_MODEL = "gemini-2.5-flash";
  process.env.GEMINI_MODEL_FALLBACKS = "gemini-2.5-flash-lite,gemini-2.5-flash";

  assert.deepEqual(resolveGeminiModels(), [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ]);
});

test("formatGeminiProviderError maps quota failures to AI_PROVIDER_QUOTA_EXCEEDED", () => {
  const error = formatGeminiProviderError(
    429,
    JSON.stringify({
      error: {
        code: 429,
        message: "Quota exceeded for metric: generate_content_free_tier_input_token_count",
      },
    }),
    "gemini-2.0-flash"
  );

  assert.equal(error.statusCode, 429);
  assert.equal(error.code, "AI_PROVIDER_QUOTA_EXCEEDED");
  assert.equal(error.retryable, true);
  assert.match(error.message, /gemini-2\.0-flash/);
});

test("createGeminiProvider falls back to the next model after quota errors", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.AI_MODEL = "gemini-2.0-flash";
  process.env.GEMINI_MODEL_FALLBACKS = "gemini-2.5-flash-lite";

  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push(String(url));
    if (String(url).includes("gemini-2.0-flash")) {
      return new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: "Quota exceeded for metric: generate_content_free_tier_input_token_count",
          },
        }),
        { status: 429, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "Fallback model response." }] },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  try {
    const provider = createGeminiProvider();
    const result = await provider.complete({
      messages: [{ role: "user", content: "Hello" }],
    });

    assert.equal(calls.length, 2);
    assert.match(calls[0], /gemini-2\.0-flash/);
    assert.match(calls[1], /gemini-2\.5-flash-lite/);
    assert.equal(result.content, "Fallback model response.");
  } finally {
    global.fetch = originalFetch;
  }
});

test("sanitizeSchemaForGemini removes additionalProperties from nested schemas", () => {
  const sanitized = sanitizeSchemaForGemini({
    type: "object",
    properties: {
      month: {
        type: "string",
        additionalProperties: false,
      },
      tags: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
    additionalProperties: false,
  });

  assert.equal("additionalProperties" in sanitized, false);
  assert.equal("additionalProperties" in sanitized.properties.month, false);
  assert.equal("additionalProperties" in sanitized.properties.tags.items, false);
});

test("mapToolsForGemini strips unsupported schema keys from tool declarations", () => {
  const mapped = mapToolsForGemini([
    {
      name: "getAttendanceSummary",
      description: "Attendance summary",
      parameters: {
        type: "object",
        $schema: "http://json-schema.org/draft-07/schema#",
        properties: {
          month: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  ]);

  const parameters = mapped[0].functionDeclarations[0].parameters;
  assert.equal(parameters.additionalProperties, undefined);
  assert.equal(parameters.$schema, undefined);
  assert.equal(parameters.type, "object");
  assert.equal(parameters.properties.month.type, "string");
});

test("mapMessagesToGemini converts system, tool calls, and tool results", () => {
  const mapped = mapMessagesToGemini([
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Check leaves" },
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call-1",
          type: "function",
          function: { name: "getPendingLeaves", arguments: "{}" },
        },
      ],
    },
    {
      role: "tool",
      tool_call_id: "call-1",
      name: "getPendingLeaves",
      content: JSON.stringify({ success: true, data: { count: 2 } }),
    },
  ]);

  assert.equal(mapped.systemInstruction, "You are helpful.");
  assert.equal(mapped.contents.length, 3);
  assert.equal(mapped.contents[0].role, "user");
  assert.equal(mapped.contents[1].role, "model");
  assert.equal(mapped.contents[1].parts[0].functionCall.name, "getPendingLeaves");
  assert.equal(mapped.contents[2].parts[0].functionResponse.name, "getPendingLeaves");
});

test("parseGeminiResponse extracts text and function calls", () => {
  const parsed = parseGeminiResponse({
    candidates: [
      {
        finishReason: "STOP",
        content: {
          parts: [
            { text: "Here are the results." },
            {
              functionCall: {
                id: "fc-1",
                name: "getAttendanceSummary",
                args: { days: 7 },
              },
            },
          ],
        },
      },
    ],
  });

  assert.equal(parsed.content, "Here are the results.");
  assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parsed.toolCalls[0].name, "getAttendanceSummary");
  assert.deepEqual(parsed.toolCalls[0].arguments, { days: 7 });
});