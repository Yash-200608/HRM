export const hasPermission = (
  user: any,
  module: string,
  action: string
) => {
  if (!user) return false;

  // SUPER ADMIN / ADMIN
  if (user.role === "admin" || user.role === "superadmin") {
    return true;
  }

  // EMPLOYEE ROLE PERMISSIONS
  const permissions = user?.assignedRole?.permissions || {};

  return permissions?.[module]?.[action] === true;
};