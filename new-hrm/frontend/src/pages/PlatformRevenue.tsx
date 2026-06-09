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
import {
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformMetrics } from "@/services/Service";

type PlatformMetricsResponse = {
  metrics: {
    mrr?: number;
    arr?: number;
    revenue?: number;
    activeOrganizations?: number;
    trials?: number;
    conversions?: number;
    churn?: number;
    paymentFailures?: number;
    planDistribution?: Array<{ planCode: string; count: number }>;
  } | null;
  revenue: {
    revenue?: number;
    failedPayments?: number;
    openInvoices?: number;
  } | null;
  upstream?: {
    metricsAvailable?: boolean;
    revenueAvailable?: boolean;
  };
};

const PlatformRevenue: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlatformMetricsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await getPlatformMetrics();
        setData(response?.data?.data ?? response?.data ?? null);
      } catch (error: any) {
        toast({
          title: "Failed to load platform metrics",
          description: error?.response?.data?.error?.message || error?.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const revenue = data?.revenue;

  return (
    <>
      <Helmet>
        <title>Platform Revenue | HRM</title>
      </Helmet>

      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Revenue</h1>
          <p className="text-muted-foreground">
            Subscription MRR, trials, and billing health across all tenants.
          </p>
        </div>

        {!data?.upstream?.metricsAvailable && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <p className="text-sm text-amber-900">
                Subscription admin metrics are unavailable. Ensure Subscription service and INTERNAL_API_KEY are configured.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-bold">₹{metrics?.mrr?.toLocaleString() ?? 0}</p>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ARR</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-bold">₹{metrics?.arr?.toLocaleString() ?? 0}</p>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Orgs</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-bold">{metrics?.activeOrganizations ?? 0}</p>
              <Users className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Trials</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-bold">{metrics?.trials ?? 0}</p>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Summary</CardTitle>
              <CardDescription>Paid invoice totals and open billing items.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collected revenue</span>
                <span className="font-semibold">₹{revenue?.revenue?.toLocaleString() ?? metrics?.revenue?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open invoices</span>
                <span className="font-semibold">{revenue?.openInvoices ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed payments</span>
                <span className="font-semibold text-red-600">
                  {revenue?.failedPayments ?? metrics?.paymentFailures ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>Active subscriptions by plan code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(metrics?.planDistribution ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No plan data available.</p>
              ) : (
                metrics?.planDistribution?.map((entry) => (
                  <div key={entry.planCode} className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">
                      {entry.planCode}
                    </Badge>
                    <span className="font-medium">{entry.count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PlatformRevenue;