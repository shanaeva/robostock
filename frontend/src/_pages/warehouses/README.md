# My Warehouses — /warehouses

Warehouse listing, search, sorting, pagination, creation, renaming,
and deletion. Names must contain 1–100 characters; dimensions must be integers from 1 to 500.

## Getting Started

See the [frontend README](../../../README.md) for instructions.
After starting the application, open `/warehouses`.

Configure the following variables in `frontend/.env.local`:

| Variable                            | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE` | `mock` (default) or `http`                                        |
| `NEXT_PUBLIC_API_BASE_URL`          | API URL, required for `http`                                      |
| `NEXT_PUBLIC_WAREHOUSE_DEMO_OWNER`  | `true` enables temporary owner actions only in development + http |

Restart the dev server after changing these variables; production requires
a rebuild. `NEXT_PUBLIC_*` variables are public; do not store secrets in them.

## Modes

- **mock** — works without a backend; changes are reset on page reload.
  Scenarios: `?demo=empty`, `?demo=error`, `?demo=mutation-error`,
  `?demo=forbidden`. Invitations are simulated.
- **http** — sends requests to the real API without falling back to mocks on errors.
  Owner actions are hidden when the role is unknown. The temporary flag
  enables renaming and deletion but does not change server-side permissions
  and is ignored in production. HTTP invitations are disabled.

## Checks

Run from the repository root:

```sh
pnpm --filter @starter/backend exec vitest run --root ../frontend
pnpm exec prettier --check frontend/src/_pages/warehouses
pnpm --filter frontend lint
pnpm --filter frontend fsd:check
pnpm --filter frontend exec tsc --noEmit --incremental false
pnpm --filter frontend build
```

Stop the frontend dev server before running the build.
Tests use Vitest from the backend and mocked requests; they are not E2E tests.

## Pending Integrations

- Authentication, real roles, and state updates when the session changes.
- Warehouse editor route — the “Open” button is currently unavailable.
