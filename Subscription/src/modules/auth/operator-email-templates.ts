import { buildPasswordResetCallbackUrl } from './password-reset.contract';

function getVerificationCallbackUrl(token: string, baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/v1/auth/email-verification/confirm?token=${encodeURIComponent(token)}`;
}

function getBaseUrl() {
  return process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, '') : `http://localhost:${process.env.PORT ?? '3000'}`;
}

export function buildEmailVerificationTemplate(input: { fullName: string; token: string }) {
  const baseUrl = getBaseUrl();
  const link = getVerificationCallbackUrl(input.token, baseUrl);

  return {
    subject: 'Verify your email address',
    html: `<p>Hello ${input.fullName},</p><p>Verify your email by visiting <a href="${link}">${link}</a>.</p><p>If you cannot click the link, use this token: <code>${input.token}</code></p>`,
    text: `Hello ${input.fullName}, verify your email: ${link}. Token: ${input.token}`,
  };
}

export function buildPasswordResetTemplate(input: { fullName: string; token: string }) {
  const link = buildPasswordResetCallbackUrl(input.token);

  return {
    subject: 'Reset your password',
    html: `<p>Hello ${input.fullName},</p><p>Reset your password using this token: <code>${input.token}</code>.</p><p>Reset page: <a href="${link}">${link}</a></p>`,
    text: `Hello ${input.fullName}, reset your password using this token: ${input.token}. Page: ${link}`,
  };
}
