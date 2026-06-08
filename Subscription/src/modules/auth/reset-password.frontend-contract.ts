export const RESET_PASSWORD_PATH = '/reset-password';
export const RESET_PASSWORD_TOKEN_QUERY_PARAM = 'token';

export function readResetPasswordTokenFromQuery(search: string) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get(RESET_PASSWORD_TOKEN_QUERY_PARAM);
}

export function buildResetPasswordPageUrl(token: string, baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}${RESET_PASSWORD_PATH}?${RESET_PASSWORD_TOKEN_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * Frontend contract example:
 *
 * import { readResetPasswordTokenFromQuery } from './reset-password.frontend-contract';
 *
 * const token = readResetPasswordTokenFromQuery(window.location.search);
 * if (!token) {
 *   showInvalidResetLinkState();
 *   return;
 * }
 *
 * await api.post('/v1/auth/password-reset/confirm', {
 *   token,
 *   newPassword,
 * });
 */
