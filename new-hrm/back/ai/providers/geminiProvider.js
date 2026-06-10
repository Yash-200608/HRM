/** @typedef {import('./aiProvider.types.js').AiProvider} AiProvider */

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function resolveGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function resolveGeminiBaseUrl() {
  return (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function resolveMaxTokens(override) {
  if (override != null) {
    return override;
  }
  const parsed = Number(process.env.AI_MAX_TOKENS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1500;
}

function resolveGeminiModelFallbacks() {
  const configured = process.env.GEMINI_MODEL_FALLBACKS;
  if (configured) {
    return configured
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [...DEFAULT_MODEL_FALLBACKS];
}

function resolveGeminiModels() {
  const primary = process.env.AI_MODEL || DEFAULT_MODEL;
  const models = [primary, ...resolveGeminiModelFallbacks()];
  return [...new Set(models)];
}

function isGeminiQuotaError(status, apiMessage = "") {
  if (status === 429) {
    return true;
  }

  return /quota|rate.?limit|resource_exhausted|exceeded your current quota/i.test(apiMessage);
}

function formatGeminiProviderError(status, errorBody, model) {
  let parsed = null;

  try {
    parsed = JSON.parse(errorBody);
  } catch {
    parsed = null;
  }

  const apiMessage = String(parsed?.error?.message || errorBody || "Gemini request failed").trim();
  const quotaError = isGeminiQuotaError(status, apiMessage);

  let message = apiMessage;
  if (quotaError) {
    message =
      `Gemini API quota exceeded for model "${model}". ` +
      "Your API key may not include free-tier access to this model. " +
      'Try AI_MODEL=gemini-2.5-flash-lite, enable billing in Google AI Studio, ' +
      "or switch AI_PROVIDER to grok/openai.";
  } else if (status >= 400) {
    message = `Gemini request failed (${status}) for model "${model}": ${apiMessage}`;
  }

  const error = new Error(message);
  error.statusCode = quotaError ? 429 : status >= 400 && status < 600 ? status : 502;
  error.code = quotaError ? "AI_PROVIDER_QUOTA_EXCEEDED" : "AI_PROVIDER_ERROR";
  error.provider = "gemini";
  error.model = model;
  error.retryable = quotaError;
  return error;
}

const GEMINI_UNSUPPORTED_SCHEMA_KEYS = new Set([
  "additionalProperties",
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
]);

function sanitizeSchemaForGemini(schema) {
  if (schema == null || typeof schema !== "object") {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(sanitizeSchemaForGemini);
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(schema)) {
    if (GEMINI_UNSUPPORTED_SCHEMA_KEYS.has(key)) {
      continue;
    }

    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      const nextProperties = {};
      for (const [propKey, propValue] of Object.entries(value)) {
        nextProperties[propKey] = sanitizeSchemaForGemini(propValue);
      }
      sanitized.properties = nextProperties;
      continue;
    }

    sanitized[key] = sanitizeSchemaForGemini(value);
  }

  return sanitized;
}

function mapToolsForGemini(tools = []) {
  if (!tools.length) {
    return [];
  }

  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: sanitizeSchemaForGemini(tool.parameters),
      })),
    },
  ];
}

function mapMessagesToGemini(messages = []) {
  let systemInstruction = null;
  const contents = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemInstruction = String(message.content || "");
      continue;
    }

    if (message.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: String(message.content ?? "") }],
      });
      continue;
    }

    if (message.role === "assistant") {
      const parts = [];

      if (message.content) {
        parts.push({ text: String(message.content) });
      }

      if (Array.isArray(message.tool_calls)) {
        for (const call of message.tool_calls) {
          let args = {};
          try {
            args = JSON.parse(call.function?.arguments || "{}");
          } catch {
            args = {};
          }

          parts.push({
            functionCall: {
              name: call.function?.name,
              args,
              id: call.id,
            },
          });
        }
      }

      if (parts.length) {
        contents.push({ role: "model", parts });
      }
      continue;
    }

    if (message.role === "tool") {
      let response = {};
      try {
        response = JSON.parse(message.content || "{}");
      } catch {
        response = { result: message.content };
      }

      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: message.name,
              id: message.tool_call_id,
              response,
            },
          },
        ],
      });
    }
  }

  return { systemInstruction, contents };
}

function parseGeminiResponse(payload) {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let content = null;
  const toolCalls = [];

  for (const part of parts) {
    if (part.text) {
      content = content ? `${content}${part.text}` : part.text;
    }

    if (part.functionCall?.name) {
      toolCalls.push({
        id: part.functionCall.id || `call-${toolCalls.length + 1}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      });
    }
  }

  return {
    content,
    toolCalls,
    finishReason: candidate?.finishReason || null,
  };
}

/** @returns {AiProvider} */
function createGeminiProvider() {
  const apiKey = resolveGeminiApiKey();
  const baseUrl = resolveGeminiBaseUrl();

  return {
    name: "gemini",

    isConfigured() {
      return Boolean(apiKey);
    },

    async complete(request) {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured");
      }

      const models = resolveGeminiModels();
      const { systemInstruction, contents } = mapMessagesToGemini(request.messages);

      const body = {
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: resolveMaxTokens(request.maxTokens),
        },
      };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      if (request.tools?.length) {
        body.tools = mapToolsForGemini(request.tools);
      }

      let lastError = null;

      for (let index = 0; index < models.length; index += 1) {
        const model = models[index];
        const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const payload = await response.json();
          return parseGeminiResponse(payload);
        }

        const errorBody = await response.text();
        const providerError = formatGeminiProviderError(response.status, errorBody, model);
        lastError = providerError;

        const hasFallback = index < models.length - 1;
        if (providerError.retryable && hasFallback) {
          continue;
        }

        throw providerError;
      }

      throw lastError || new Error("Gemini request failed");
    },
  };
}

module.exports = {
  createGeminiProvider,
  DEFAULT_MODEL,
  DEFAULT_MODEL_FALLBACKS,
  formatGeminiProviderError,
  mapMessagesToGemini,
  mapToolsForGemini,
  parseGeminiResponse,
  resolveGeminiApiKey,
  resolveGeminiBaseUrl,
  resolveGeminiModels,
  sanitizeSchemaForGemini,
};