# My Warehouses — /warehouses

Warehouse listing, search, sorting, pagination, creation, renaming and deletion.
Names contain 1–100 characters after trimming; dimensions are integers from 1 to
500, with initial dimensions 20×20.

## Getting started

See the [frontend README](../../../README.md). From the repository root:

```sh
pnpm --filter frontend dev
```

Open `/warehouses`. Optional public settings in `frontend/.env.local`:

| Variable                            | Default  | Purpose                                                                           |
| ----------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE` | `mock`   | `mock` or `http`                                                                  |
| `NEXT_PUBLIC_API_BASE_URL`          | none     | API base URL, required for `http`; a path prefix and trailing slash are supported |
| `NEXT_PUBLIC_WAREHOUSE_DEMO_OWNER`  | disabled | Exact string `true` enables temporary owner actions only in development + http    |

Restart the dev server after changing these settings. Production requires a
rebuild. `NEXT_PUBLIC_*` values are public; never store secrets in them.

## Mock and HTTP modes

In development, **mock** works without a backend. CRUD uses the same HTTP adapter,
request bodies and response validation as **http**, intercepted by MSW before any
warehouse request is sent. Each mounted screen has an isolated in-memory session
and fixed UUID fixtures; a full reload resets the data. Requests target a reserved
`https://warehouse-mocks.invalid/<session>/` origin, not the configured real API.
A 450 ms delay preserves loading states. MSW startup failures are shown as errors
and never trigger a real API fallback.

Demo scenarios are `/warehouses?demo=empty`, `?demo=error` (first list request
fails; retry succeeds), `?demo=mutation-error` and `?demo=forbidden`.
Demo roles are local metadata, not fields in HTTP response bodies. The demo role
filter is applied before pagination, using a mock-only request header.
Invitations remain a local simulation: no invitation endpoint, email or real
membership is created. CRUD has no separate directly called mock implementation.

Browser MSW starts only in development and is not initialized during SSR or Node
tests. **Production mock mode is unsupported** and displays a configuration error
without sending requests. For a production build, configure `http` and the API URL
before building and starting the application.

**http** sends requests to the configured API. MSW warehouse handlers never match
that URL; the page stops its own worker and removes only its own registration
before the first HTTP request. After switching modes, restart the dev server and
reload the page. Backend errors are never replaced with mock data.

When the role is unknown, owner actions remain unavailable. The temporary owner
flag enables only the existing development rename/delete controls; it does not
change server permissions or DTOs. In production the flag is ignored. HTTP
invitations are disabled. The frontend is not yet integrated with real sessions,
warehouse roles or invitations. The current backend branch has authentication but
no warehouse routes; confirm the warehouse API deployment with the backend team.

The generated worker lives in `frontend/public/mockServiceWorker.js`. After an
intentional MSW upgrade, regenerate it with:

```sh
pnpm --filter frontend exec msw init public --save
pnpm exec prettier --write frontend/public/mockServiceWorker.js
```

## Structure and tests

- `_pages/warehouses` composes the widget through its public API.
- `widgets/warehouse-management` owns screen state and its QueryClient.
- `features/manage-warehouse` owns forms, dialogs and mutations.
- `entities/warehouse` owns contracts, queries, the HTTP adapter and MSW mocks.
  `api/mocks/handlers.ts` is shared by browser and Node runtimes; Node tests never
  import browser initialization. The demo layer adds only roles and invitations.
- `shared/api` owns URL validation and HTTP transport.

From the repository root:

```sh
pnpm --filter @starter/backend exec vitest run --root ../frontend
pnpm exec prettier --check frontend/src frontend/public/mockServiceWorker.js frontend/vitest.config.mjs
pnpm --filter frontend lint
pnpm --filter frontend fsd:check
pnpm --filter frontend exec next typegen
pnpm --filter frontend exec tsc --noEmit --incremental false
pnpm --filter frontend build
```

Stop the frontend dev server before building. Tests use Vitest from the backend
workspace, shared MSW handlers, isolated data and strict unhandled-request errors.
These are automated HTTP integration tests, not browser E2E or real backend tests.

## Pending integrations

Real sessions, warehouse roles, HTTP invitations and session-aware cache updates
are still pending. The warehouse editor's “Open” action remains unavailable.
The existing `fsd/insignificant-slice` warnings for the widget and feature are
advisory; public API and import boundary checks remain enabled.
