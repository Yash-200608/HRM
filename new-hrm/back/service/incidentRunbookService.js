const RUNBOOKS = [
  {
    id: "billing-proxy-failure",
    title: "Billing proxy unavailable",
    category: "monetization",
    severity: "high",
    triggers: ["PLATFORM_SLA billing_proxy unhealthy", "502 from /api/billing or subscription proxy"],
    symptoms: [
      "Admins cannot view billing overview or upgrade plans",
      "Entitlement checks may fail closed in production",
    ],
    steps: [
      "Confirm Subscription service is running and reachable at SUBSCRIPTION_API_BASE_URL",
      "Verify INTERNAL_API_KEY matches between HRM and Subscription",
      "Check HRM logs for billingClient timeout or 502 responses",
      "Validate MongoDB connectivity for both services",
      "If Subscription is healthy, restart HRM to clear stale connections",
    ],
    escalation: "Platform on-call → Billing service owner if unresolved in 30 minutes",
  },
  {
    id: "outbox-consume-failure",
    title: "Platform outbox delivery failing",
    category: "lifecycle",
    severity: "high",
    triggers: ["outbox_consume failures", "platform.outbox.consume_failed audit events"],
    symptoms: [
      "Subscription upgrades do not update company planCode in HRM",
      "Archived tenants remain writable in HRM",
    ],
    steps: [
      "Verify OUTBOX_DELIVERY_URL points to HRM /api/platform/outbox/inbound",
      "Confirm OUTBOX_DELIVERY_SECRET matches Subscription outbox signer",
      "Inspect Subscription dead-letter outbox events via admin ops metrics",
      "Replay failed events from Subscription admin if supported",
      "Manually reconcile affected company status/planCode if backlog is large",
    ],
    escalation: "Platform on-call → Integration engineer",
  },
  {
    id: "entitlement-upstream-down",
    title: "Entitlement checks failing",
    category: "security",
    severity: "critical",
    triggers: ["High ENTITLEMENT_DENIED rate", "FEATURE_NOT_ENABLED for entitled customers"],
    symptoms: [
      "Paying customers blocked from gated modules",
      "Nav items hidden despite active subscription",
    ],
    steps: [
      "Check Subscription /v1/features/check availability",
      "Verify organization has active subscription record",
      "Review ENTITLEMENT_FAIL_CLOSED env — use fail-open only in dev",
      "Inspect audit_events for ENTITLEMENT_DENIED with upstreamStatus",
      "Grandfather affected orgs temporarily via plan metadata if widespread",
    ],
    escalation: "Platform on-call → Revenue ops for customer comms",
  },
  {
    id: "oauth-security-incident",
    title: "OAuth / SSO security incident",
    category: "identity",
    severity: "high",
    triggers: ["OAuth security events spike", "Cross-tenant login report"],
    symptoms: [
      "Unexpected OAuth identity links",
      "Microsoft tenant mismatch errors",
    ],
    steps: [
      "Review GET /api/auth/oauth/security-events for recent failures",
      "Confirm MICROSOFT_TENANT_ID is set to a specific tenant UUID in production",
      "Revoke suspicious identities via PATCH /api/auth/oauth/identities/:id/revoke",
      "Force reauthentication: POST /api/auth/oauth/incident/force-reauth",
      "Audit affected admin accounts and rotate credentials if compromise suspected",
    ],
    escalation: "Security lead → Customer IT contact for IdP review",
  },
  {
    id: "archived-tenant-mutation",
    title: "Archived tenant still mutating data",
    category: "compliance",
    severity: "medium",
    triggers: ["TENANT_READ_ONLY_DENIED audit events on archived orgs"],
    symptoms: [
      "Employee creates succeed after churn",
      "Payroll or billing mutations on archived companies",
    ],
    steps: [
      "Confirm company.status is ARCHIVED in companies collection",
      "Verify outbox consumer processed organization.archived events",
      "Ensure requireWritableTenant middleware is mounted on mutation routes",
      "Block remaining write paths and export compliance evidence for the tenant",
      "Notify legal/customer success for post-termination data handling",
    ],
    escalation: "Compliance owner",
  },
  {
    id: "employee-usage-drift",
    title: "Employee usage metering drift",
    category: "revenue",
    severity: "medium",
    triggers: ["Usage count mismatch vs HRM active employees", "EMPLOYEE_EVENT_HTTP_EMIT failures"],
    symptoms: [
      "Subscription usage under-reports seat count",
      "Overage not invoiced",
    ],
    steps: [
      "Compare HRM ACTIVE employees vs Subscription /v1/usage/{orgId}",
      "Check EMPLOYEE_EVENT_HTTP_EMIT_ENABLED and inbox lag",
      "Replay employee lifecycle events if HTTP emit failed",
      "Run reconciliation for affected organizations",
      "Enable alerts when drift exceeds SLA_EMPLOYEE_USAGE_DRIFT_PERCENT",
    ],
    escalation: "Billing operations",
  },
  {
    id: "mfa-lockout",
    title: "Admin MFA lockout",
    category: "identity",
    severity: "medium",
    triggers: ["Admin cannot complete MFA login", "Recovery codes exhausted"],
    symptoms: [
      "Valid password but MFA challenge fails",
      "No recovery codes remaining",
    ],
    steps: [
      "Confirm server time sync (TOTP window sensitivity)",
      "Ask admin to use an unused recovery code",
      "If locked out, super-admin resets MFA flags on the account document",
      "Re-enroll MFA and regenerate recovery codes in Security settings",
      "Document incident in audit trail",
    ],
    escalation: "Security / platform admin",
  },
];

function listRunbooks() {
  return RUNBOOKS.map(({ steps, ...summary }) => summary);
}

function getRunbook(id) {
  return RUNBOOKS.find((runbook) => runbook.id === id) || null;
}

function matchRunbooksForIndicators(indicators = []) {
  const unhealthy = indicators.filter((indicator) => indicator.status !== "healthy");
  if (unhealthy.length === 0) {
    return [];
  }

  const matches = new Set();
  unhealthy.forEach((indicator) => {
    RUNBOOKS.forEach((runbook) => {
      if (runbook.triggers.some((trigger) => trigger.toLowerCase().includes(indicator.key.toLowerCase()))) {
        matches.add(runbook.id);
      }
    });
  });

  if (matches.size === 0) {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return RUNBOOKS.filter((runbook) => runbook.severity === "high" || runbook.severity === "critical")
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 3)
      .map((runbook) => runbook.id);
  }

  return Array.from(matches);
}

module.exports = {
  RUNBOOKS,
  getRunbook,
  listRunbooks,
  matchRunbooksForIndicators,
};