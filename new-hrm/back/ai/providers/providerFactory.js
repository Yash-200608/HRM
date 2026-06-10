const { createGeminiProvider } = require("./geminiProvider.js");
const { createGrokProvider } = require("./grokProvider.js");
const { createOpenAiProvider } = require("./openaiProvider.js");

/**
 * AI provider configuration
 *
 * Supported providers:
 * - openai (default)
 * - grok / xai (xAI Grok — OpenAI-compatible API)
 * - gemini / google (Google Gemini generateContent API)
 *
 * CI examples (GitHub Actions):
 *   # Grok
 *   env:
 *     AI_ENABLED: "true"
 *     AI_PROVIDER: "grok"
 *     XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
 *     AI_MODEL: "grok-4.3"
 *
 *   # Gemini
 *   env:
 *     AI_ENABLED: "true"
 *     AI_PROVIDER: "gemini"
 *     GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
 *     AI_MODEL: "gemini-2.5-flash-lite"
 *     # Optional comma-separated fallbacks when a model hits quota limits:
 *     # GEMINI_MODEL_FALLBACKS: "gemini-2.5-flash,gemini-2.0-flash-lite"
 *
 * Unit tests do not require a live API key; they use provider mocks.
 * Optional smoke/integration jobs may set the vars above.
 */

/** @type {import('./aiProvider.types.js').AiProvider | null} */
let cachedProvider = null;

function resolveProviderName() {
  return (process.env.AI_PROVIDER || "openai").toLowerCase();
}

function normalizeProviderName(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized === "xai") {
    return "grok";
  }
  if (normalized === "google") {
    return "gemini";
  }
  return normalized;
}

function createProviderByName(name) {
  switch (normalizeProviderName(name)) {
    case "openai":
      return createOpenAiProvider();
    case "grok":
      return createGrokProvider();
    case "gemini":
      return createGeminiProvider();
    default:
      throw new Error(`Unsupported AI provider: ${name}`);
  }
}

function getAiProvider() {
  if (!cachedProvider) {
    cachedProvider = createProviderByName(resolveProviderName());
  }
  return cachedProvider;
}

function resetAiProviderForTests() {
  cachedProvider = null;
}

function isAiEnabled() {
  return process.env.AI_ENABLED !== "false";
}

module.exports = {
  createProviderByName,
  getAiProvider,
  isAiEnabled,
  normalizeProviderName,
  resetAiProviderForTests,
  resolveProviderName,
};