import axios from "@/lib/axios";

export interface AiSuggestion {
  id: string;
  label: string;
  query: string;
}

export interface AiDataCard {
  type: string;
  title: string;
  payload: unknown;
}

export interface AiPendingAction {
  draftId: string;
  actionType: string;
  toolName: string;
  preview: unknown;
  summary?: string | null;
}

export interface AiQueryResponse {
  answer: string;
  dataCards?: AiDataCard[];
  pendingActions?: AiPendingAction[];
  toolsUsed: string[];
  conversationId: string;
  disclaimer: string;
}

export interface AiActionConfirmResponse {
  draftId: string;
  actionType: string;
  status: string;
  result?: {
    summary?: string;
    resourceType?: string;
    resourceId?: string;
    [key: string]: unknown;
  };
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  dataCards?: AiDataCard[];
  pendingActions?: AiPendingAction[];
  toolsUsed?: string[];
}

export async function fetchAiSuggestions() {
  const { data } = await axios.get<{ suggestions: AiSuggestion[] }>(
    "/api/ai/command-center/suggestions"
  );
  return data.suggestions;
}

export async function submitAiQuery(payload: {
  query: string;
  conversationId?: string;
}) {
  const { data } = await axios.post<AiQueryResponse>(
    "/api/ai/command-center/query",
    payload
  );
  return data;
}

export async function fetchAiActionDraft(draftId: string) {
  const { data } = await axios.get(`/api/ai/actions/${draftId}`);
  return data;
}

export async function confirmAiAction(draftId: string) {
  const { data } = await axios.post<AiActionConfirmResponse>(
    `/api/ai/actions/${draftId}/confirm`
  );
  return data;
}

export async function cancelAiAction(draftId: string) {
  const { data } = await axios.post(`/api/ai/actions/${draftId}/cancel`);
  return data;
}

export async function fetchAiHealth() {
  const { data } = await axios.get<{
    enabled: boolean;
    provider: string;
    configured: boolean;
  }>("/api/ai/health");
  return data;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  scope: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiPolicy {
  enabled: boolean;
  isDefault?: boolean;
  scopes: {
    command_center: { enabled: boolean; allowActionTools: boolean; allowPredictiveIntelligence: boolean };
    employee_copilot: { enabled: boolean; allowActionTools: boolean; allowPredictiveIntelligence: boolean };
    manager_copilot: { enabled: boolean; allowActionTools: boolean; allowPredictiveIntelligence: boolean };
  };
  blockedTools: string[];
  allowedTools: string[] | null;
  employeeRestrictions: {
    blockActionTools: boolean;
    blockPredictiveIntelligence: boolean;
    blockSeatUtilization: boolean;
  };
  memory: {
    enabled: boolean;
    retentionDays: number;
    maxMessagesPerConversation: number;
    contextWindowMessages: number;
  };
}

export interface AiAdminAnalytics {
  windowDays: number;
  generatedAt: string;
  policy: {
    enabled: boolean;
    memoryEnabled: boolean;
    retentionDays: number;
    blockedToolsCount: number;
    allowedToolsCount: number;
  };
  summary: {
    totalQueries: number;
    totalToolExecutions: number;
    failureRatePercent: number;
    pendingDrafts: number;
    activeConversations: number;
  };
  queriesPerDay: Array<{ date: string; count: number }>;
  auditByAction: Array<{ action: string; count: number }>;
  topTools: Array<{ toolName: string; count: number }>;
  drafts: {
    pending: number;
    confirmed: number;
    cancelled: number;
    expired: number;
    total: number;
  };
  conversations: {
    activeConversations: number;
    totalMessages: number;
    avgMessagesPerConversation: number;
  };
  queryOutcomes: {
    completed: number;
    failed: number;
    failureRatePercent: number;
  };
}

export async function fetchAiConversations(limit = 20) {
  const { data } = await axios.get<{ conversations: AiConversationSummary[]; scope: string }>(
    "/api/ai/conversations",
    { params: { limit } }
  );
  return data;
}

export async function fetchAiConversation(conversationId: string) {
  const { data } = await axios.get<{
    conversation: AiConversationSummary & { messages: AiChatMessage[] };
  }>(`/api/ai/conversations/${conversationId}`);
  return data.conversation;
}

export async function fetchAiPolicy() {
  const { data } = await axios.get<{ policy: AiPolicy }>("/api/ai/policy");
  return data.policy;
}

export async function updateAiPolicy(policy: Partial<AiPolicy>) {
  const { data } = await axios.put<{ policy: AiPolicy }>("/api/ai/policy", { policy });
  return data.policy;
}

export async function fetchAiAdminAnalytics(windowDays = 30) {
  const { data } = await axios.get<{ analytics: AiAdminAnalytics }>("/api/ai/admin/analytics", {
    params: { windowDays },
  });
  return data.analytics;
}