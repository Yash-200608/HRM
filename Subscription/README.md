# Subscription & Billing Service

Standalone SaaS subscription and billing service for HRM integrations.

This service owns:

- Organizations
- Plans and plan versioning
- Subscriptions and trials
- Usage tracking and limit enforcement
- Feature gating
- Invoices, payments, credits, and proration
- Archive lifecycle metadata
- Operator authentication and admin support flows

The HRM application is only a client. It does not need direct database access to this service.

## Tech Stack

- Node.js 20+
- Express.js
- MongoDB with Mongoose
- Redis
- BullMQ
- JWT
- Razorpay
- Resend
- AWS S3
- Swagger/OpenAPI

## Project Layout

```txt
src/
  app.ts
  server.ts
  config/
  common/
  modules/
  integrations/
  jobs/
  bootstrap/
openapi/
test/
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values.

Required values for a normal local run:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `INTERNAL_API_KEY`
- `API_KEY_PEPPER`
- `PASSWORD_PEPPER`
- `AUTH_TOKEN_PEPPER`

Optional integrations:

- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `S3_PUBLIC_BASE_URL`
- `SENTRY_DSN`
- `POSTHOG_API_KEY`
- `OUTBOX_DELIVERY_URL`
- `OUTBOX_DELIVERY_SECRET`
- `SESSION_MAX_AGE_HOURS`

### 3. Seed plans and the first admin

```bash
npm run seed:plans
npm run seed:admin
```

`seed:admin` creates the first admin only when:

- no admin exists yet
- `SUPER_ADMIN_EMAIL` is set
- `SUPER_ADMIN_PASSWORD` is set

### 4. Run the API

```bash
npm run dev
```

The server listens on `PORT` from the environment, defaulting to `3000`.

### Optional local infrastructure

Start MongoDB, Redis, and the optional LocalStack profile with Docker Compose:

```bash
docker compose up -d
docker compose --profile localstack up -d
```

Or use the helper scripts:

```bash
npm run local:up
npm run local:bootstrap
npm run local:down
```

## Scripts

- `npm run dev` - start the API in watch mode
- `npm run build` - compile TypeScript
- `npm start` - run the compiled server
- `npm run worker` - run BullMQ workers
- `npm run scheduler` - run scheduled jobs
- `npm run seed:plans` - seed default SaaS plans
- `npm run seed:admin` - bootstrap the first super admin
- `npm test` - run the full test suite
- `npm run test:localstack` - run only the LocalStack-backed S3 test

## API Docs

OpenAPI is available at:

```txt
GET /docs/openapi.yaml
```

## Core API Surfaces

### Health

- `GET /health`

### Organizations

- `POST /v1/organizations`
- `GET /v1/organizations/:id`
- `PATCH /v1/organizations/:id`

### Plans

- `GET /v1/plans`
- `GET /v1/plans/:id`

### Subscriptions

- `POST /v1/subscriptions`
- `PATCH /v1/subscriptions/:id/upgrade`
- `PATCH /v1/subscriptions/:id/downgrade`
- `PATCH /v1/subscriptions/:id/cancel`

### Usage and Limits

- `POST /v1/usage/sync`
- `GET /v1/usage/:organizationId`
- `POST /v1/limits/employees/check`

### Features

- `POST /v1/features/check`

### Billing

- `POST /v1/billing/invoices/create`
- `POST /v1/billing/invoices/finalize`
- `GET /v1/billing/invoices/:id/pdf`
- `POST /v1/billing/invoices/razorpay-order`
- `POST /v1/billing/payments/mark-paid`
- `POST /v1/billing/payments/capture`
- `POST /v1/billing/payments/refund`
- `GET /v1/billing/credits/:organizationId`

### Webhooks

- `POST /v1/webhooks/razorpay`

### Archive Lifecycle

- `GET /v1/archive/:organizationId`
- `PATCH /v1/archive`

### Inbound Events

- `POST /v1/events/inbound`

### Operator Auth

- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `GET /v1/auth/sessions`
- `POST /v1/auth/logout`
- `POST /v1/auth/logout-all`
- `DELETE /v1/auth/sessions/:sessionId`
- `POST /v1/auth/email-verification/request`
- `GET /v1/auth/email-verification/confirm`
- `POST /v1/auth/email-verification/confirm`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/operators`
- `GET /v1/auth/operators/admins`
- `GET /v1/auth/operators/users`
- `POST /v1/auth/operators/:id/resend-verification`
- `POST /v1/auth/operators/:id/force-password-reset`
- `POST /v1/auth/operators/:id/clear-verification-state`
- `POST /v1/auth/operators/:id/revoke-password-reset`
- `PATCH /v1/auth/operators/:id/suspend`
- `PATCH /v1/auth/operators/:id/activate`

### API Keys

- `GET /v1/api-keys/admin`
- `POST /v1/api-keys/admin`
- `DELETE /v1/api-keys/admin/:id`
- `GET /v1/api-keys/organizations/:organizationId`
- `POST /v1/api-keys/organizations/:organizationId`
- `DELETE /v1/api-keys/organizations/:organizationId/:id`

### Admin Reporting

- `GET /v1/admin/metrics`
- `GET /v1/admin/revenue`
- `GET /v1/admin/plans`
- `GET /v1/admin/payments/failures`
- `GET /v1/admin/features`
- `GET /v1/admin/ops/metrics`
- `POST /v1/admin/outbox/:id/replay`

## Authentication

The service supports:

- JWT bearer tokens for human operators
- API keys for organizations and internal service clients
- Internal service keys for trusted backend calls
- Webhook signatures for provider callbacks

Operator login is available at `POST /v1/auth/login`.

## Email Verification and Password Reset

Operators can request verification and reset flows through the auth API.

Verification:

- `POST /v1/auth/email-verification/request`
- `GET /v1/auth/email-verification/confirm?token=...`
- `POST /v1/auth/email-verification/confirm`

Password reset:

- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`

Email delivery is implemented through Resend. If `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is missing, the service will skip delivery rather than fail the request.

## Billing Notes

- Invoices are created in draft state, then finalized.
- Payment capture and refunds are routed through Razorpay.
- Captured payments can generate invoice-paid events.
- Refunds are tracked in the credit ledger.
- Invoice PDFs are generated by the service and uploaded to S3 when configured.

## Feature Gating

Feature decisions are plan-snapshot driven and organization-scoped.

The service does not rely on plan-name conditionals such as:

```ts
if (plan === 'professional') {
}
```

Instead, feature checks are resolved from subscription feature flags and overrides.

## Background Jobs

BullMQ workers and schedulers handle:

- Trial expiry
- Renewal invoice generation
- Payment retries
- Usage reconciliation
- Outbox publishing
- Webhook retries
- Archive purge scheduling
- Notification delivery

Run them separately:

```bash
npm run worker
npm run scheduler
```

## Testing

```bash
npm test
```

The suite includes:

- HTTP smoke tests
- Security helper tests
- Billing PDF tests
- Seed admin smoke test
- Operator verification/reset flow tests
- Integration tests for subscription, usage, billing, and payment provider failure paths

### Optional LocalStack S3 Test

`test/localstack-s3.test.ts` is skipped unless an S3 endpoint is configured.

To run it with LocalStack-style settings, provide:

- `LOCALSTACK_S3_ENDPOINT` or `S3_ENDPOINT`
- `LOCALSTACK_S3_BUCKET`
- `LOCALSTACK_S3_REGION`
- `LOCALSTACK_S3_ACCESS_KEY_ID`
- `LOCALSTACK_S3_SECRET_ACCESS_KEY`

## Operator Email Templates

Email verification and password reset emails are generated from the auth template helpers in `src/modules/auth/operator-email-templates.ts`.

The password reset callback contract is:

- Path: `/reset-password`
- Query param: `token`
- Method: `GET`

The token is also accepted by `POST /v1/auth/password-reset/confirm` for API-driven flows.

For frontend routing examples, see `src/modules/auth/reset-password.frontend-contract.ts`.

## Snippet Examples

### Admin support routes

```bash
curl -X POST "$BASE_URL/v1/auth/operators/$OPERATOR_ID/resend-verification" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

curl -X POST "$BASE_URL/v1/auth/operators/$OPERATOR_ID/force-password-reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

curl -X POST "$BASE_URL/v1/auth/operators/$OPERATOR_ID/clear-verification-state" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

curl -X POST "$BASE_URL/v1/auth/operators/$OPERATOR_ID/revoke-password-reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Email-verification callback

```bash
curl -X GET "$BASE_URL/v1/auth/email-verification/confirm?token=evt_xxx.yyy"
```

```ts
const token = new URLSearchParams(window.location.search).get('token');
if (!token) throw new Error('Missing verification token');

await fetch(`/v1/auth/email-verification/confirm?token=${encodeURIComponent(token)}`);
```

### Reset-password callback

```bash
curl -X POST "$BASE_URL/v1/auth/password-reset/confirm" \
  -H "Content-Type: application/json" \
  -d '{"token":"prt_xxx.yyy","newPassword":"newStrongPassword123"}'
```

```ts
const token = new URLSearchParams(window.location.search).get('token');
if (!token) throw new Error('Missing reset token');

await fetch('/v1/auth/password-reset/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token,
    newPassword,
  }),
});
```

## Environment Variables

See `.env.example` for the full list.

Important variables:

```txt
NODE_ENV
PORT
MONGODB_URI
REDIS_URL
JWT_SECRET
ADMIN_JWT_SECRET
INTERNAL_API_KEY
API_KEY_PEPPER
PASSWORD_PEPPER
AUTH_TOKEN_PEPPER
Razorpay_KEY_ID
Razorpay_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
APP_BASE_URL
S3_BUCKET
S3_REGION
S3_ENDPOINT
S3_FORCE_PATH_STYLE
S3_PUBLIC_BASE_URL
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
SUPER_ADMIN_NAME
```

## Deployment Notes

- Run the API and worker processes separately in production.
- Keep MongoDB and Redis available with backups and monitoring.
- Store secrets in a real secret manager.
- Set `APP_BASE_URL` to the public frontend or operator portal URL for email links.
- Set `S3_BUCKET` and `S3_PUBLIC_BASE_URL` to enable invoice PDF uploads.

## Architecture Summary

This service is a modular monolith with clean domain boundaries for:

- Organization management
- Plan catalog and versioning
- Subscription lifecycle
- Usage and limit enforcement
- Feature resolution
- Billing and invoicing
- Operator auth and admin support
- Event outbox/inbox processing

If you want to extend the system, start with the domain module that owns the behavior and keep controller logic thin.
