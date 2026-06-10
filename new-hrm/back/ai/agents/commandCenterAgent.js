const { buildCommandCenterSystemPrompt } = require("../prompts/commandCenter.system.js");

const MAX_TOOL_ITERATIONS = 3;
const MAX_TOOL_CALLS_PER_REQUEST = 5;

function buildInitialMessages({ query, ctx, historyMessages = [] }) {
  const messages = [
    {
      role: "system",
      content: buildCommandCenterSystemPrompt({
        companyId: ctx.companyId,
        role: ctx.role,
        planCode: ctx.tenantContext?.planCode,
      }),
    },
  ];

  for (const entry of historyMessages) {
    if (entry.role === "user" || entry.role === "assistant") {
      messages.push({
        role: entry.role,
        content: String(entry.content || ""),
      });
    }
  }

  messages.push({
    role: "user",
    content: query,
  });

  return messages;
}

function appendToolResultMessages(messages, toolCalls, results) {
  const nextMessages = [...messages];

  nextMessages.push({
    role: "assistant",
    content: "",
    tool_calls: toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: {
        name: call.name,
        arguments: JSON.stringify(call.arguments || {}),
      },
    })),
  });

  for (const result of results) {
    nextMessages.push({
      role: "tool",
      tool_call_id: result.toolCallId,
      name: result.toolName,
      content: JSON.stringify({
        success: result.success,
        data: result.data ?? null,
        summary: result.summary ?? null,
        error: result.error ?? null,
      }),
    });
  }

  return nextMessages;
}

async function runCommandCenterAgent({
  query,
  ctx,
  provider,
  tools,
  executeToolFn,
  onToolExecuted,
  historyMessages = [],
}) {
  let messages = buildInitialMessages({ query, ctx, historyMessages });
  const toolsUsed = [];
  let totalToolCalls = 0;
  let dataCards = [];
  let pendingActions = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const completion = await provider.complete({
      messages,
      tools,
      temperature: 0.2,
    });

    if (!completion.toolCalls?.length) {
      return {
        answer: completion.content || "I could not generate a response for that query.",
        toolsUsed,
        dataCards,
        pendingActions,
      };
    }

    const batch = completion.toolCalls.slice(0, MAX_TOOL_CALLS_PER_REQUEST - totalToolCalls);
    const toolResults = [];

    for (const call of batch) {
      totalToolCalls += 1;
      const result = await executeToolFn(ctx, call.name, call.arguments || {});
      toolsUsed.push(call.name);

      if (onToolExecuted) {
        await onToolExecuted(call.name, result);
      }

      if (result.success && result.data) {
        dataCards.push({
          type: call.name,
          title: call.name,
          payload: result.data,
        });
      }

      if (result.success && result.requiresConfirmation && result.draftId) {
        pendingActions.push({
          draftId: result.draftId,
          actionType: result.actionType || call.name,
          toolName: call.name,
          preview: result.data?.preview || result.data,
          summary: result.summary || null,
        });
      }

      toolResults.push({
        toolCallId: call.id,
        toolName: call.name,
        ...result,
      });
    }

    messages = appendToolResultMessages(messages, batch, toolResults);

    if (totalToolCalls >= MAX_TOOL_CALLS_PER_REQUEST) {
      break;
    }
  }

  const finalCompletion = await provider.complete({
    messages,
    temperature: 0.2,
  });

  return {
    answer: finalCompletion.content || "I processed your request but could not produce a final summary.",
    toolsUsed: [...new Set(toolsUsed)],
    dataCards,
    pendingActions,
  };
}

module.exports = {
  MAX_TOOL_CALLS_PER_REQUEST,
  MAX_TOOL_ITERATIONS,
  buildInitialMessages,
  runCommandCenterAgent,
};