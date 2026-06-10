import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Shield, Sparkles, BarChart3, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AiPolicy,
  fetchAiAdminAnalytics,
  fetchAiPolicy,
  updateAiPolicy,
} from "@/ai/services/aiService";

const DEFAULT_POLICY_MEMORY: AiPolicy["memory"] = {
  enabled: true,
  retentionDays: 30,
  maxMessagesPerConversation: 50,
  contextWindowMessages: 10,
};

const DEFAULT_EMPLOYEE_RESTRICTIONS: AiPolicy["employeeRestrictions"] = {
  blockActionTools: true,
  blockPredictiveIntelligence: true,
  blockSeatUtilization: true,
};

function normalizePolicy(policy: AiPolicy): AiPolicy {
  return {
    ...policy,
    memory: {
      ...DEFAULT_POLICY_MEMORY,
      ...(policy.memory || {}),
    },
    employeeRestrictions: {
      ...DEFAULT_EMPLOYEE_RESTRICTIONS,
      ...(policy.employeeRestrictions || {}),
    },
  };
}

function getQueryErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function AIAdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [policyDraft, setPolicyDraft] = useState<AiPolicy | null>(null);

  const analyticsQuery = useQuery({
    queryKey: ["ai", "admin", "analytics"],
    queryFn: () => fetchAiAdminAnalytics(30),
  });

  const policyQuery = useQuery({
    queryKey: ["ai", "policy"],
    queryFn: fetchAiPolicy,
  });

  useEffect(() => {
    if (policyQuery.data) {
      setPolicyDraft(normalizePolicy(policyQuery.data));
    }
  }, [policyQuery.data]);

  const policyMutation = useMutation({
    mutationFn: updateAiPolicy,
    onSuccess: (policy) => {
      setPolicyDraft(normalizePolicy(policy));
      queryClient.invalidateQueries({ queryKey: ["ai", "policy"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "admin", "analytics"] });
      toast({ title: "AI policy updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update AI policy",
        description: getQueryErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    },
  });

  const analytics = analyticsQuery.data;
  const analyticsLoading = analyticsQuery.isPending;
  const policyLoading = policyQuery.isPending;
  const hasLoadError = analyticsQuery.isError || policyQuery.isError;

  return (
    <>
      <Helmet>
        <title>AI Admin | HRM</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">AI Administration</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization-wide AI usage analytics, policy controls, and memory settings.
          </p>
        </div>

        {hasLoadError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load AI admin data</AlertTitle>
            <AlertDescription className="space-y-2">
              {analyticsQuery.isError ? (
                <p>{getQueryErrorMessage(analyticsQuery.error, "Analytics request failed.")}</p>
              ) : null}
              {policyQuery.isError ? (
                <p>{getQueryErrorMessage(policyQuery.error, "Policy request failed.")}</p>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  analyticsQuery.refetch();
                  policyQuery.refetch();
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {analyticsLoading ? (
            <div className="col-span-full flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading analytics…
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Queries (30d)</CardDescription>
                  <CardTitle className="text-3xl">{analytics?.summary.totalQueries ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Tool executions</CardDescription>
                  <CardTitle className="text-3xl">{analytics?.summary.totalToolExecutions ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Failure rate</CardDescription>
                  <CardTitle className="text-3xl">
                    {analytics?.summary.failureRatePercent ?? 0}%
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active conversations</CardDescription>
                  <CardTitle className="text-3xl">
                    {analytics?.summary.activeConversations ?? 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage breakdown
              </CardTitle>
              <CardDescription>Last {analytics?.windowDays ?? 30} days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading usage data…
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Audit action</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics?.auditByAction ?? []).map((row) => (
                        <TableRow key={row.action}>
                          <TableCell className="font-mono text-xs">{row.action}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div>
                    <h3 className="mb-2 text-sm font-medium">Top tools</h3>
                    <div className="flex flex-wrap gap-2">
                      {(analytics?.topTools ?? []).map((tool) => (
                        <Badge key={tool.toolName} variant="secondary">
                          {tool.toolName} ({tool.count})
                        </Badge>
                      ))}
                      {!analytics?.topTools?.length ? (
                        <span className="text-sm text-muted-foreground">No tool activity yet</span>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Organization AI policy
              </CardTitle>
              <CardDescription>
                Control scopes, employee restrictions, and conversation memory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {policyLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading policy…
                </div>
              ) : policyDraft ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="ai-enabled">AI enabled</Label>
                      <p className="text-xs text-muted-foreground">
                        Disable to block all AI queries for this organization.
                      </p>
                    </div>
                    <Switch
                      id="ai-enabled"
                      checked={policyDraft.enabled}
                      onCheckedChange={(checked) =>
                        setPolicyDraft({ ...policyDraft, enabled: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="memory-enabled">Conversation memory</Label>
                      <p className="text-xs text-muted-foreground">
                        Persist tenant-scoped chat history for context windows.
                      </p>
                    </div>
                    <Switch
                      id="memory-enabled"
                      checked={policyDraft.memory.enabled}
                      onCheckedChange={(checked) =>
                        setPolicyDraft({
                          ...policyDraft,
                          memory: { ...policyDraft.memory, enabled: checked },
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="retention-days">Retention (days)</Label>
                    <Input
                      id="retention-days"
                      type="number"
                      min={1}
                      max={365}
                      value={policyDraft.memory.retentionDays}
                      onChange={(e) =>
                        setPolicyDraft({
                          ...policyDraft,
                          memory: {
                            ...policyDraft.memory,
                            retentionDays: Number(e.target.value) || 30,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="context-window">Context window messages</Label>
                    <Input
                      id="context-window"
                      type="number"
                      min={0}
                      max={30}
                      value={policyDraft.memory.contextWindowMessages}
                      onChange={(e) =>
                        setPolicyDraft({
                          ...policyDraft,
                          memory: {
                            ...policyDraft.memory,
                            contextWindowMessages: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Employee action tools</Label>
                      <p className="text-xs text-muted-foreground">
                        Block draft/confirm action tools for employee roles.
                      </p>
                    </div>
                    <Switch
                      checked={policyDraft.employeeRestrictions.blockActionTools}
                      onCheckedChange={(checked) =>
                        setPolicyDraft({
                          ...policyDraft,
                          employeeRestrictions: {
                            ...policyDraft.employeeRestrictions,
                            blockActionTools: checked,
                          },
                        })
                      }
                    />
                  </div>

                  <Button
                    onClick={() => policyMutation.mutate(policyDraft)}
                    disabled={policyMutation.isPending}
                  >
                    {policyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save policy"
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Policy settings are unavailable right now.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}