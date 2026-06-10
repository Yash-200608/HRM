import { confirmAiAction, cancelAiAction } from "@/ai/services/aiService";
import { AiPendingAction } from "@/ai/services/aiService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface AIActionConfirmationModalProps {
  action: AiPendingAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (result: { summary?: string }) => void;
  onCancelled?: () => void;
}

export default function AIActionConfirmationModal({
  action,
  open,
  onOpenChange,
  onConfirmed,
  onCancelled,
}: AIActionConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!action?.draftId) {
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const result = await confirmAiAction(action.draftId);
      onConfirmed({
        summary: result.result?.summary || "Action executed successfully.",
      });
      onOpenChange(false);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : "Failed to confirm action";
      setError(message || "Failed to confirm action");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleCancel() {
    if (!action?.draftId) {
      onOpenChange(false);
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      await cancelAiAction(action.draftId);
      onCancelled?.();
      onOpenChange(false);
    } catch {
      setError("Failed to cancel action draft");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Confirm AI Action
          </DialogTitle>
          <DialogDescription>
            Review this action carefully. Nothing will be executed until you confirm.
          </DialogDescription>
        </DialogHeader>

        {action ? (
          <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
            <p>
              <span className="font-medium">Action:</span> {action.actionType}
            </p>
            {action.summary ? (
              <p>
                <span className="font-medium">Summary:</span> {action.summary}
              </p>
            ) : null}
            <pre className="max-h-48 overflow-auto rounded bg-background p-3 text-xs text-muted-foreground">
              {JSON.stringify(action.preview, null, 2)}
            </pre>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming || isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling
              </>
            ) : (
              "Cancel Draft"
            )}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || isCancelling}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming
              </>
            ) : (
              "Confirm & Execute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}