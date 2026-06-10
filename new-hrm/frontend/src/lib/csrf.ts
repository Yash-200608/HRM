let cachedCsrfToken: string | null = null;

export function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCsrfToken(token: string | null) {
  cachedCsrfToken = token;
}

export function getCsrfToken() {
  return cachedCsrfToken || readCookie("csrfToken");
}

export function captureCsrfTokenFromResponse(headers: Record<string, unknown> | undefined) {
  if (!headers) {
    return;
  }

  const token = headers["x-csrf-token"] || headers["X-CSRF-Token"];
  if (typeof token === "string" && token.trim()) {
    setCsrfToken(token.trim());
  }
}

export function attachCsrfHeader(
  headers: Record<string, unknown> = {},
  method?: string,
) {
  const normalizedMethod = String(method || "get").toLowerCase();
  if (!["post", "put", "patch", "delete"].includes(normalizedMethod)) {
    return headers;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}