import { env } from '../../config/env';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendEmailResult =
  | { delivered: true; skipped: false }
  | { delivered: false; skipped: true; reason: 'missing_api_key' | 'missing_from_email' | 'missing_recipient' }
  | { delivered: false; skipped: false; reason: string; status?: number };

export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      delivered: false,
      skipped: true,
      reason: !env.RESEND_API_KEY ? 'missing_api_key' : 'missing_from_email',
    };
  }

  if (!input.to) {
    return { delivered: false, skipped: true, reason: 'missing_recipient' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    return {
      delivered: false,
      skipped: false,
      reason: 'provider_error',
      status: response.status,
    };
  }

  return { delivered: true, skipped: false };
}
