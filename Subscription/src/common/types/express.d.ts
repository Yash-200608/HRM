import type { AuthPrincipal } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AuthPrincipal;
      rawBody?: Buffer;
      idempotencyKey?: string;
      tenant?: {
        organizationId: string | null;
      };
    }
  }
}

export {};
