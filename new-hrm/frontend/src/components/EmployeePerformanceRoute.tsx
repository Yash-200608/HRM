import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessModule } from "@/lib/entitlements";
import { hasPermission } from "@/lib/permissions";

/**
 * Employees reach My Performance via plan entitlement.
 * Admins/managers use the admin Performance page instead.
 */
export default function EmployeePerformanceRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "employee") {
    return canAccessModule(user, "performance") ? (
      <>{children}</>
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  if (user.role === "admin" || user.role === "super_admin") {
    return <Navigate to="/performance" replace />;
  }

  return hasPermission(user, "performance", "view") ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
}