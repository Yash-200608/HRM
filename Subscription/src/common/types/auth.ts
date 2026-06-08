export type AuthPrincipal = {
  kind: 'user' | 'admin' | 'service' | 'organization';
  subject: string;
  organizationId?: string;
  roles?: string[];
  sessionId?: string;
  tokenId?: string;
  tokenVersion?: number;
};
