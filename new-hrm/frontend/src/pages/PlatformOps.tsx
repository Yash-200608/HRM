import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Loader2,
  Server,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getPlatformSlaDashboard,
  getIncidentRunbooks,
  getIncidentRunbook,
} from "@/services/Service";

type SlaIndicator = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  target: number;
  status: "healthy" | "warning" | "critical" | "unknown";
};

type RunbookSummary = {
  id: string;
  title: string;
  category: string;
  severity: string;
};

const statusVariant = (status: string) => {
  if (status === "healthy") return "default";
  if (status === "warning") return "secondary";
  if (status === "critical") return "destructive";
  return "outline";
};

const PlatformOps: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [runbooks, setRunbooks] = useState<RunbookSummary[]>([]);
  const [selectedRunbook, setSelectedRunbook] = useState<any>(null);
  const [loadingRunbook, setLoadingRunbook] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [slaRes, runbookRes] = await Promise.all([
        getPlatformSlaDashboard(),
        getIncidentRunbooks(),
      ]);
      setDashboard(slaRes?.data?.data ?? null);
      setRunbooks(runbookRes?.data?.data ?? []);
    } catch (error: any) {
      toast({
        title: "Failed to load platform operations data",
        description: error?.response?.data?.error?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openRunbook = async (id: string) => {
    setLoadingRunbook(true);
    try {
      const response = await getIncidentRunbook(id);
      setSelectedRunbook(response?.data?.data ?? null);
    } catch (error: any) {
      toast({
        title: "Failed to load runbook",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRunbook(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const indicators: SlaIndicator[] = dashboard?.indicators ?? [];
  const recommendedIds: string[] = dashboard?.recommendedRunbookIds ?? [];

  return (
    <>
      <Helmet>
        <title>Platform Ops | HRM</title>
      </Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Platform Operations</h1>
              <p className="text-muted-foreground">
                SLA health, service signals, and incident runbooks for on-call response.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(dashboard?.overallStatus || "unknown")}>
              Overall: {dashboard?.overallStatus || "unknown"}
            </Badge>
            <Button variant="outline" size="sm" onClick={load}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(dashboard?.services ?? []).map((service: any) => (
            <Card key={service.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {service.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={statusVariant(service.status)}>{service.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SLA indicators</CardTitle>
            <CardDescription>
              Generated {dashboard?.generatedAt ? new Date(dashboard.generatedAt).toLocaleString() : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {indicators.map((indicator) => (
              <div
                key={indicator.key}
                className="rounded-lg border p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{indicator.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Target: {indicator.target}
                    {indicator.unit === "percent" ? "%" : ` ${indicator.unit}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {indicator.value ?? "—"}
                    {indicator.unit === "percent" && indicator.value != null ? "%" : ""}
                  </p>
                  <Badge variant={statusVariant(indicator.status)}>{indicator.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {recommendedIds.length > 0 ? (
          <Card className="border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                Recommended runbooks
              </CardTitle>
              <CardDescription>Based on current SLA indicator status.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {recommendedIds.map((id) => (
                <Button key={id} variant="outline" size="sm" onClick={() => openRunbook(id)}>
                  {runbooks.find((runbook) => runbook.id === id)?.title || id}
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              All SLA indicators are healthy. No runbooks recommended.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Incident runbooks
            </CardTitle>
            <CardDescription>Operational playbooks for platform incidents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              {runbooks.map((runbook) => (
                <button
                  key={runbook.id}
                  type="button"
                  onClick={() => openRunbook(runbook.id)}
                  className="rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{runbook.title}</p>
                    <Badge variant="outline">{runbook.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">{runbook.category}</p>
                </button>
              ))}
            </div>

            {loadingRunbook ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {selectedRunbook ? (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <div>
                  <h3 className="text-lg font-semibold">{selectedRunbook.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedRunbook.escalation}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Symptoms</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(selectedRunbook.symptoms || []).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Response steps</p>
                  <ol className="list-decimal pl-5 text-sm space-y-2">
                    {(selectedRunbook.steps || []).map((step: string) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PlatformOps;