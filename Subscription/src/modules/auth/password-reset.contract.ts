import { env } from '../../config/env';

export const PASSWORD_RESET_CALLBACK_PATH = '/reset-password';
export const PASSWORD_RESET_TOKEN_QUERY_PARAM = 'token';

export type PasswordResetCallbackContract = {
  path: typeof PASSWORD_RESET_CALLBACK_PATH;
  tokenQueryParam: typeof PASSWORD_RESET_TOKEN_QUERY_PARAM;
  method: 'GET';
  tokenLocation: 'query';
  purpose: 'password_reset';
};

export const PASSWORD_RESET_CALLBACK_CONTRACT: PasswordResetCallbackContract = {
  path: PASSWORD_RESET_CALLBACK_PATH,
  tokenQueryParam: PASSWORD_RESET_TOKEN_QUERY_PARAM,
  method: 'GET',
  tokenLocation: 'query',
  purpose: 'password_reset',
};

function getFrontendBaseUrl() {
  return env.APP_BASE_URL ? env.APP_BASE_URL.replace(/\/$/, '') : `http://localhost:${env.PORT}`;
}

export function buildPasswordResetCallbackUrl(token: string) {
  return `${getFrontendBaseUrl()}${PASSWORD_RESET_CALLBACK_PATH}?${PASSWORD_RESET_TOKEN_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

