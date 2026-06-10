const { createOpenAiProvider } = require("./openaiProvider.js");

/** @type {import('./aiProvider.types.js').AiProvider | null} */
let cachedProvider = null;

function resolveProviderName() {
  return (process.env.AI_PROVIDER || "openai").toLowerCase();
}

function createProviderByName(name) {
  switch (name) {
    case "openai":
      return createOpenAiProvider();
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
  resetAiProviderForTests,
  resolveProviderName,
};