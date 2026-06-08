export type RazorpayWebhookPayload = {
  event: string;
  payload: Record<string, unknown>;
};
