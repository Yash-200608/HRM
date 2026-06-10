import { useEffect, useState } from "react";
import { Chrome, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

type OAuthRole = "employee" | "admin" | "super_admin";

type OAuthConfig = {
  google: boolean;
  microsoft: boolean;
  enabled: boolean;
};

const startOAuth = (provider: "google" | "microsoft", role: OAuthRole) => {
  const target = new URL(`${import.meta.env.VITE_API_URL}/api/auth/${provider}`);
  target.searchParams.set("role", role);
  window.location.href = target.toString();
};

const OAuthButtons = ({ disabled = false, role }: { disabled?: boolean; role: OAuthRole }) => {
  const [config, setConfig] = useState<OAuthConfig | null>(null);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/auth/oauth/config`)
      .then((response) => setConfig(response.data?.data ?? null))
      .catch(() => setConfig({ google: false, microsoft: false, enabled: false }));
  }, []);

  if (!config?.enabled) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {config.google ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => startOAuth("google", role)}
          className="h-12 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Chrome className="mr-2 h-4 w-4" />
          Google
        </Button>
      ) : null}

      {config.microsoft ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => startOAuth("microsoft", role)}
          className="h-12 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          Microsoft
        </Button>
      ) : null}
    </div>
  );
};

export default OAuthButtons;