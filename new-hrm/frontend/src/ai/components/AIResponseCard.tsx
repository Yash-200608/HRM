import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiChatMessage, AiPendingAction } from "@/ai/services/aiService";
import AIDataCardView from "@/ai/components/AIDataCardView";
import { getActionDisplayLabel } from "@/ai/lib/aiDisplayLabels";
import { Bot, ShieldAlert, User } from "lucide-react";

interface AIResponseCardProps {
  message: AiChatMessage;
  onReviewAction?: (action: AiPendingAction) => void;
}

export default function AIResponseCard({
  message,
  onReviewAction,
}: AIResponseCardProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <Card className={`max-w-3xl ${isUser ? "bg-muted/60" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {isUser ? (
              <>
                <User className="h-4 w-4" />
                You
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                AI Command Center
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{message.content}</p>

          {!isUser && message.dataCards?.length ? (
            <div className="space-y-3">
              {message.dataCards.map((card) => (
                <AIDataCardView key={`${card.type}-${card.title}`} card={card} />
              ))}
            </div>
          ) : null}

          {!isUser && message.pendingActions?.length ? (
            <div className="space-y-2">
              {message.pendingActions.map((action) => (
                <div
                  key={action.draftId}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{getActionDisplayLabel(action.actionType)}</p>
                    <p className="text-muted-foreground">
                      {action.summary || "This action needs your approval before it runs."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onReviewAction?.(action)}
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}