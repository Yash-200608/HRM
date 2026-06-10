/** @typedef {import('./aiProvider.types.js').AiProvider} AiProvider */

const { createOpenAiCompatibleProvider } = require("./openAiCompatibleProvider.js");

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/** @returns {AiProvider} */
function createOpenAiProvider() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  return createOpenAiCompatibleProvider({
    name: "openai",
    apiKey,
    baseUrl,
    defaultModel: DEFAULT_MODEL,
    missingKeyMessage: "OPENAI_API_KEY is not configured",
    errorPrefix: "OpenAI",
  });
}

module.exports = {
  createOpenAiProvider,
  DEFAULT_MODEL,
};