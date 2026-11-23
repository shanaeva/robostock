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

| Variable                            | Default                                 | Purpose                                                                           |
| ----------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE` | `mock` in development, `http` otherwise | `mock` or `http`                                                                  |
| `NEXT_PUBLIC_API_BASE_URL`          | none                                    | API base URL, required for `http`; a path prefix and trailing slash are supported |
| `NEXT_PUBLIC_WAREHOUSE_DEMO_OWNER`  | disabled                                | Exact string `true` enables temporary owner actions only in development + http    |

Restart the dev server after changing these settings. Production requires a
rebuild. `NEXT_PUBLIC_*` values are public; never store secrets in them.

## Mock and HTTP modes

In development, **mock** uses the same HTTP adapter as **http**. The app starts
MSW in `src/app/mocks/browser.ts` before showing the warehouse screen. MSW
intercepts requests to `https://robostock-mocks.invalid`.

Edit `src/entities/warehouse/api/mocks/handlers.ts` to change mocked responses.
`GET` returns a fixed list, `POST` a fixed ID, and `PATCH` and `DELETE` return
`204`. The list stays the same after writes and for every search, sort and page.
To see an empty list or an error, change the corresponding handler's response.

Production defaults to `http`. Set `NEXT_PUBLIC_API_BASE_URL` before building
and starting the application.

**http** sends requests directly to the configured API. After switching modes,
restart the dev server and reload the page.

When the role is unknown, owner actions remain unavailable. The temporary owner
flag enables only the existing development rename/delete controls; it does not
change server permissions or DTOs. In production the flag is ignored. The
frontend is not yet integrated with real sessions,
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
  Add mock endpoints in `api/mocks/handlers.ts`. Each handler defines a method,
  path and response. Browser MSW and Node tests use the same handlers.
- `shared/api` owns URL validation, HTTP transport and the common mock origin.

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
workspace, the same static MSW handlers and strict unhandled-request errors.
These are automated HTTP integration tests, not browser E2E or real backend tests.

## Pending integrations

Real sessions, warehouse roles, HTTP invitations and session-aware cache updates
are still pending. The warehouse editor's “Open” action remains unavailable.
The existing `fsd/insignificant-slice` warnings for the widget and feature are
advisory; public API and import boundary checks remain enabled.
