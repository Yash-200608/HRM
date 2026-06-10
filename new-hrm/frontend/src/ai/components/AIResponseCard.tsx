import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiChatMessage, AiPendingAction } from "@/ai/services/aiService";
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
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{message.content}</p>

          {!isUser && message.toolsUsed?.length ? (
            <p className="text-xs text-muted-foreground">
              Tools used: {message.toolsUsed.join(", ")}
            </p>
          ) : null}

          {!isUser && message.pendingActions?.length ? (
            <div className="space-y-2">
              {message.pendingActions.map((action) => (
                <div
                  key={action.draftId}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{action.actionType}</p>
                    <p className="text-muted-foreground">
                      {action.summary || "This action requires your confirmation."}
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

          {!isUser && message.dataCards?.length ? (
            <div className="space-y-2">
              {message.dataCards.map((card) => (
                <div
                  key={`${card.type}-${card.title}`}
                  className="rounded-md border bg-background p-3"
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.title}
                  </p>
                  {"summary" in (card.payload as object) &&
                  "atRiskEmployees" in (card.payload as object) ? (
                    <div className="space-y-2 text-xs">
                      <p>
                        At risk:{" "}
                        {(card.payload as { summary?: { atRiskCount?: number } }).summary
                          ?.atRiskCount ?? 0}
                      </p>
                      {(
                        (card.payload as { atRiskEmployees?: Array<{ employeeName: string; riskScore: number; riskLevel: string }> })
                          .atRiskEmployees || []
                      )
                        .slice(0, 5)
                        .map((employee) => (
                          <div key={employee.employeeName} className="rounded border p-2">
                            <p className="font-medium">
                              {employee.employeeName} — {employee.riskLevel} ({employee.riskScore})
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <pre className="overflow-x-auto text-xs text-muted-foreground">
                      {JSON.stringify(card.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}