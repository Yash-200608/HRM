/**
 * @typedef {Object} ToolContext
 * @property {string} userId
 * @property {string | null} companyId
 * @property {string} role
 * @property {Record<string, Record<string, boolean>> | null} permissions
 * @property {import('../../service/tenantContextService.js').resolveTenantContext extends Function ? Awaited<ReturnType<import('../../service/tenantContextService.js').resolveTenantContext>> : object} tenantContext
 * @property {string | null} correlationId
 * @property {string[]} entitlements
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {Record<string, unknown>} parameters
 * @property {'read' | 'action'} [kind]
 * @property {string[]} [requiredModules]
 * @property {string[]} [requiredEntitlements]
 * @property {{ module: string, action: string }[]} [requiredActions]
 * @property {boolean} [adminOnly]
 * @property {(ctx: ToolContext, args: Record<string, unknown>) => Promise<{ data: unknown, summary?: string, requiresConfirmation?: boolean, draftId?: string, actionType?: string }>} execute
 */

/**
 * @typedef {Object} ToolResult
 * @property {string} toolName
 * @property {boolean} success
 * @property {unknown} [data]
 * @property {string} [summary]
 * @property {string} [error]
 */

module.exports = {};