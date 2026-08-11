# Medical Inventory Platform

Monorepo for the medical inventory platform. This repository currently contains the
**foundation**: authentication, RBAC, the base database schema, and the role-gated UI
shell that later sub-projects (products, stock, requests, purchase orders, deliveries)
build on.

- `apps/api` — Express + Prisma REST API (`/api/v1`)
- `apps/web` — Next.js 14 App Router frontend
- `packages/shared` — Zod schemas, enums, and types shared by both

## Requirements

- Node.js 20+
- Docker (for PostgreSQL)

## Setup

```bash
npm install
docker compose up -d postgres
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://inventory:inventory@localhost:5432/inventory_dev?schema=public
TEST_DATABASE_URL=postgresql://inventory:inventory@localhost:5432/inventory_test?schema=public
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
WEB_URL=http://localhost:3000
API_PORT=4000
NODE_ENV=development
```

> Generate real secrets before any non-local deployment — the values above are
> placeholders and must never be used outside a development machine.

Apply migrations and seed the starter data:

```bash
npm run prisma:migrate -w apps/api
npm run prisma:seed -w apps/api
```

The test suite uses a separate database. Create it once:

```bash
docker exec inventory-postgres-1 psql -U inventory -d postgres -c "CREATE DATABASE inventory_test;"
```

## Running

Two processes, two terminals:

```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

The web app proxies `/api/v1/*` to the API (see `apps/web/next.config.mjs`), so the
browser only ever talks to port 3000.

Seeded super admin: `admin@inventory.local` / `ChangeMe123!`

### Docker

`docker compose up` runs postgres, api, and web together. The API image reads the same
environment variables listed above from `docker-compose.yml`.

## Testing

```bash
npm run test:api          # Jest + Supertest, real Postgres (no mocked DB)
npm run test:web          # Vitest + React Testing Library
npm run test:e2e -w apps/web   # Playwright, needs api + web running and DB seeded
```

Playwright starts the web dev server itself but expects the API on port 4000 and a
seeded database. First run needs browsers: `npx playwright install`.

## Architecture

**API** follows controller → service → repository, with Prisma as the only data layer.
Every protected route calls `authorize(permissionKey)`; frontend gating is never the
sole enforcement point.

**Auth:** access JWT (15 min) is held in memory on the client only. The refresh JWT
(7 days) lives in an HttpOnly + SameSite=Strict cookie and rotates on every use.
Refresh tokens are stored as SHA-256 hashes. Five failed logins lock an account for
15 minutes.

**Web** uses route groups per role (`/admin`, `/inventory`, `/doctor`, `/delivery`,
`/supplier`), all rendered through `AppShell`, which gates on session presence.
Nav entries marked "Soon" are intentional placeholders for later sub-projects.

**Design system:** colors are CSS custom properties in `src/app/globals.css`, surfaced
to Tailwind as semantic tokens (`canvas`, `surface`, `raised`, `line`, `ink`, `muted`,
`faint`, plus `active`/`success`/`warning`/`danger`). Dark mode swaps the variables
only — no `dark:` variant needed for tokenized colors. Shared primitives live in
`src/components/ui`; use `Button`, `FormField` + the `.field` class, `DataTable`,
`Modal`, `Drawer`, and `PageHeader` rather than re-styling elements ad hoc.

**i18n:** next-intl is wired with `en`, `ar`, and `ku`, and RTL flips via the `dir`
attribute. Only English strings are populated at this stage; the Arabic and Kurdish
files carry the same key set for the strings that exist.

### Account creation

There is no public self-registration by design. Accounts are created by a Super Admin
or Inventory Manager, and the new user receives an activation link. In development,
activation and password-reset emails are logged to the API console instead of being
sent.

## Documentation

- `docs/superpowers/specs/2026-07-21-foundation-design.md` — design decisions
- `docs/superpowers/plans/2026-07-21-foundation.md` — the implementation plan
