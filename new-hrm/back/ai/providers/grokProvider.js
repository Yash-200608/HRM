/** @typedef {import('./aiProvider.types.js').AiProvider} AiProvider */

const { createOpenAiCompatibleProvider } = require("./openAiCompatibleProvider.js");

const DEFAULT_MODEL = "grok-4.3";
const DEFAULT_BASE_URL = "https://api.x.ai/v1";

function resolveGrokApiKey() {
  return (
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

function resolveGrokBaseUrl() {
  return (
    process.env.GROK_BASE_URL ||
    process.env.XAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    DEFAULT_BASE_URL
  );
}

/** @returns {AiProvider} */
function createGrokProvider() {
  return createOpenAiCompatibleProvider({
    name: "grok",
    apiKey: resolveGrokApiKey(),
    baseUrl: resolveGrokBaseUrl(),
    defaultModel: DEFAULT_MODEL,
    missingKeyMessage: "GROK_API_KEY or XAI_API_KEY is not configured",
    errorPrefix: "Grok",
  });
}

module.exports = {
  createGrokProvider,
  DEFAULT_MODEL,
  resolveGrokApiKey,
  resolveGrokBaseUrl,
};