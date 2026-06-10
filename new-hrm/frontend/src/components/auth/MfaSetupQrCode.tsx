import React from "react";
import QRCode from "react-qr-code";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type MfaSetupQrCodeProps = {
  secret: string;
  otpauthUrl: string;
  email?: string;
  className?: string;
};

const MfaSetupQrCode: React.FC<MfaSetupQrCodeProps> = ({
  secret,
  otpauthUrl,
  email,
  className = "",
}) => {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-5">
        <p className="text-sm font-medium text-slate-700 text-center">
          Scan with your authenticator app
        </p>
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <QRCode value={otpauthUrl} size={180} level="M" />
        </div>
        {email ? (
          <p className="text-xs text-slate-500 text-center">
            Account: <span className="font-medium text-slate-700">{email}</span>
          </p>
        ) : null}
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Use Google Authenticator, Microsoft Authenticator, Authy, or any TOTP app.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
        <Label htmlFor="mfaManualSecret">Or enter this key manually</Label>
        <Input
          id="mfaManualSecret"
          readOnly
          value={secret}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
};

export default MfaSetupQrCode;