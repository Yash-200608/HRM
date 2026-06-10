import AIActionConfirmationModal from "@/ai/components/AIActionConfirmationModal";
import AIQueryInput from "@/ai/components/AIQueryInput";
import AIResponseCard from "@/ai/components/AIResponseCard";
import AISuggestionChips from "@/ai/components/AISuggestionChips";
import { useAICommandCenter } from "@/ai/hooks/useAICommandCenter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

export default function AIChatPanel() {
  const {
    messages,
    suggestions,
    sendQuery,
    isSubmitting,
    error,
    selectedAction,
    setSelectedAction,
    appendSystemMessage,
  } = useAICommandCenter();
  const [modalOpen, setModalOpen] = useState(false);

  const errorMessage =
    error && typeof error === "object" && "response" in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <AISuggestionChips
        suggestions={suggestions}
        onSelect={sendQuery}
        disabled={isSubmitting}
      />

      <div className="min-h-[320px] flex-1 space-y-4 overflow-y-auto rounded-lg border bg-muted/20 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Try asking: &quot;Who has low attendance this month?&quot; or
            &quot;Show pending leave requests.&quot; Results appear as a short
            summary with an easy-to-read table below.
          </p>
        ) : (
          messages.map((message) => (
            <AIResponseCard
              key={message.id}
              message={message}
              onReviewAction={(action) => {
                setSelectedAction(action);
                setModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <AIQueryInput onSubmit={sendQuery} isSubmitting={isSubmitting} />

      <AIActionConfirmationModal
        action={selectedAction}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirmed={(result) => {
          appendSystemMessage(
            result.summary || "The pending AI action was executed successfully."
          );
          setSelectedAction(null);
        }}
        onCancelled={() => {
          appendSystemMessage("The pending AI action was cancelled.");
          setSelectedAction(null);
        }}
      />
    </div>
  );
}