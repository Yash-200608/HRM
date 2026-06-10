import { canAccessModule } from "@/lib/entitlements";

export const hasPermission = (
  user: any,
  module: string,
  action: string = "view"
) => {
  if (!user) return false;

  // Org admins manage the full tenant; subscription gates apply on the API layer.
  if (user.role === "admin" || user.role === "super_admin") {
    return true;
  }

  if (!canAccessModule(user, module)) {
    return false;
  }

  return !!user?.assignedRole?.permissions?.[module]?.[action];
};