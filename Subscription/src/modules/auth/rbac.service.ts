import type { ApiKeyPrincipal } from './auth.types';

export function hasRole(principal: ApiKeyPrincipal | undefined, roles: string[]) {
  if (!principal) {
    return false;
  }

  if (principal.kind === 'service' || principal.kind === 'admin') {
    return true;
  }

  if (!principal.roles) {
    return false;
  }

  return roles.some((role) => principal.roles?.includes(role));
}
