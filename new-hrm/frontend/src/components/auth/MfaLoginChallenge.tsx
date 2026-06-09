import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { verifyMfaLogin } from "@/services/Service";

type MfaLoginChallengeProps = {
  mfaChallengeToken: string;
  email?: string;
  onSuccess: (payload: { accessToken: string; user: any }) => void;
  onCancel?: () => void;
};

const MfaLoginChallenge: React.FC<MfaLoginChallengeProps> = ({
  mfaChallengeToken,
  email,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await verifyMfaLogin(mfaChallengeToken, code);
      onSuccess({
        accessToken: response.data.accessToken,
        user: response.data.user,
      });
    } catch (error: any) {
      toast({
        title: "MFA verification failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app or a one-time recovery code
          {email ? ` for ${email}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfaCode">Authentication code</Label>
            <Input
              id="mfaCode"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={9}
              placeholder="123456 or abcd-efgh"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify and continue"}
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

export default MfaLoginChallenge;