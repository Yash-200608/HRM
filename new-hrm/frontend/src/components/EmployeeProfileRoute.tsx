import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";

export default function EmployeeProfileRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { id } = useParams();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "employee" && String(user._id) === String(id)) {
    return <>{children}</>;
  }

  if (hasPermission(user, "employees", "view")) {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
}