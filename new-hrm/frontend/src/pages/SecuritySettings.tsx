import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
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
import { useToast } from "@/hooks/use-toast";
import {
  setupMfa,
  enableMfa,
  disableMfa,
  regenerateMfaRecoveryCodes,
  downloadComplianceExport,
  getScimConfig,
  rotateScimToken,
} from "@/services/Service";
import { Shield, Download, KeyRound, Users } from "lucide-react";
import OAuthAdminPanel from "@/components/auth/OAuthAdminPanel";

const SecuritySettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scimConfig, setScimConfig] = useState<any>(null);
  const [scimToken, setScimToken] = useState<string | null>(null);

  const canManageMfa = user?.role === "admin" || user?.role === "super_admin";
  const canManageScim = user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (!canManageScim) return;

    getScimConfig()
      .then((response) => setScimConfig(response.data?.data ?? null))
      .catch(() => setScimConfig(null));
  }, [canManageScim]);

  const handleSetupMfa = async () => {
    setLoading(true);
    try {
      const response = await setupMfa();
      setSetupData(response.data.data);
      toast({ title: "Scan the QR/setup key in your authenticator app" });
    } catch (error: any) {
      toast({
        title: "MFA setup failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    setLoading(true);
    try {
      const response = await enableMfa(code);
      const codes = response.data?.data?.recoveryCodes || [];
      setRecoveryCodes(codes);
      toast({ title: "MFA enabled — save your recovery codes now" });
      setSetupData(null);
      setCode("");
    } catch (error: any) {
      toast({
        title: "Enable failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setLoading(true);
    try {
      await disableMfa(code);
      toast({ title: "MFA disabled" });
      setRecoveryCodes([]);
      setCode("");
    } catch (error: any) {
      toast({
        title: "Disable failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    setLoading(true);
    try {
      const response = await regenerateMfaRecoveryCodes(code);
      setRecoveryCodes(response.data?.data?.recoveryCodes || []);
      toast({ title: "New recovery codes generated" });
    } catch (error: any) {
      toast({
        title: "Regeneration failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplianceExport = async () => {
    setLoading(true);
    try {
      const response = await downloadComplianceExport(
        user?.role === "super_admin" ? undefined : user?.companyId
      );
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `compliance-export-${user?.companyId || "platform"}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Compliance export downloaded" });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRotateScimToken = async () => {
    setLoading(true);
    try {
      const response = await rotateScimToken();
      setScimToken(response.data?.data?.token || null);
      setScimConfig((current: any) => ({
        ...current,
        enabled: true,
        tokenPrefix: response.data?.data?.tokenPrefix,
        lastRotatedAt: response.data?.data?.lastRotatedAt,
        baseUrl: response.data?.data?.baseUrl,
      }));
      toast({ title: "SCIM token rotated — copy it now" });
    } catch (error: any) {
      toast({
        title: "SCIM token rotation failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canManageMfa) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Security | HRM</title>
      </Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Security & Compliance</h1>
          <p className="text-muted-foreground">
            Manage MFA, OAuth identities, SCIM provisioning, and compliance exports.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Multi-factor authentication
            </CardTitle>
            <CardDescription>TOTP authenticator support with one-time recovery codes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!setupData ? (
              <Button onClick={handleSetupMfa} disabled={loading}>
                Start MFA setup
              </Button>
            ) : (
              <div className="space-y-3 rounded-md border p-4">
                <p className="text-sm font-medium">Setup key</p>
                <code className="block break-all text-xs bg-muted p-2 rounded">
                  {setupData.secret}
                </code>
                <p className="text-xs text-muted-foreground break-all">{setupData.otpauthUrl}</p>
              </div>
            )}
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="mfaCode">Authenticator code</Label>
              <Input
                id="mfaCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={9}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleEnableMfa} disabled={loading || !code}>
                Enable MFA
              </Button>
              <Button variant="outline" onClick={handleDisableMfa} disabled={loading || !code}>
                Disable MFA
              </Button>
              <Button variant="outline" onClick={handleRegenerateRecoveryCodes} disabled={loading || !code}>
                Regenerate recovery codes
              </Button>
            </div>
            {recoveryCodes.length > 0 ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
                <p className="text-sm font-medium">Recovery codes (shown once)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recoveryCodes.map((recoveryCode) => (
                    <code key={recoveryCode} className="text-xs bg-muted p-2 rounded">
                      {recoveryCode}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <OAuthAdminPanel isSuperAdmin={isSuperAdmin} />

        {canManageScim ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                SCIM provisioning
              </CardTitle>
              <CardDescription>
                Read-only SCIM 2.0 directory sync for your IdP. Configure the bearer token below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={scimConfig?.enabled ? "default" : "secondary"}>
                  {scimConfig?.enabled ? "Enabled" : "Not configured"}
                </Badge>
                {scimConfig?.readOnly ? <Badge variant="outline">Read-only phase</Badge> : null}
              </div>
              {scimConfig?.baseUrl ? (
                <p className="text-sm text-muted-foreground">
                  Base URL: <code>{scimConfig.baseUrl}</code>
                </p>
              ) : null}
              {scimConfig?.tokenPrefix ? (
                <p className="text-sm text-muted-foreground">Token prefix: {scimConfig.tokenPrefix}</p>
              ) : null}
              <Button onClick={handleRotateScimToken} disabled={loading}>
                Rotate SCIM bearer token
              </Button>
              {scimToken ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <p className="text-sm font-medium">New bearer token (shown once)</p>
                  <code className="block break-all text-xs bg-muted p-2 rounded">{scimToken}</code>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance export
            </CardTitle>
            <CardDescription>
              Download audit events, billing snapshot, and usage for procurement evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleComplianceExport} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Download JSON export
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SecuritySettings;