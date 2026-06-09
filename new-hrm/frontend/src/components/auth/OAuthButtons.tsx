import { Chrome, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

type OAuthRole = "employee" | "admin" | "super_admin";

const startOAuth = (provider: "google" | "microsoft", role: OAuthRole) => {
  const target = new URL(`${import.meta.env.VITE_API_URL}/api/auth/${provider}`);
  target.searchParams.set("role", role);
  window.location.href = target.toString();
};

const OAuthButtons = ({ disabled = false, role }: { disabled?: boolean; role: OAuthRole }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
};

export default OAuthButtons;
