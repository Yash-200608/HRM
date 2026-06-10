/** @typedef {import('./aiProvider.types.js').AiProvider} AiProvider */

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 1500;

function resolveModel() {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

function resolveMaxTokens(override) {
  if (override != null) {
    return override;
  }
  const parsed = Number(process.env.AI_MAX_TOKENS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_TOKENS;
}

function mapToolsForOpenAi(tools = []) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function parseToolCalls(message) {
  if (!Array.isArray(message?.tool_calls)) {
    return [];
  }

  return message.tool_calls
    .filter((call) => call?.type === "function" && call.function?.name)
    .map((call) => {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      return {
        id: call.id,
        name: call.function.name,
        arguments: args,
      };
    });
}

/** @returns {AiProvider} */
function createOpenAiProvider() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  return {
    name: "openai",

    isConfigured() {
      return Boolean(apiKey);
    },

    async complete(request) {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      const body = {
        model: resolveModel(),
        messages: request.messages.map((message) => {
          const mapped = {
            role: message.role,
            content: message.content ?? "",
          };

          if (message.tool_call_id) {
            mapped.tool_call_id = message.tool_call_id;
          }
          if (message.name) {
            mapped.name = message.name;
          }
          if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
            mapped.tool_calls = message.tool_calls;
          }
          return mapped;
        }),
        temperature: request.temperature ?? 0.2,
        max_tokens: resolveMaxTokens(request.maxTokens),
      };

      if (request.tools?.length) {
        body.tools = mapToolsForOpenAi(request.tools);
        body.tool_choice = "auto";
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${errorBody.slice(0, 500)}`);
      }

      const payload = await response.json();
      const choice = payload.choices?.[0];
      const message = choice?.message || {};

      return {
        content: message.content || null,
        toolCalls: parseToolCalls(message),
        finishReason: choice?.finish_reason || null,
      };
    },
  };
}

module.exports = {
  createOpenAiProvider,
};