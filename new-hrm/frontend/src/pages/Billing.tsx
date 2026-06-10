import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Users,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  captureBillingPayment,
  createInvoiceRazorpayOrder,
  getBillingOverview,
  getBillingPaymentConfig,
  submitEnterpriseInquiry,
  upgradeBillingPlan,
} from "@/services/Service";
import { formatDate } from "@/services/allFunctions";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { applyEntitlementsToStoredUser } from "@/lib/entitlements";
import { useAppDispatch } from "@/redux-toolkit/hooks/hook";
import { getLoginUser } from "@/redux-toolkit/slice/allPage/loginUserSlice";

type BillingInvoice = {
  id?: string;
  _id?: string;
  publicId?: string;
  invoiceNumber?: string;
  status?: string;
  total?: number;
  amountDue?: number;
  currency?: string;
  providerOrderId?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
};

type BillingOverview = {
  company: {
    id: string;
    name: string;
    planCode: string;
    status: string;
  };
  subscription: {
    _id?: string;
    publicId?: string;
    planCode?: string;
    status?: string;
    employeeLimit?: number | null;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  } | null;
  usage: {
    activeEmployees?: number;
    employeeLimit?: number | null;
    overageEmployees?: number;
  } | null;
  plans: Array<{
    code: string;
    name: string;
    priceMonthly?: number;
    employeeLimit?: number | null;
  }>;
  invoices: BillingInvoice[];
  entitlements?: string[];
  subscriptionPlan?: string | null;
};

type PaymentConfig = {
  provider: string;
  keyId: string;
  enabled: boolean;
};

function statusVariant(status?: string) {
  const normalized = (status || "").toUpperCase();
  if (["PAID", "ACTIVE", "TRIAL"].includes(normalized)) return "default";
  if (["OPEN", "PAST_DUE", "SUSPENDED"].includes(normalized)) return "secondary";
  return "outline";
}

const SELF_SERVE_PLAN_CODES = new Set(["free", "starter", "growth", "professional"]);
const PAYABLE_INVOICE_STATUSES = new Set(["OPEN", "PAST_DUE", "DRAFT"]);

function formatPlanPrice(plan: { code: string; priceMonthly?: number }) {
  if (plan.code === "free") {
    return " — Free";
  }
  if (plan.code === "enterprise" || (plan.priceMonthly === 0 && plan.code !== "free")) {
    return " — Custom pricing";
  }
  if (plan.priceMonthly == null) {
    return "";
  }
  return ` — ₹${plan.priceMonthly.toLocaleString("en-IN")}/mo`;
}

function getInvoiceId(invoice: BillingInvoice) {
  return invoice.id || invoice._id || "";
}

function getInvoiceAmountDue(invoice: BillingInvoice) {
  return invoice.amountDue ?? invoice.total ?? 0;
}

function isInvoicePayable(invoice: BillingInvoice) {
  const status = (invoice.status || "").toUpperCase();
  return PAYABLE_INVOICE_STATUSES.has(status) && getInvoiceAmountDue(invoice) > 0;
}

const Billing: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [enterpriseForm, setEnterpriseForm] = useState({
    contactName: "",
    contactEmail: "",
    companySize: "",
    message: "",
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [overviewResponse, configResponse] = await Promise.all([
        getBillingOverview(),
        getBillingPaymentConfig(),
      ]);
      const data = overviewResponse?.data?.data ?? overviewResponse?.data;
      const config = configResponse?.data?.data ?? configResponse?.data;
      setOverview(data);
      setPaymentConfig(config);
      if (Array.isArray(data?.entitlements)) {
        const updatedUser = applyEntitlementsToStoredUser(
          data.entitlements,
          data.subscriptionPlan
        );
        if (updatedUser) {
          dispatch(getLoginUser(updatedUser));
        }
      }
      if (data?.subscription?.planCode) {
        setSelectedPlan(data.subscription.planCode);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load billing",
        description: error?.response?.data?.error?.message || error?.message || "Try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const upgradeOptions = useMemo(() => {
    if (!overview?.plans?.length) return [];
    const currentPlan = overview.subscription?.planCode || overview.company.planCode;
    return overview.plans.filter(
      (plan) => plan.code !== currentPlan && SELF_SERVE_PLAN_CODES.has(plan.code)
    );
  }, [overview]);

  const enterprisePlan = useMemo(
    () => overview?.plans?.find((plan) => plan.code === "enterprise"),
    [overview]
  );

  const payableInvoices = useMemo(
    () => (overview?.invoices || []).filter(isInvoicePayable),
    [overview]
  );

  const selectedPlanDetails = useMemo(
    () => overview?.plans?.find((plan) => plan.code === selectedPlan),
    [overview?.plans, selectedPlan]
  );

  const isPaidPlanSelection =
    selectedPlanDetails != null &&
    selectedPlanDetails.code !== "free" &&
    (selectedPlanDetails.priceMonthly ?? 0) > 0;

  const paidUpgradeBlocked = isPaidPlanSelection && !paymentConfig?.enabled;

  const handleEnterpriseInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittingInquiry(true);
    try {
      await submitEnterpriseInquiry(enterpriseForm);
      toast({
        title: "Inquiry sent",
        description: "Our sales team will contact you about Enterprise pricing.",
      });
      setEnterpriseForm({ contactName: "", contactEmail: "", companySize: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Could not send inquiry",
        description: error?.response?.data?.message || error?.message || "Try again later",
        variant: "destructive",
      });
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      toast({ title: "Select a plan to upgrade", variant: "destructive" });
      return;
    }

    if (paidUpgradeBlocked) {
      toast({
        title: "Payment provider not configured",
        description:
          "Paid plan upgrades are available after Razorpay keys are added. You can still switch to the Free plan.",
        variant: "destructive",
      });
      return;
    }

    setUpgrading(true);
    try {
      await upgradeBillingPlan(selectedPlan);
      const overviewResponse = await getBillingOverview();
      const data = overviewResponse?.data?.data ?? overviewResponse?.data;
      setOverview(data);
      if (Array.isArray(data?.entitlements)) {
        const updatedUser = applyEntitlementsToStoredUser(
          data.entitlements,
          data.subscriptionPlan
        );
        if (updatedUser) {
          dispatch(getLoginUser(updatedUser));
        }
      }
      const openInvoiceCount = (data?.invoices || []).filter(isInvoicePayable).length;
      toast({
        title: "Plan upgraded",
        description:
          openInvoiceCount > 0
            ? `Your subscription is now on ${selectedPlan}. Complete payment on ${openInvoiceCount} open invoice${openInvoiceCount > 1 ? "s" : ""} below.`
            : `Your subscription is now on the ${selectedPlan} plan.`,
      });
    } catch (error: any) {
      toast({
        title: "Upgrade failed",
        description: error?.response?.data?.error?.message || error?.message || "Try again later",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handlePayInvoice = async (invoice: BillingInvoice) => {
    const invoiceId = getInvoiceId(invoice);
    if (!invoiceId) {
      toast({ title: "Invoice reference missing", variant: "destructive" });
      return;
    }

    if (!paymentConfig?.enabled || !paymentConfig.keyId) {
      toast({
        title: "Razorpay not configured",
        description: "Set Razorpay_KEY_ID and Razorpay_KEY_SECRET in the server environment.",
        variant: "destructive",
      });
      return;
    }

    const amountDue = getInvoiceAmountDue(invoice);
    const currency = invoice.currency || "INR";

    setPayingInvoiceId(invoiceId);
    try {
      const orderResponse = await createInvoiceRazorpayOrder(invoiceId);
      const orderInvoice = orderResponse?.data?.data ?? orderResponse?.data;
      const orderId = orderInvoice?.providerOrderId;
      if (!orderId) {
        throw new Error("Razorpay order was not created");
      }

      await openRazorpayCheckout({
        key: paymentConfig.keyId,
        orderId,
        amountInPaise: Math.round(amountDue * 100),
        currency,
        name: overview?.company?.name || "HRM Platform",
        description: `Invoice ${invoice.invoiceNumber || invoice.publicId || invoiceId}`,
        prefill: {
          name: user?.username || user?.fullName || undefined,
          email: user?.email || undefined,
        },
        onSuccess: async (payment) => {
          await captureBillingPayment({
            paymentId: payment.razorpay_payment_id,
            amountInPaise: Math.round(amountDue * 100),
            currency,
            invoiceId,
          });
          await loadOverview();
          toast({
            title: "Payment successful",
            description: "Your invoice has been paid.",
          });
        },
      });
    } catch (error: any) {
      if (error?.message === "Payment cancelled") {
        return;
      }
      toast({
        title: "Payment failed",
        description: error?.response?.data?.error?.message || error?.message || "Try again later",
        variant: "destructive",
      });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Billing | HRM</title>
      </Helmet>

      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your plan and pay open invoices securely via Razorpay.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold capitalize">
                  {overview?.subscription?.planCode || overview?.company?.planCode || "—"}
                </p>
                <Badge variant={statusVariant(overview?.subscription?.status)} className="mt-2">
                  {overview?.subscription?.status || "UNKNOWN"}
                </Badge>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Seat Usage</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {overview?.usage?.activeEmployees ?? 0}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / {overview?.usage?.employeeLimit ?? overview?.subscription?.employeeLimit ?? "∞"}
                  </span>
                </p>
                {(overview?.usage?.overageEmployees ?? 0) > 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    {overview?.usage?.overageEmployees} over limit
                  </p>
                )}
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Trial / Period</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trial ends</p>
                <p className="text-lg font-semibold">
                  {overview?.subscription?.trialEndsAt
                    ? formatDate(overview.subscription.trialEndsAt)
                    : overview?.subscription?.currentPeriodEnd
                      ? formatDate(overview.subscription.currentPeriodEnd)
                      : "—"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {payableInvoices.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader>
              <CardTitle>Payment required</CardTitle>
              <CardDescription>
                {payableInvoices.length} open invoice{payableInvoices.length > 1 ? "s" : ""} awaiting
                Razorpay payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payableInvoices.map((invoice) => {
                const invoiceId = getInvoiceId(invoice);
                const amountDue = getInvoiceAmountDue(invoice);
                return (
                  <div
                    key={invoiceId}
                    className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {invoice.invoiceNumber || invoice.publicId || invoiceId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.currency || "INR"} {amountDue.toLocaleString("en-IN")} due
                      </p>
                    </div>
                    <Button
                      onClick={() => handlePayInvoice(invoice)}
                      disabled={payingInvoiceId === invoiceId || !paymentConfig?.enabled}
                    >
                      {payingInvoiceId === invoiceId ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Pay with Razorpay
                    </Button>
                  </div>
                );
              })}
              {!paymentConfig?.enabled && (
                <p className="text-sm text-amber-800">
                  Razorpay keys are not configured on the server. Add Razorpay_KEY_ID and
                  Razorpay_KEY_SECRET to enable checkout.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upgrade Plan</CardTitle>
            <CardDescription>
              Starter, Growth, and Professional can be changed here. If a proration charge applies,
              an open invoice will appear above for Razorpay payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Select target plan</p>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {upgradeOptions.map((plan) => (
                    <SelectItem key={plan.code} value={plan.code}>
                      {plan.name} ({plan.code}){formatPlanPrice(plan)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={upgrading || !selectedPlan || paidUpgradeBlocked}
            >
              {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upgrade
            </Button>
            {paidUpgradeBlocked ? (
              <p className="text-sm text-amber-800 md:col-span-2">
                Razorpay is not configured yet. Paid upgrades will unlock once payment keys are
                added. Free plan changes remain available.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {enterprisePlan && (
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>
                Custom pricing based on the features and scale your organization needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <p>
                Enterprise is not self-serve. Request a tailored quote (SSO, white-label, lead
                portal, custom integrations, unlimited seats).
              </p>
              <p className="font-medium">Custom pricing — not ₹0/mo</p>
              <form onSubmit={handleEnterpriseInquiry} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enterpriseName">Contact name</Label>
                  <Input
                    id="enterpriseName"
                    value={enterpriseForm.contactName}
                    onChange={(e) =>
                      setEnterpriseForm((current) => ({ ...current, contactName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enterpriseEmail">Work email</Label>
                  <Input
                    id="enterpriseEmail"
                    type="email"
                    value={enterpriseForm.contactEmail}
                    onChange={(e) =>
                      setEnterpriseForm((current) => ({ ...current, contactEmail: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="enterpriseSize">Company size (optional)</Label>
                  <Input
                    id="enterpriseSize"
                    placeholder="e.g. 250 employees"
                    value={enterpriseForm.companySize}
                    onChange={(e) =>
                      setEnterpriseForm((current) => ({ ...current, companySize: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="enterpriseMessage">What do you need?</Label>
                  <Textarea
                    id="enterpriseMessage"
                    value={enterpriseForm.message}
                    onChange={(e) =>
                      setEnterpriseForm((current) => ({ ...current, message: e.target.value }))
                    }
                    placeholder="SSO, white-label, integrations, seat count..."
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingInquiry} className="md:col-span-2 w-fit">
                  {submittingInquiry ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Request Enterprise quote
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Recent billing activity for your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {!overview?.invoices?.length ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <AlertCircle className="h-4 w-4" />
                No invoices yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.invoices.map((invoice) => {
                    const invoiceId = getInvoiceId(invoice);
                    const payable = isInvoicePayable(invoice);
                    const amountDue = getInvoiceAmountDue(invoice);
                    return (
                      <TableRow key={invoiceId || invoice.publicId || invoice.invoiceNumber}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber || invoice.publicId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(invoice.status)}>
                            {invoice.status || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.currency || "INR"}{" "}
                          {(payable ? amountDue : invoice.total ?? 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          {invoice.paidAt
                            ? formatDate(invoice.paidAt)
                            : invoice.createdAt
                              ? formatDate(invoice.createdAt)
                              : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {payable ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayInvoice(invoice)}
                              disabled={payingInvoiceId === invoiceId || !paymentConfig?.enabled}
                            >
                              {payingInvoiceId === invoiceId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Pay now"
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {overview?.company?.status === "ARCHIVED" && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-700" />
              <p className="text-sm text-amber-900">
                This organization is archived. Write operations are disabled until restored.
              </p>
            </CardContent>
          </Card>
        )}

        {overview?.subscription?.status === "TRIAL" && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <p className="text-sm text-emerald-900">
                You are on a trial plan. Upgrade before trial ends to keep premium features.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default Billing;