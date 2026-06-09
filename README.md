# HRM Subscription Monorepo

This repository is being integrated incrementally as a production monorepo for the existing HRM and subscription billing systems.

## Phase 2 Structure

Application source has not been moved in this phase.

- `new-hrm/back/` - existing HRM backend, preserved in place.
- `new-hrm/frontend/` - existing HRM frontend, preserved in place.
- `Subscription/` - existing subscription billing service, preserved in place.
- `apps/hrm/` - reserved placeholder for a future HRM app move.
- `apps/subscription/` - reserved placeholder for a future subscription app move.
- `packages/shared-auth/` - reserved placeholder for shared authentication adapters.
- `packages/shared-db/` - reserved placeholder for shared database adapters.
- `packages/shared-types/` - reserved placeholder for shared TypeScript contracts.
- `packages/shared-utils/` - reserved placeholder for shared utilities.
- `infrastructure/` - reserved placeholder for shared infrastructure configuration.

## Workspace Tooling

The root `package.json` defines npm workspaces for the existing application locations and future shared packages. Version resolution is intentionally not centralized yet; each application keeps its own dependency tree to preserve current behavior.

Useful commands:

```powershell
npm run build
npm run typecheck
npm run check:hrm:backend
npm run build:subscription
npm run build:hrm:frontend
```

## Migration Rule

Do not move application files until both systems build independently, workspace tooling is verified, and a later migration phase explicitly requires movement.
