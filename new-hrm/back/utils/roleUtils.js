function normalizeRoleName(roleName = "") {
  return String(roleName).trim().toLowerCase();
}

function deduplicateRoles(roles = []) {
  const seen = new Map();

  for (const role of roles) {
    const key = normalizeRoleName(role.roleName);
    if (!key) continue;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, role);
      continue;
    }

    const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
    const roleDate = new Date(role.updatedAt || role.createdAt || 0);

    if (roleDate >= existingDate) {
      seen.set(key, role);
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
}

module.exports = {
  normalizeRoleName,
  deduplicateRoles,
};