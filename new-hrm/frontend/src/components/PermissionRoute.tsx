import { Navigate } from "react-router-dom";

export default function PermissionRoute({
  module,
  action,
  children
}: any) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // admin always allow
  if (user?.role === "admin") return children;

  const permissions = user?.assignedRole?.permissions || {};

  const allowed =
    permissions[module] &&
    permissions[module][action] === true;

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}