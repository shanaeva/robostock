## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

From the repository root, install dependencies:

```bash
pnpm install --frozen-lockfile
```

### Environment

Create `frontend/.env.local` from the example:

```bash
cp -n frontend/.env.example frontend/.env.local
```

`NEXT_PUBLIC_API_BASE_URL` must point at the backend (port 3001 by default,
see `backend/.env.example`). The frontend dev server itself runs on port 3000.

### Development

From the repository root:

```bash
pnpm --filter frontend dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

The page automatically updates as you edit files in `src/app/`.

## Frontend checks

Run the frontend tests from the repository root (the same command CI runs):

```bash
pnpm --filter frontend test
```

`vitest.config.mjs` resolves the same `@/` alias as TypeScript. The warehouse
screen's structure and data modes are described in
[`src/_pages/warehouses/README.md`](src/_pages/warehouses/README.md).
