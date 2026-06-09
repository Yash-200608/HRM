import type { EntitlementKey } from "@hrm-subscription/shared-types";

export type SubscriptionPrincipalKind = "user" | "admin" | "service" | "organization";

export interface SubscriptionPrincipal {
  kind: SubscriptionPrincipalKind;
  subject: string;
  organizationId?: string;
  roles?: string[];
  sessionId?: string;
  tokenId?: string;
  tokenVersion?: number;
}

export interface JwtClaimsV1 {
  ver: string;
  id: string;
  role: string;
  companyId: string | null;
  orgId: string | null;
  principalKind: string;
  tokenVersion: number;
  sessionId: string;
  entitlements: string[];
  subscriptionPlan: string | null;
  permissions: Record<string, Record<string, boolean>> | null;
}

export interface ValidateJwtClaimsResult {
  valid: boolean;
  isLegacy: boolean;
  claims: Partial<JwtClaimsV1> | null;
  errors: string[];
}

export const JWT_CLAIMS_VERSION: "v1";
export const PRINCIPAL_KINDS: readonly string[];

export function buildJwtClaimsV1(input?: Record<string, unknown>): JwtClaimsV1;
export function validateJwtClaims(decoded: unknown): ValidateJwtClaimsResult;
export function toSubscriptionPrincipal(
  hrmUser?: Record<string, unknown>,
  decoded?: Record<string, unknown>
): SubscriptionPrincipal | null;
export function resolvePrincipalKind(role: unknown): string;
export function resolveSubscriptionKind(principalKind: string): SubscriptionPrincipalKind;
export function extractEntitlementsFromSnapshot(
  featureSnapshot: Record<string, unknown> | null | undefined
): EntitlementKey[];
export function isTokenVersionStale(
  decoded: { tokenVersion?: number | null },
  user: { tokenVersion?: number | null }
): boolean;
export function mapModuleToEntitlement(moduleName: string): EntitlementKey | null;