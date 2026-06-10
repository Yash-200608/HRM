type StoredUser = {
  role?: string;
};

export function getLoginPathForRole(role?: string) {
  if (role === "super_admin") return "/superAdmin/login";
  if (role === "admin") return "/admin/login";
  return "/login";
}

export function clearLocalSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  sessionStorage.clear();
  delete (window as any).axios?.defaults?.headers?.common?.Authorization;
}

export function handleUnauthorized() {
  let role: string | undefined;
  try {
    const raw = localStorage.getItem("user");
    role = raw ? (JSON.parse(raw) as StoredUser).role : undefined;
  } catch {
    role = undefined;
  }

  clearLocalSession();

  const loginPath = getLoginPathForRole(role);
  if (window.location.pathname !== loginPath) {
    window.location.href = loginPath;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}