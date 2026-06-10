import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { enableMfaEnrollment, setupMfaEnrollment } from "@/services/Service";
import MfaSetupQrCode from "@/components/auth/MfaSetupQrCode";

type MfaEnrollmentChallengeProps = {
  mfaEnrollmentToken: string;
  email?: string;
  onSuccess: (payload: { accessToken: string; user: any; recoveryCodes: string[] }) => void;
  onCancel?: () => void;
};

const MfaEnrollmentChallenge: React.FC<MfaEnrollmentChallengeProps> = ({
  mfaEnrollmentToken,
  email,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [completedSession, setCompletedSession] = useState<{
    accessToken: string;
    user: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSetup = async () => {
      setInitializing(true);
      try {
        const response = await setupMfaEnrollment(mfaEnrollmentToken);
        if (active) {
          setSetupData(response.data?.data ?? null);
        }
      } catch (error: any) {
        toast({
          title: "MFA setup failed",
          description: error?.response?.data?.message || error?.message,
          variant: "destructive",
        });
        onCancel?.();
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    loadSetup();

    return () => {
      active = false;
    };
    // Only re-run when the enrollment token changes — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaEnrollmentToken]);

  const handleEnable = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await enableMfaEnrollment(mfaEnrollmentToken, code);
      const codes = response.data?.data?.recoveryCodes || [];
      setRecoveryCodes(codes);
      setCompletedSession({
        accessToken: response.data.accessToken,
        user: response.data.user,
      });
    } catch (error: any) {
      toast({
        title: "MFA enrollment failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setting up MFA</CardTitle>
          <CardDescription>Preparing your authenticator setup...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (recoveryCodes.length > 0 && completedSession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Save your recovery codes</CardTitle>
          <CardDescription>
            Store these codes somewhere safe. Each code can be used once if you lose access to your authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recoveryCodes.map((recoveryCode) => (
            <div key={recoveryCode} className="rounded-lg border bg-slate-50 px-3 py-2 font-mono text-sm">
              {recoveryCode}
            </div>
          ))}
          <Button
            type="button"
            className="w-full"
            onClick={() =>
              onSuccess({
                ...completedSession,
                recoveryCodes,
              })
            }
          >
            Continue to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set up two-factor authentication</CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app, then enter the 6-digit code
          {email ? ` for ${email}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEnable} className="space-y-4">
          {setupData ? (
            <MfaSetupQrCode
              secret={setupData.secret}
              otpauthUrl={setupData.otpauthUrl}
              email={email}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="mfaEnrollCode">Authentication code</Label>
            <Input
              id="mfaEnrollCode"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="123456"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !setupData}>
            {loading ? "Enabling MFA..." : "Enable MFA and continue"}
          </Button>

          {onCancel ? (
            <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
              Back to login
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
};

export default MfaEnrollmentChallenge;