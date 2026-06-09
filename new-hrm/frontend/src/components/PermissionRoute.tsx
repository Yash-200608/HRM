import { Navigate } from "react-router-dom";
import { hasPermission } from "@/lib/permissions";

export default function PermissionRoute({
  module,
  action,
  children,
}: {
  module: string;
  action?: string;
  children: React.ReactNode;
}) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!hasPermission(user, module, action || "view")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}