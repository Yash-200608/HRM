export const hasPermission = (
  user: any,
  module: string,
  action: string = "view"
) => {
  if (!user) return false;

  if (user.role === "admin" || user.role === "super_admin") {
    return true;
  }

  return !!user?.assignedRole?.permissions?.[module]?.[action];
};