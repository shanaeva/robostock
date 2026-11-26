# My Warehouses — /warehouses

Warehouse list and management forms. Names contain 1–100 characters after trimming;
dimensions are integers from 1 to 500, initially 20×20.

## Development

See the [frontend README](../../../README.md). From the repository root:

```sh
pnpm --filter frontend dev
```

Open /warehouses. Public settings (restart dev after changes):

| Variable                          | Default  | Purpose                                                               |
| --------------------------------- | -------- | --------------------------------------------------------------------- |
| NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE | mock     | mock or http                                                          |
| NEXT_PUBLIC_API_BASE_URL          | none     | API base URL, required for http; supports a path prefix               |
| NEXT_PUBLIC_WAREHOUSE_DEMO_OWNER  | disabled | Exact true enables temporary rename/delete only in development + http |

## Data modes

In development, **mock** starts MSW once at the app route boundary before mounting
the warehouse screen. Requests use the same HTTP adapter and response schemas as
HTTP mode and target https://warehouse-mocks.invalid. Startup errors are displayed
without sending mock requests to the configured backend.

The shared handlers return fixed responses: GET returns four prepared warehouses,
POST returns a fixed warehouseId with status 201, PATCH and DELETE return empty
204 responses. Writes do not change the list. Search, sorting and pagination
parameters are not simulated; request validation is the backend's responsibility.
There is no mutable mock store, local role assignment, role filter, invitation
simulation or URL-based demo scenario. Reloading returns the same fixture.

**http** uses NEXT_PUBLIC_API_BASE_URL without falling back to mocks. Test complete
CRUD, search, sorting and pagination with a suitable backend. Real sessions,
warehouse roles and HTTP invitations remain pending frontend integrations.
Unknown roles do not grant owner permissions. The existing temporary Owner flag
does not change DTOs or server permissions and is ignored in production.

MSW only starts in development + mock. Production mock mode displays a configuration
error; the default remains mock, so explicitly set http and the API URL **before
building**. Restart dev and reload the page when switching modes. The worker uses
its own /warehouses scope and script URL; unrelated service workers are untouched.

## Tests and worker

Browser startup is in src/app/mocks/browser.ts. Warehouse handlers are in
src/entities/warehouse/api/mocks/handlers.ts and are shared with Node setupServer.
Use server.use(...) in tests for empty, error or malformed responses; reset handlers
after each test. Static mocks do not confirm real backend integration or E2E flows.

From the repository root:

```sh
pnpm --filter @starter/backend exec vitest run --root ../frontend
pnpm format:check
pnpm --filter frontend lint
pnpm --filter frontend fsd:check
pnpm --filter frontend exec next typegen
pnpm --filter frontend exec tsc --noEmit --incremental false
pnpm --filter frontend build
```

Stop frontend dev before building. The generated public/mockServiceWorker.js must
not be edited for business logic. After an intentional MSW upgrade:

```sh
pnpm --filter frontend exec msw init public --save
pnpm exec prettier --write frontend/public/mockServiceWorker.js
```
