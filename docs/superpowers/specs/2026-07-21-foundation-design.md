# Foundation Sub-Project — Design Spec

Sub-project 1 of 7 for the Medical Inventory & Ordering Platform. Provides auth, RBAC, base DB skeleton, and role-gated UI shells that every later sub-project builds on.

## Context

Full platform replaces a phone-call-based hospital inventory/ordering process with a role-based web platform (Super Admin, Inventory Manager, Inventory Staff, Doctor/Clinic, Delivery Staff, Supplier). Scope is too large for one spec; decomposed into 7 sub-projects:

1. **Foundation** (this doc) — auth, RBAC, users, base layout
2. Product & Inventory core — products, categories, batches, warehouses, stock, transactions
3. Doctor ordering flow — cart, requests, approval workflow, reservation logic
4. Fulfillment — order prep, delivery assignment, delivery portal, proof of delivery
5. Purchasing — suppliers, purchase orders, receiving, reorder suggestions
6. Reporting & notifications — dashboards, charts, exports, notification center
7. Polish — audit logs (deepened), full i18n rollout, real-time (Socket.IO)

## Stack

- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, React Hook Form, Zod, TanStack Query
- Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- Repo: npm workspaces monorepo, Postgres via Docker Compose
- i18n: next-intl, RTL-aware layout, dark mode — plumbing built now (English content only; ar/ku translations added incrementally)

## Repo structure

```
inventory/
├── apps/
│   ├── web/                 # Next.js 14 App Router, TS
│   │   └── src/app/(auth)|(admin)|(inventory)|(doctor)|(delivery)|(supplier)/
│   └── api/                 # Express, TS
│       └── src/{controllers,services,repositories,middleware,routes,validation,lib}/
├── packages/
│   └── shared/              # Zod schemas, enums, shared types (single source of truth)
├── docker-compose.yml        # Postgres
├── package.json               # npm workspaces root
└── docs/superpowers/specs/
```

Controllers stay thin (parse req, call service, shape response). Business logic lives in services. Repositories wrap Prisma calls.

## Database schema (foundation scope)

```prisma
enum UserStatus { ACTIVE INACTIVE LOCKED }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  status        UserStatus @default(ACTIVE)
  failedLoginCount Int   @default(0)
  lockedUntil   DateTime?
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  roles         UserRole[]
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique   // SUPER_ADMIN, INVENTORY_MANAGER, INVENTORY_STAFF, DOCTOR, DELIVERY_STAFF, SUPPLIER
  description String?
  isSystem    Boolean  @default(false)
  users       UserRole[]
  permissions RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique   // e.g. "product.create", "order.approve"
  description String?
  roles       RolePermission[]
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id])
  role   Role @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  replacedByTokenId String?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  entityType String?
  entityId   String?
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  user       User? @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId])
}

model SystemSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

Seed script creates 6 system roles, a baseline set of permission keys, and one Super Admin user.

## Auth flow

**Login** — `POST /api/v1/auth/login`. Validates credentials via bcrypt/argon2. 5 failed attempts locks the account for 15 minutes (`failedLoginCount` + `lockedUntil`). Success resets the counter, updates `lastLoginAt`, logs a `LOGIN` audit entry; failure logs `LOGIN_FAILED` with a generic error message (no user-enumeration). Issues:
- Access JWT (15 min, payload: userId, roles, permissions) — returned in JSON body, held in memory on the client, never persisted to storage.
- Refresh JWT (7 days) — hashed and stored in `RefreshToken`, set as an HttpOnly + Secure + SameSite=Strict cookie scoped to `/api/v1/auth`.

**Refresh** — `POST /api/v1/auth/refresh`. Verifies the cookie's JWT and DB hash match and are unrevoked, then rotates: revokes the old row, issues a new access+refresh pair. If a revoked token is replayed, all of that user's refresh tokens are revoked and a `SECURITY_REFRESH_REUSE` audit entry is logged (theft detection).

**Logout** — `POST /api/v1/auth/logout`. Revokes the current refresh token row and clears the cookie.

**Middleware** — `helmet`, `cors` (credentialed, origin-locked to the web app), rate limiting on `/auth/*`. `authenticate` verifies the bearer access token and attaches `req.user`. `authorize(permissionKey)` checks the attached permissions and 403s otherwise — applied to every protected route; the frontend hiding a button is never sufficient on its own. A central error handler maps thrown `AppError` subclasses to a consistent `{success, error: {code, message}}` shape with no stack traces leaked in production.

**Frontend** — access token lives in a React context (memory only). An Axios instance attaches it to requests and, on a 401, calls `/auth/refresh` (cookie sent automatically) and retries once before redirecting to `/login` on failure. Each role's route group is layout-gated by a lightweight session-presence check; real enforcement always happens again at the API via `authorize`.

## UI shell

**Auth pages** (no sidebar): `/login`, `/forgot-password`, `/reset-password?token=`, `/activate?token=`. Accounts are created only by Super Admin/Inventory Manager — no public signup. Password reset/activation emails are stubbed to console logging for now (real SMTP/provider wired in a later sub-project).

**Six role-gated route groups**, each with sidebar nav (items matching that role's full spec page list, most linking to "coming soon" placeholders until their owning sub-project lands) and a shared topnav (user menu, notification bell icon — inert for now, language switcher, dark-mode toggle).

**Built now, fully functional** (this is the RBAC engine itself, not a placeholder):
- `/admin/users` — searchable/paginated table, create/edit drawer (assign role(s), set status), deactivate (soft-delete).
- `/admin/roles` — list, create custom role, assign permissions grouped by category; system roles are view-only for deletion.
- `/admin/audit-logs` — read-only, filterable by user/action/date range.

**Shared component library built now** (reused by every later sub-project): `DataTable`, `Drawer`, `Modal`, `ConfirmDialog`, `StatusBadge`, toast notifications, RHF `FormField` wrappers, `Skeleton` loaders, `EmptyState`, `Sidebar`/`TopNav` layouts, `LanguageSwitcher`, `ThemeToggle`.

## Testing scope

**Backend (Jest + Supertest, real dockerized Postgres, no mocked DB):**
- Login success/failure, lockout after 5 attempts and its expiry, password reset token expiry/reuse.
- Refresh rotation, and refresh-token-reuse triggering full revocation.
- Authorization middleware: 401 on missing/expired token, 403 on missing permission.
- User/Role CRUD: soft-deleted users excluded from listings, system roles cannot be deleted, permission assignment rejects unknown keys.
- Integration: full login → access protected route → refresh → logout cycle.
- Explicit unauthorized-access case: a doctor-role token hitting `/admin/users` must 403.

**Frontend (Vitest/RTL + one Playwright e2e smoke):**
- Login form validation and lockout message rendering.
- DataTable sort/paginate/filter behavior.
- E2E smoke: log in as seeded Super Admin → land on dashboard → create a user → assign a role → log out.

## Out of scope (deferred to later sub-projects)

Products, warehouses, stock, doctor requests, deliveries, suppliers, purchase orders, reports, real notifications, real-time updates, full ar/ku translations (structure only for now).
