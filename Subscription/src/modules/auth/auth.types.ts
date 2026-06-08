import type { AuthPrincipal } from '../../common/types/auth';

export type ApiKeyOwnerType = 'ORGANIZATION' | 'ADMIN' | 'WORKER' | 'WEBHOOK';

export type ApiKeyPrincipal = AuthPrincipal;
