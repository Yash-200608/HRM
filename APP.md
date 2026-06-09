# HRM + Subscription: Integration & Merge Guide

This document explains how **new-hrm** and **Subscription** connect today, how to verify that connection, and a practical path to run them as **one merged application**.

---

## Current architecture (two services, one platform)

```text
┌──────────────────────── new-hrm/back (:5000) ────────────────────────┐
│  Express API · auth · HR modules · policy middleware                 │
│  billingClient.js ──────────────┐                                    │
│  subscriptionProxyRoutes.js ────┼──► HTTP + INTERNAL_API_KEY         │
│  platformOutboxConsumer ◄───────┼─── OUTBOX_DELIVERY (HMAC)          │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
┌──────────────────────── Subscription (:3000) ────────────────────────┐
│  Plans · subscriptions · billing · usage · features · limits         │
│  BullMQ worker publishes outbox → HRM inbound                        │
│  Organization model → MongoDB `companies` (shared with HRM)          │
└──────────────────────────────────────────────────────────────────────┘
          │
    MongoDB (MONGODB_URI) — shared `companies`, separate app collections
```

**Shared contracts**

| Layer                          | Package / mechanism                                |
|-------                         |-------------------                                 |
| Entitlements & company status  | `packages/shared-types`                            |
| JWT claims & principal mapping | `packages/shared-auth`                             |
| Server-to-server auth          | `INTERNAL_API_KEY` header                          |
| User JWT trust                 | `ACCESS_TOKEN_SECRET` / `HRM_ACCESS_TOKEN_SECRET`  |
| Lifecycle events               | HRM → `POST /v1/events/inbound`                    |
| Billing lifecycle              | Subscription → `POST /api/platform/outbox/inbound` |

---

## Verify integration (smoke test)

### Prerequisites

1. **MongoDB** running (local or Atlas) — same `MONGODB_URI` for both apps.
2. **Redis** running if Subscription worker/schedulers are enabled.
3. Copy `.env.example` → `.env` at repo root and fill real values (not placeholders).
4. Seed Subscription plans (first time):

```powershell
cd Subscription
npm run seed:plans
```

### Start both services

```powershell
# Terminal 1 — Subscription API
cd Subscription
npm run dev

# Terminal 2 — Subscription worker (outbox → HRM)
cd Subscription
npm run worker

# Terminal 3 — HRM API
cd new-hrm\back
npm run dev

# Terminal 4 — HRM frontend (optional)
cd new-hrm\frontend
npm run dev
```

### Run smoke script

From repository root:

```powershell
.\scripts\smoke-integration.ps1
```

**What it checks**

| Step | Validates |
|------|-----------|
| Env alignment | `MONGODB_URI`, `INTERNAL_API_KEY`, `OUTBOX_DELIVERY_SECRET`, JWT secrets, `OUTBOX_DELIVERY_URL` |
| Health | Subscription `/health`, HRM `/api-docs` |
| Plans | `GET /v1/plans` (catalog not empty) |
| Feature check | `POST /v1/features/check` with internal key |
| Trial path | `POST /v1/subscriptions` (or 409 if already exists) |
| Outbox | Signed `POST /api/platform/outbox/inbound` on HRM |
| Proxy (optional) | `GET /api/plans` through HRM with `-HrmAccessToken` |

**Optional flags**

```powershell
# Use an existing company id from Mongo `companies`
.\scripts\smoke-integration.ps1 -OrganizationId <mongoObjectId>

# Skip creating a trial subscription (faster reruns)
.\scripts\smoke-integration.ps1 -SkipProvision

# Prove authenticated HRM → Subscription proxy
.\scripts\smoke-integration.ps1 -HrmAccessToken <jwt>
```

**npm shortcut** (from repo root):

```powershell
npm run smoke:integration
```

### Manual checks after smoke passes

1. Log in as **super-admin** → create a company → confirm `trialProvisioning` in API response.
2. Log in as **tenant admin** → **Billing** page loads plan/usage/invoices.
3. Open a gated module (e.g. **Performance**) on a plan without entitlement → expect `FEATURE_NOT_ENABLED`.
4. Super-admin → **Platform Ops** → SLA dashboard shows Subscription health.

---

## Environment checklist (must match on both sides)

| Variable | HRM | Subscription | Notes |
|----------|-----|--------------|-------|
| `MONGODB_URI` | ✓ | ✓ | Same database; `companies` collection shared |
| `INTERNAL_API_KEY` | ✓ (client) | ✓ (server auth) | Must be identical |
| `ACCESS_TOKEN_SECRET` | ✓ (signs JWT) | ✓ (reads via `HRM_ACCESS_TOKEN_SECRET`) | Use same value |
| `OUTBOX_DELIVERY_SECRET` | ✓ (verify HMAC) | ✓ (sign HMAC) | Must be identical |
| `OUTBOX_DELIVERY_URL` | — | ✓ | `http://<hrm-host>:5000/api/platform/outbox/inbound` |
| `SUBSCRIPTION_API_BASE_URL` | ✓ | — | `http://<subscription-host>:3000` |
| `HRM_PUBLIC_BASE_URL` | ✓ | optional | Used in SCIM/ops URLs |

---

## Path to one merged app

The roadmap intentionally keeps **Subscription as billing system of record** and **HRM as workforce system of record**. “One merged app” means **one deployable unit and one process tree**, not necessarily deleting Subscription code.

### Target end state

```text
┌─────────────────── platform-server (single Node process) ───────────────────┐
│  /api/*           → HRM routes (employees, auth, performance, …)            │
│  /v1/*            → Subscription routes (billing, plans, usage, …)          │
│  /scim/v2/*       → SCIM (today on HRM)                                     │
│  shared Mongo connection · shared env · embedded BullMQ worker                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase M1 — Single deploy, dual processes (low risk)

**Goal:** One `docker compose up` or one PM2 ecosystem; still two Node processes.

1. Add `deploy/docker-compose.yml` with services: `mongodb`, `redis`, `hrm-api`, `subscription-api`, `subscription-worker`, `hrm-frontend`.
2. Mount one `.env` file; validate with `smoke-integration.ps1` inside compose network.
3. Use internal DNS: `SUBSCRIPTION_API_BASE_URL=http://subscription-api:3000`, `OUTBOX_DELIVERY_URL=http://hrm-api:5000/api/platform/outbox/inbound`.

**Exit:** Smoke script passes inside compose; one command starts full stack.

### Phase M2 — Unified gateway entry (medium risk)

**Goal:** One HTTP port externally; internal routing only.

1. Create `platform-gateway` (or extend `new-hrm/back/app.js`):
   - Mount existing HRM routes at `/`.
   - Reverse-proxy `/v1` → Subscription **or** import Subscription `createApp()` as sub-app.
2. Remove public exposure of Subscription port `3000` in production.
3. Keep `billingClient` pointing at `http://127.0.0.1:<subscription-internal-port>` or switch to **in-process adapter** (Phase M3).

**Exit:** External clients only hit port 5000 (or 443); smoke + billing UI unchanged.

### Phase M3 — In-process billing adapter (higher refactor)

**Goal:** Eliminate HTTP hop for server-side HRM → Subscription calls.

1. Extract Subscription service layer (`subscriptionService`, `featureService`, etc.) into importable modules.
2. Replace `billingClient.callSubscription()` with:

```javascript
// pseudo-code
const { featureService } = require("@hrm-subscription/billing-core");
await featureService.check(organizationId, featureKey);
```

3. Keep HTTP proxy mounts for **frontend/admin** tools that expect REST.
4. Retain `INTERNAL_API_KEY` only for external integrations (webhooks, future public API).

**Exit:** Entitlement/limit checks work with Subscription process stopped (in-process only).

### Phase M4 — Single Node process (full merge)

**Goal:** One `node platform-server.js` boots everything.

1. **Bootstrap order**
   - Load unified `.env`
   - `connectMongo()` once (shared pool)
   - `createSubscriptionApp()` mounted at `/v1`
   - `createHrmApp()` mounted at `/api` + `/scim/v2`
   - Start BullMQ worker in same process (or forked child)

2. **Consolidate package.json**
   - Root workspace script: `"start:platform": "node platform/server.js"`
   - Merge dependencies; resolve duplicate Express/Mongoose versions.

3. **Retire duplicate HTTP**
   - Delete `billingClient` HTTP transport (keep interface for tests).
   - Subscription outbox can call in-process handler instead of `fetch(OUTBOX_DELIVERY_URL)`.

4. **Workers**
   - Option A: Same process — `worker.start()` after HTTP listen.
   - Option B: Child process — `fork('./platform/worker.js')` for isolation.

5. **Frontend**
   - Single `VITE_API_URL` pointing at merged gateway.
   - Build static assets served by same Express instance.

**Exit:** `npm run start:platform` runs API + worker + static UI; smoke script passes against one port.

### Phase M5 — Schema & package cleanup (polish)

1. Finish `packages/shared-db` — canonical Mongoose fragments for `companies` billing fields.
2. Move `Organization` and `Company` to one schema module; both apps import from shared-db.
3. Single migration CLI for indexes across collections.
4. One OpenAPI spec combining HRM + Subscription routes.

---

## What not to merge (keep separate concerns)

| Concern | Reason |
|---------|--------|
| Razorpay webhooks & payment sagas | Billing domain; isolate failure blast radius |
| HRM attendance cron | Different SLA than billing workers |
| Operator/admin auth for billing ops | Subscription operator model stays distinct from HRM admin |
| SCIM external standard paths | Keep `/scim/v2` on gateway for IdP compatibility |

---

## Recommended sequence

| Order | Action | Effort |
|-------|--------|--------|
| 1 | Run `smoke-integration.ps1` on every deploy | **S** (done) |
| 2 | Docker Compose single-stack (M1) | **M** |
| 3 | Gateway single port (M2) | **M** |
| 4 | In-process billing adapter (M3) | **L** |
| 5 | Single Node bootstrap (M4) | **XL** |

**Pragmatic recommendation:** Ship **M1 + M2** for “one merged app” from an operations perspective (one compose, one URL). Pursue **M3–M4** only if latency, ops complexity, or private-cloud deployment requires eliminating internal HTTP.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Feature check always allowed in dev | Subscription down + `ENTITLEMENT_FAIL_CLOSED` false | Start Subscription; set fail-closed in prod |
| Plan changes not reflected in HRM | Worker not running | `cd Subscription && npm run worker` |
| Outbox 401 on HRM | `OUTBOX_DELIVERY_SECRET` mismatch | Align secrets in `.env` |
| Trial not created on company add | `TRIAL_PROVISIONING_ENABLED=false` or Subscription error | Check HRM logs; run smoke `-SkipProvision:$false` |
| JWT works in HRM but not Subscription | Secret mismatch | Align `ACCESS_TOKEN_SECRET` and `HRM_ACCESS_TOKEN_SECRET` |
| Empty plans in smoke | Plans not seeded | `cd Subscription && npm run seed:plans` |

---

## Related files

| File | Purpose |
|------|---------|
| `scripts/smoke-integration.ps1` | Automated connectivity verification |
| `REMEDIATION-ROADMAP.md` | Phase 1–4 implementation status |
| `.env.example` | Required shared variables |
| `new-hrm/back/service/billingClient.js` | HRM → Subscription HTTP client |
| `Subscription/src/integrations/outbox-delivery/` | Subscription → HRM outbox publisher |