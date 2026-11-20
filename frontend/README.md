## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

From the repository root, install dependencies:

```bash
pnpm install --frozen-lockfile
```

### Development

From the repository root:

```bash
pnpm --filter frontend dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

The page automatically updates as you edit files in `src/app/`.

## Frontend checks

Vitest is provided by the backend workspace. Run the frontend tests from the
repository root:

```bash
pnpm --filter @starter/backend exec vitest run --root ../frontend
```

`vitest.config.mjs` resolves the same `@/` alias as TypeScript. The warehouse
screen's structure and data modes are described in
[`src/_pages/warehouses/README.md`](src/_pages/warehouses/README.md).
