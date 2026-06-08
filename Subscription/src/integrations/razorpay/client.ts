import { env } from '../../config/env';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';

function basicAuthHeader() {
  if (!env.Razorpay_KEY_ID || !env.Razorpay_KEY_SECRET) {
    throw new AppError('Razorpay credentials not configured', 500, ErrorCodes.InternalServerError);
  }

  return `Basic ${Buffer.from(`${env.Razorpay_KEY_ID}:${env.Razorpay_KEY_SECRET}`).toString('base64')}`;
}

async function razorpayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`Razorpay request failed: ${response.status}`, 502, ErrorCodes.PaymentFailed, {
      providerStatus: response.status,
      providerMessage: body.slice(0, 200),
    });
  }

  return response.json() as Promise<T>;
}

export async function createRazorpayOrder(input: {
  amountInPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  return razorpayRequest<{ id: string; amount: number; currency: string; receipt: string; status: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountInPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<Record<string, unknown>>(`/payments/${paymentId}`, {
    method: 'GET',
  });
}

export async function captureRazorpayPayment(input: {
  paymentId: string;
  amountInPaise: number;
  currency?: string;
}) {
  return razorpayRequest<Record<string, unknown>>(`/payments/${input.paymentId}/capture`, {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountInPaise,
      currency: input.currency,
    }),
  });
}

export async function refundRazorpayPayment(input: {
  paymentId: string;
  amountInPaise?: number;
  notes?: Record<string, string>;
}) {
  return razorpayRequest<Record<string, unknown>>(`/payments/${input.paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountInPaise,
      notes: input.notes ?? {},
    }),
  });
}
