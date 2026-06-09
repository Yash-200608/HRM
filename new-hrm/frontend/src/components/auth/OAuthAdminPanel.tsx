import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link2, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getOAuthIdentities,
  getOAuthIdentityAudit,
  revokeOAuthIdentity,
  disableOAuthIdentity,
  getOAuthSecurityEvents,
  forceOAuthLogoutAll,
  forceOAuthReauth,
} from "@/services/Service";

type OAuthIdentity = {
  id: string;
  provider: string;
  email: string;
  accountType: string;
  userId: string;
  linkedAt?: string | null;
  lastLoginAt?: string | null;
  revokedAt?: string | null;
  disabledAt?: string | null;
};

type OAuthSecurityEvent = {
  id: string;
  eventType: string;
  provider?: string | null;
  email?: string | null;
  accountType?: string | null;
  reason?: string;
  createdAt?: string | null;
};

const identityStatus = (identity: OAuthIdentity) => {
  if (identity.revokedAt) return "revoked";
  if (identity.disabledAt) return "disabled";
  return "active";
};

const statusVariant = (status: string) => {
  if (status === "active") return "default";
  if (status === "disabled") return "secondary";
  return "destructive";
};

type OAuthAdminPanelProps = {
  isSuperAdmin?: boolean;
};

const OAuthAdminPanel: React.FC<OAuthAdminPanelProps> = ({ isSuperAdmin = false }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [identities, setIdentities] = useState<OAuthIdentity[]>([]);
  const [events, setEvents] = useState<OAuthSecurityEvent[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [reauthAccountType, setReauthAccountType] = useState("admin");
  const [reauthUserId, setReauthUserId] = useState("");

  const identityParams = useMemo(() => {
    const params: Record<string, string> = { limit: "50" };
    if (providerFilter !== "all") params.provider = providerFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    if (emailFilter.trim()) params.email = emailFilter.trim();
    return params;
  }, [providerFilter, statusFilter, emailFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const [identityRes, eventRes] = await Promise.all([
        getOAuthIdentities(identityParams),
        getOAuthSecurityEvents({ limit: 25 }),
      ]);
      setIdentities(identityRes?.data?.identities ?? []);
      setEvents(eventRes?.data?.events ?? []);
    } catch (error: any) {
      toast({
        title: "Failed to load OAuth admin data",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [identityParams]);

  const handleAudit = async (identityId: string) => {
    setActionId(identityId);
    try {
      const response = await getOAuthIdentityAudit(identityId);
      setSelectedAudit(response?.data ?? null);
    } catch (error: any) {
      toast({
        title: "Audit load failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleRevoke = async (identityId: string) => {
    setActionId(identityId);
    try {
      await revokeOAuthIdentity(identityId);
      toast({ title: "OAuth identity revoked" });
      setSelectedAudit(null);
      await load();
    } catch (error: any) {
      toast({
        title: "Revoke failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDisable = async (identityId: string) => {
    setActionId(identityId);
    try {
      await disableOAuthIdentity(identityId);
      toast({ title: "OAuth identity disabled" });
      setSelectedAudit(null);
      await load();
    } catch (error: any) {
      toast({
        title: "Disable failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleForceLogoutAll = async () => {
    if (!window.confirm("Invalidate all platform sessions? Users will need to sign in again.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await forceOAuthLogoutAll();
      toast({
        title: "All sessions invalidated",
        description: `${response?.data?.modifiedCount ?? 0} accounts updated`,
      });
    } catch (error: any) {
      toast({
        title: "Force logout failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceReauth = async () => {
    if (!reauthUserId.trim()) {
      toast({ title: "User ID required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await forceOAuthReauth(reauthAccountType, reauthUserId.trim());
      toast({ title: "Account reauthentication required" });
      setReauthUserId("");
    } catch (error: any) {
      toast({
        title: "Force reauth failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && identities.length === 0 && events.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            OAuth identities
          </CardTitle>
          <CardDescription>
            Review linked Google and Microsoft accounts, audit usage, and revoke suspicious bindings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="microsoft">Microsoft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input
                placeholder="Filter by email"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {identities.map((identity) => {
                const status = identityStatus(identity);
                const busy = actionId === identity.id;
                return (
                  <TableRow key={identity.id}>
                    <TableCell className="capitalize">{identity.provider}</TableCell>
                    <TableCell>{identity.email}</TableCell>
                    <TableCell>{identity.accountType}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(status)}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      {identity.lastLoginAt
                        ? new Date(identity.lastLoginAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleAudit(identity.id)}
                        >
                          Audit
                        </Button>
                        {status === "active" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleDisable(identity.id)}
                            >
                              Disable
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => handleRevoke(identity.id)}
                            >
                              Revoke
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {selectedAudit ? (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <p className="font-medium">Identity audit</p>
              <p className="text-sm text-muted-foreground">
                Status: {selectedAudit.status} · Linked{" "}
                {selectedAudit.usage?.linkedAt
                  ? new Date(selectedAudit.usage.linkedAt).toLocaleString()
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                Subject: {selectedAudit.identity?.subject} · Tenant:{" "}
                {selectedAudit.identity?.tenantId || "—"}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OAuth security events</CardTitle>
          <CardDescription>Recent login, linking, and incident events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {event.createdAt ? new Date(event.createdAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>{event.eventType}</TableCell>
                  <TableCell>{event.provider || "—"}</TableCell>
                  <TableCell>{event.email || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{event.reason || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isSuperAdmin ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Incident response
            </CardTitle>
            <CardDescription>
              Platform-wide session controls for OAuth security incidents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="destructive" onClick={handleForceLogoutAll} disabled={loading}>
              Force logout all sessions
            </Button>
            <div className="grid gap-3 md:grid-cols-3 items-end max-w-2xl">
              <div className="space-y-2">
                <Label>Account type</Label>
                <Select value={reauthAccountType} onValueChange={setReauthAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="super_admin">Super admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>User ID</Label>
                <Input
                  placeholder="MongoDB user id"
                  value={reauthUserId}
                  onChange={(e) => setReauthUserId(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={handleForceReauth} disabled={loading}>
                Force account reauthentication
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default OAuthAdminPanel;