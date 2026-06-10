import { Navigate } from "react-router-dom";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

export default function PermissionRoute({
  module,
  action,
  children,
}: {
  module: string;
  action?: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!hasPermission(user, module, action || "view")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}