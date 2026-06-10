/**
 * @typedef {Object} AiMessage
 * @property {'system' | 'user' | 'assistant' | 'tool'} role
 * @property {string} content
 * @property {string} [tool_call_id]
 * @property {string} [name]
 */

/**
 * @typedef {Object} AiToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {Record<string, unknown>} parameters
 */

/**
 * @typedef {Object} AiToolCall
 * @property {string} id
 * @property {string} name
 * @property {Record<string, unknown>} arguments
 */

/**
 * @typedef {Object} AiCompletionRequest
 * @property {AiMessage[]} messages
 * @property {AiToolDefinition[]} [tools]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 */

/**
 * @typedef {Object} AiCompletionResponse
 * @property {string | null} content
 * @property {AiToolCall[]} toolCalls
 * @property {string} [finishReason]
 */

/**
 * @typedef {Object} AiProvider
 * @property {string} name
 * @property {() => boolean} isConfigured
 * @property {(request: AiCompletionRequest) => Promise<AiCompletionResponse>} complete
 */

module.exports = {};