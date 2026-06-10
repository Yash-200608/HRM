type TenantRef = string | { _id?: string; id?: string } | null | undefined;

function resolveTenantRef(ref: TenantRef): string | null {
  if (!ref) {
    return null;
  }

  if (typeof ref === "object") {
    return ref._id || ref.id || null;
  }

  return String(ref);
}

export function resolveCompanyIdFromUser(user: {
  companyId?: TenantRef;
  createdBy?: TenantRef;
} | null | undefined): string | null {
  if (!user) {
    return null;
  }

  return resolveTenantRef(user.companyId) || resolveTenantRef(user.createdBy);
}