import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  AiChatMessage,
  AiPendingAction,
  fetchAiConversation,
  fetchAiSuggestions,
  submitAiQuery,
} from "@/ai/services/aiService";

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAICommandCenter() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedAction, setSelectedAction] = useState<AiPendingAction | null>(null);

  const suggestionsQuery = useQuery({
    queryKey: ["ai", "suggestions"],
    queryFn: fetchAiSuggestions,
  });

  const queryMutation = useMutation({
    mutationFn: submitAiQuery,
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          dataCards: response.dataCards,
          pendingActions: response.pendingActions,
          toolsUsed: response.toolsUsed,
        },
      ]);
    },
  });

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: "assistant", content },
    ]);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const conversation = await fetchAiConversation(id);
    setConversationId(conversation.id);
    setMessages(
      (conversation.messages || []).map((message) => ({
        id: createMessageId(),
        role: message.role,
        content: message.content,
      }))
    );
  }, []);

  const sendQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: createMessageId(), role: "user", content: trimmed },
      ]);

      await queryMutation.mutateAsync({
        query: trimmed,
        conversationId,
      });
    },
    [conversationId, queryMutation]
  );

  return {
    messages,
    suggestions: suggestionsQuery.data ?? [],
    isLoadingSuggestions: suggestionsQuery.isLoading,
    sendQuery,
    isSubmitting: queryMutation.isPending,
    error: queryMutation.error,
    conversationId,
    selectedAction,
    setSelectedAction,
    appendSystemMessage,
    loadConversation,
  };
}