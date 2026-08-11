# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the auth/RBAC engine, base DB schema, and role-gated UI shell that every later sub-project of the medical inventory platform builds on.

**Architecture:** npm-workspaces monorepo (`apps/web` Next.js 14 App Router, `apps/api` Express, `packages/shared` Zod/types). Express follows controller→service→repository layering with Prisma as the DB layer. Next.js uses route groups per role, gated by a session-presence check at the layout level while the API re-enforces every permission server-side.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, React Hook Form, Zod, TanStack Query, next-intl, Node.js, Express, Prisma, PostgreSQL (Docker), Jest, Supertest, Vitest, React Testing Library, Playwright, bcrypt, jsonwebtoken, helmet, express-rate-limit.

## Global Constraints

- No public self-registration — accounts created only by Super Admin/Inventory Manager (spec: "Account creation").
- Access JWT (15 min) held in memory on the client only; refresh JWT (7 days) in HttpOnly+Secure+SameSite=Strict cookie, rotated on every use (spec: token strategy).
- Every protected API route must call `authorize(permissionKey)` — frontend button-hiding is never sufficient alone (spec: security).
- Password reset/activation emails are stubbed to console logging for now, real provider deferred (spec: email sending decision).
- 5 failed logins locks an account for 15 minutes (spec: account lockout rules).
- Refresh tokens stored as SHA-256 hashes, never raw (spec: security).
- i18n (next-intl) + RTL layout + dark mode wired now, only English strings populated (spec: i18n/dark-mode decision).
- All tests run against a real dockerized Postgres — no mocked DB (spec: testing scope).

---

## File Structure

```
inventory/
├── docker-compose.yml
├── package.json                          # npm workspaces root
├── tsconfig.base.json
├── packages/shared/
│   ├── package.json
│   ├── src/
│   │   ├── enums.ts                       # RoleName, PermissionKey
│   │   ├── schemas/auth.ts                # login/reset/activate Zod schemas
│   │   ├── schemas/user.ts                # user create/update Zod schemas
│   │   ├── schemas/role.ts                # role create/update Zod schemas
│   │   └── index.ts
│   └── tsconfig.json
├── apps/api/
│   ├── package.json
│   ├── prisma/schema.prisma
│   ├── prisma/seed.ts
│   ├── src/
│   │   ├── lib/prisma.ts                  # Prisma client singleton
│   │   ├── lib/errors.ts                  # AppError hierarchy
│   │   ├── lib/jwt.ts                     # sign/verify access+refresh
│   │   ├── lib/hash.ts                    # bcrypt wrappers, token hashing
│   │   ├── middleware/errorHandler.ts
│   │   ├── middleware/authenticate.ts
│   │   ├── middleware/authorize.ts
│   │   ├── middleware/validate.ts         # Zod request validator
│   │   ├── services/auth.service.ts
│   │   ├── services/user.service.ts
│   │   ├── services/role.service.ts
│   │   ├── services/auditLog.service.ts
│   │   ├── repositories/user.repository.ts
│   │   ├── repositories/role.repository.ts
│   │   ├── repositories/refreshToken.repository.ts
│   │   ├── repositories/auditLog.repository.ts
│   │   ├── controllers/auth.controller.ts
│   │   ├── controllers/user.controller.ts
│   │   ├── controllers/role.controller.ts
│   │   ├── controllers/auditLog.controller.ts
│   │   ├── routes/auth.routes.ts
│   │   ├── routes/user.routes.ts
│   │   ├── routes/role.routes.ts
│   │   ├── routes/auditLog.routes.ts
│   │   ├── routes/index.ts
│   │   └── app.ts / server.ts
│   └── test/
│       ├── setup.ts                       # migrate+seed test DB
│       ├── auth.service.test.ts
│       ├── auth.routes.test.ts
│       ├── authorize.middleware.test.ts
│       ├── user.service.test.ts
│       └── role.service.test.ts
└── apps/web/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── src/
    │   ├── i18n/request.ts, en.json, ar.json, ku.json
    │   ├── lib/apiClient.ts               # Axios instance + interceptors
    │   ├── lib/AuthContext.tsx
    │   ├── components/ui/{DataTable,Drawer,Modal,ConfirmDialog,StatusBadge,Toast,FormField,Skeleton,EmptyState}.tsx
    │   ├── components/layout/{Sidebar,TopNav,ThemeToggle,LanguageSwitcher}.tsx
    │   ├── app/(auth)/{login,forgot-password,reset-password,activate}/page.tsx
    │   ├── app/(admin)/layout.tsx
    │   ├── app/(admin)/users/page.tsx
    │   ├── app/(admin)/roles/page.tsx
    │   ├── app/(admin)/audit-logs/page.tsx
    │   ├── app/(inventory)/layout.tsx + dashboard/page.tsx
    │   ├── app/(doctor)/layout.tsx + dashboard/page.tsx
    │   ├── app/(delivery)/layout.tsx + dashboard/page.tsx
    │   └── app/(supplier)/layout.tsx + dashboard/page.tsx
    └── test/{login-form,data-table}.test.tsx, e2e/smoke.spec.ts
```

---

### Task 1: Monorepo scaffold + Postgres

**Files:**
- Create: `package.json` (root), `tsconfig.base.json`, `docker-compose.yml`, `.gitignore`, `.env.example`

**Interfaces:**
- Produces: workspaces `apps/*`, `packages/*`; `DATABASE_URL` env var consumed by Task 3.

- [x] **Step 1: Root package.json**

```json
{
  "name": "medical-inventory-platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:api": "npm run dev -w apps/api",
    "dev:web": "npm run dev -w apps/web",
    "test:api": "npm test -w apps/api",
    "test:web": "npm test -w apps/web"
  }
}
```

- [x] **Step 2: tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

- [x] **Step 3: docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: inventory
      POSTGRES_PASSWORD: inventory
      POSTGRES_DB: inventory_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [x] **Step 4: .env.example (root)**

```
DATABASE_URL="postgresql://inventory:inventory@localhost:5432/inventory_dev?schema=public"
SHADOW_DATABASE_URL="postgresql://inventory:inventory@localhost:5432/inventory_shadow?schema=public"
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
WEB_URL="http://localhost:3000"
API_PORT=4000
```

- [x] **Step 5: .gitignore**

```
node_modules/
.next/
dist/
.env
*.log
```

- [x] **Step 6: Start Postgres and verify**

Run: `docker compose up -d && docker compose ps`
Expected: `postgres` service state `running (healthy)` or `Up`.

- [x] **Step 7: Commit**

```bash
git add package.json tsconfig.base.json docker-compose.yml .gitignore .env.example
git commit -m "chore: scaffold monorepo workspaces and postgres"
```

---

### Task 2: Shared package — enums and Zod schemas

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/enums.ts`, `packages/shared/src/schemas/auth.ts`, `packages/shared/src/schemas/user.ts`, `packages/shared/src/schemas/role.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/test/schemas.test.ts`

**Interfaces:**
- Produces: `RoleName` enum, `PermissionKey` type, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `activateAccountSchema`, `createUserSchema`, `updateUserSchema`, `createRoleSchema`, `updateRolePermissionsSchema` — all imported by both `apps/api` and `apps/web`.

- [x] **Step 1: package.json**

```json
{
  "name": "@inventory/shared",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "typescript": "^5.5.0", "vitest": "^2.0.0" }
}
```

- [x] **Step 2: enums.ts**

```typescript
export const RoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  INVENTORY_STAFF: 'INVENTORY_STAFF',
  DOCTOR: 'DOCTOR',
  DELIVERY_STAFF: 'DELIVERY_STAFF',
  SUPPLIER: 'SUPPLIER',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const PermissionKey = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  ROLE_MANAGE: 'role.manage',
  AUDIT_LOG_VIEW: 'auditLog.view',
} as const;
export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];
```

- [x] **Step 3: Write failing test for schemas**

`packages/shared/test/schemas.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { loginSchema, createUserSchema } from '../src';

describe('loginSchema', () => {
  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x'.repeat(8) });
    expect(result.success).toBe(false);
  });
  it('accepts valid payload', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(8) });
    expect(result.success).toBe(true);
  });
});

describe('createUserSchema', () => {
  it('requires at least one roleId', () => {
    const result = createUserSchema.safeParse({
      email: 'a@b.com', firstName: 'A', lastName: 'B', roleIds: [],
    });
    expect(result.success).toBe(false);
  });
});
```

- [x] **Step 4: Run test to verify it fails**

Run: `npm test -w packages/shared`
Expected: FAIL — cannot find module `../src` exports `loginSchema`/`createUserSchema`.

- [x] **Step 5: Implement schemas**

`packages/shared/src/schemas/auth.ts`:
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const activateAccountSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
```

`packages/shared/src/schemas/user.ts`:
```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).min(1),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

`packages/shared/src/schemas/role.ts`:
```typescript
import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
});
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
```

`packages/shared/src/index.ts`:
```typescript
export * from './enums';
export * from './schemas/auth';
export * from './schemas/user';
export * from './schemas/role';
```

- [x] **Step 6: Run test to verify it passes**

Run: `npm test -w packages/shared`
Expected: PASS (3 tests)

- [x] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat: shared enums and zod schemas for auth/user/role"
```

---

### Task 3: Prisma schema, migration, seed

**Files:**
- Create: `apps/api/package.json`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`, `apps/api/src/lib/prisma.ts`

**Interfaces:**
- Produces: Prisma client singleton `prisma` from `src/lib/prisma.ts`; DB tables `User, Role, Permission, UserRole, RolePermission, RefreshToken, PasswordResetToken, AuditLog, SystemSetting`.

- [x] **Step 1: apps/api/package.json**

```json
{
  "name": "@inventory/api",
  "version": "0.0.1",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "test": "jest --runInBand",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@inventory/shared": "*",
    "@prisma/client": "^5.18.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.18.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.4",
    "tsx": "^4.16.2",
    "typescript": "^5.5.0"
  }
}
```

- [x] **Step 2: prisma/schema.prisma** (full foundation schema from design spec)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
}

model User {
  id               String    @id @default(cuid())
  email            String    @unique
  passwordHash     String
  firstName        String
  lastName         String
  phone            String?
  status           UserStatus @default(ACTIVE)
  failedLoginCount Int       @default(0)
  lockedUntil      DateTime?
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?

  roles         UserRole[]
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  isSystem    Boolean  @default(false)
  users       UserRole[]
  permissions RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique
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
  id                String    @id @default(cuid())
  userId            String
  tokenHash         String    @unique
  expiresAt         DateTime
  revokedAt         DateTime?
  replacedByTokenId String?
  ipAddress         String?
  userAgent         String?
  createdAt         DateTime  @default(now())
  user              User      @relation(fields: [userId], references: [id])
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
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
  user       User?    @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId])
}

model SystemSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

- [x] **Step 3: src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;
```

- [x] **Step 4: Run migration**

Run: `npm install && npm run prisma:migrate -w apps/api -- --name init`
Expected: migration folder created, tables exist in `inventory_dev` DB.

- [x] **Step 5: seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RoleName, PermissionKey } from '@inventory/shared';

const prisma = new PrismaClient();

async function main() {
  const permissions = await Promise.all(
    Object.values(PermissionKey).map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } })
    )
  );

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, isSystem: true },
      })
    )
  );

  const superAdminRole = roles.find((r) => r.name === RoleName.SUPER_ADMIN)!;
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: superAdminRole.id, permissionId: p.id },
      })
    )
  );

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.local' },
    update: {},
    create: {
      email: 'admin@inventory.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  console.log('Seed complete. Login: admin@inventory.local / ChangeMe123!');
}

main().finally(() => prisma.$disconnect());
```

- [x] **Step 6: Run seed and verify**

Run: `npm run prisma:seed -w apps/api`
Expected: console prints "Seed complete..."; `SELECT * FROM "User"` shows one row.

- [x] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/prisma apps/api/src/lib/prisma.ts
git commit -m "feat: prisma schema, migration, and seed script"
```

---

### Task 4: Error hierarchy, JWT + hash libs, central error handler

**Files:**
- Create: `apps/api/src/lib/errors.ts`, `apps/api/src/lib/jwt.ts`, `apps/api/src/lib/hash.ts`, `apps/api/src/middleware/errorHandler.ts`
- Test: `apps/api/test/jwt.test.ts`, `apps/api/test/hash.test.ts`

**Interfaces:**
- Produces: `AppError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ConflictError` classes (each with `statusCode`, `code`, `message`); `signAccessToken(payload)`, `verifyAccessToken(token)`, `signRefreshToken(userId)`, `verifyRefreshToken(token)`; `hashPassword`, `comparePassword`, `hashToken(raw)`.

- [x] **Step 1: lib/errors.ts**

```typescript
export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, 'UNAUTHORIZED', message); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, 'FORBIDDEN', message); }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, 'NOT_FOUND', message); }
}
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', public details?: unknown) { super(400, 'VALIDATION_ERROR', message); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(409, 'CONFLICT', message); }
}
```

- [x] **Step 2: Write failing tests for jwt/hash**

`apps/api/test/jwt.test.ts`:
```typescript
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/lib/jwt';

describe('jwt lib', () => {
  it('round-trips an access token payload', () => {
    const token = signAccessToken({ userId: 'u1', roles: ['DOCTOR'], permissions: ['x'] });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('u1');
  });
  it('round-trips a refresh token', () => {
    const token = signRefreshToken('u1');
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('u1');
  });
  it('throws on tampered token', () => {
    const token = signAccessToken({ userId: 'u1', roles: [], permissions: [] });
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });
});
```

`apps/api/test/hash.test.ts`:
```typescript
import { hashPassword, comparePassword, hashToken } from '../src/lib/hash';

describe('hash lib', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('Secret123!');
    expect(await comparePassword('Secret123!', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
  it('produces a deterministic token hash', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
  });
});
```

- [x] **Step 3: Run tests to verify they fail**

Run: `npm test -w apps/api -- jwt hash`
Expected: FAIL — modules `../src/lib/jwt`, `../src/lib/hash` do not exist.

- [x] **Step 4: Implement lib/jwt.ts**

```typescript
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface AccessTokenPayload {
  userId: string;
  roles: string[];
  permissions: string[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
}
```

- [x] **Step 5: Implement lib/hash.ts**

```typescript
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
```

- [x] **Step 6: Run tests to verify they pass**

Run: `npm test -w apps/api -- jwt hash`
Expected: PASS (5 tests). Set `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` in `apps/api/.env` (copy from root `.env.example` values) beforehand.

- [x] **Step 7: Implement middleware/errorHandler.ts**

```typescript
import { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
```

- [x] **Step 8: Commit**

```bash
git add apps/api/src/lib/errors.ts apps/api/src/lib/jwt.ts apps/api/src/lib/hash.ts apps/api/src/middleware/errorHandler.ts apps/api/test/jwt.test.ts apps/api/test/hash.test.ts
git commit -m "feat: error hierarchy, jwt/hash libs, central error handler"
```

---

### Task 5: Repositories (User, Role, RefreshToken, AuditLog)

**Files:**
- Create: `apps/api/src/repositories/user.repository.ts`, `apps/api/src/repositories/role.repository.ts`, `apps/api/src/repositories/refreshToken.repository.ts`, `apps/api/src/repositories/auditLog.repository.ts`

**Interfaces:**
- Consumes: `prisma` from Task 3.
- Produces: `userRepository.{findByEmail, findById, create, update, softDelete, list}`; `roleRepository.{findByName, findById, list, create, setPermissions}`; `refreshTokenRepository.{create, findByHash, revoke, revokeAllForUser}`; `auditLogRepository.{create, list}`. Used by services in Task 6+.

- [x] **Step 1: user.repository.ts**

```typescript
import { prisma } from '../lib/prisma';
import { Prisma, UserStatus } from '@prisma/client';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  },
  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null }, include: { roles: { include: { role: true } } } });
  },
  create(data: { email: string; passwordHash: string; firstName: string; lastName: string; phone?: string; roleIds: string[] }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });
  },
  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },
  softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: UserStatus.INACTIVE } });
  },
  list(params: { skip: number; take: number; search?: string }) {
    const where = {
      deletedAt: null,
      ...(params.search
        ? { OR: [{ email: { contains: params.search, mode: 'insensitive' as const } }, { firstName: { contains: params.search, mode: 'insensitive' as const } }, { lastName: { contains: params.search, mode: 'insensitive' as const } }] }
        : {}),
    };
    return Promise.all([
      prisma.user.findMany({ where, skip: params.skip, take: params.take, include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
  },
  incrementFailedLogin(id: string, lockedUntil: Date | null) {
    return prisma.user.update({ where: { id }, data: { failedLoginCount: { increment: 1 }, lockedUntil } });
  },
  resetFailedLogin(id: string) {
    return prisma.user.update({ where: { id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  },
};
```

- [x] **Step 2: role.repository.ts**

```typescript
import { prisma } from '../lib/prisma';

export const roleRepository = {
  findByName(name: string) {
    return prisma.role.findUnique({ where: { name }, include: { permissions: { include: { permission: true } } } });
  },
  findById(id: string) {
    return prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } } } });
  },
  list() {
    return prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
  },
  create(data: { name: string; description?: string }) {
    return prisma.role.create({ data });
  },
  setPermissions(roleId: string, permissionIds: string[]) {
    return prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })) }),
    ]);
  },
  allPermissions() {
    return prisma.permission.findMany();
  },
};
```

- [x] **Step 3: refreshToken.repository.ts**

```typescript
import { prisma } from '../lib/prisma';

export const refreshTokenRepository = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date; ipAddress?: string; userAgent?: string }) {
    return prisma.refreshToken.create({ data });
  },
  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },
  revoke(id: string, replacedByTokenId?: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date(), replacedByTokenId } });
  },
  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};
```

- [x] **Step 4: auditLog.repository.ts**

```typescript
import { prisma } from '../lib/prisma';

export const auditLogRepository = {
  create(data: { userId?: string; action: string; entityType?: string; entityId?: string; oldValue?: unknown; newValue?: unknown; ipAddress?: string; userAgent?: string }) {
    return prisma.auditLog.create({ data: data as any });
  },
  list(params: { skip: number; take: number; userId?: string; action?: string }) {
    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.action ? { action: params.action } : {}),
    };
    return Promise.all([
      prisma.auditLog.findMany({ where, skip: params.skip, take: params.take, orderBy: { createdAt: 'desc' }, include: { user: true } }),
      prisma.auditLog.count({ where }),
    ]);
  },
};
```

- [x] **Step 5: Verify build**

Run: `npx tsc --noEmit -p apps/api`
Expected: no type errors.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/repositories
git commit -m "feat: user/role/refreshToken/auditLog repositories"
```

---

### Task 6: Auth service (login, lockout, refresh rotation, reset)

**Files:**
- Create: `apps/api/src/services/auth.service.ts`
- Test: `apps/api/test/auth.service.test.ts`, `apps/api/test/setup.ts`

**Interfaces:**
- Consumes: `userRepository`, `refreshTokenRepository`, `auditLogRepository` (Task 5); `hashPassword/comparePassword/hashToken` (Task 4); `signAccessToken/signRefreshToken/verifyRefreshToken` (Task 4).
- Produces: `authService.{login, refresh, logout, requestPasswordReset, resetPassword}`. Used by `auth.controller.ts` in Task 7.

- [x] **Step 1: test/setup.ts** (runs migrations against test DB before suite)

```typescript
import { execSync } from 'child_process';

export default async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', stdio: 'inherit' });
}
```

Add to `apps/api/package.json` jest config: `"globalSetup": "<rootDir>/test/setup.ts"`.

- [x] **Step 2: Write failing tests**

`apps/api/test/auth.service.test.ts`:
```typescript
import { authService } from '../src/services/auth.service';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/hash';
import { RoleName } from '@inventory/shared';

describe('authService', () => {
  let userId: string;

  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    const passwordHash = await hashPassword('CorrectHorse1!');
    const user = await prisma.user.create({
      data: { email: 'test.auth@example.com', passwordHash, firstName: 'T', lastName: 'U', roles: { create: [{ roleId: role.id }] } },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('logs in with correct credentials', async () => {
    const result = await authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('locks the account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(
        authService.login({ email: 'test.auth@example.com', password: 'wrong' }, { ipAddress: '127.0.0.1', userAgent: 'jest' })
      ).rejects.toThrow();
    }
    await expect(
      authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' })
    ).rejects.toThrow(/locked/i);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
    const { refreshToken } = await authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    const rotated = await authService.refresh(refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    expect(rotated.accessToken).toBeDefined();
    // reuse of the original (now-revoked) token must revoke everything and throw
    await expect(authService.refresh(refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' })).rejects.toThrow();
    await expect(authService.refresh(rotated.refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' })).rejects.toThrow();
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npm test -w apps/api -- auth.service`
Expected: FAIL — `../src/services/auth.service` does not exist.

- [x] **Step 4: Implement auth.service.ts**

```typescript
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { comparePassword, hashPassword, hashToken } from '../lib/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { UnauthorizedError } from '../lib/errors';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TTL_DAYS = 7;

interface RequestMeta { ipAddress?: string; userAgent?: string }

function flattenPermissions(user: any): string[] {
  const set = new Set<string>();
  for (const ur of user.roles) for (const rp of ur.role.permissions ?? []) set.add(rp.permission.key);
  return [...set];
}

export const authService = {
  async login(input: { email: string; password: string }, meta: RequestMeta) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is locked, try again later');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      const nextCount = user.failedLoginCount + 1;
      const lockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;
      await userRepository.incrementFailedLogin(user.id, lockedUntil);
      await auditLogRepository.create({ userId: user.id, action: 'LOGIN_FAILED', ipAddress: meta.ipAddress, userAgent: meta.userAgent });
      throw new UnauthorizedError('Invalid credentials');
    }

    await userRepository.resetFailedLogin(user.id);
    await auditLogRepository.create({ userId: user.id, action: 'LOGIN', ipAddress: meta.ipAddress, userAgent: meta.userAgent });

    const roles = user.roles.map((r: any) => r.role.name);
    const permissions = flattenPermissions(user);
    const accessToken = signAccessToken({ userId: user.id, roles, permissions });
    const refreshTokenRaw = signRefreshToken(user.id);
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(refreshTokenRaw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { accessToken, refreshToken: refreshTokenRaw, user: { id: user.id, email: user.email, roles, permissions } };
  },

  async refresh(refreshTokenRaw: string, meta: RequestMeta) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenRaw);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const stored = await refreshTokenRepository.findByHash(hashToken(refreshTokenRaw));
    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    if (stored.revokedAt) {
      await refreshTokenRepository.revokeAllForUser(decoded.userId);
      await auditLogRepository.create({ userId: decoded.userId, action: 'SECURITY_REFRESH_REUSE', ipAddress: meta.ipAddress, userAgent: meta.userAgent });
      throw new UnauthorizedError('Refresh token reuse detected, all sessions revoked');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) throw new UnauthorizedError('User not found');

    const newRefreshRaw = signRefreshToken(user.id);
    const newRow = await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(newRefreshRaw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await refreshTokenRepository.revoke(stored.id, newRow.id);

    const fullUser = await userRepository.findByEmail(user.email);
    const roles = fullUser!.roles.map((r: any) => r.role.name);
    const permissions = flattenPermissions(fullUser);
    const accessToken = signAccessToken({ userId: user.id, roles, permissions });

    return { accessToken, refreshToken: newRefreshRaw };
  },

  async logout(refreshTokenRaw: string) {
    const stored = await refreshTokenRepository.findByHash(hashToken(refreshTokenRaw));
    if (stored && !stored.revokedAt) await refreshTokenRepository.revoke(stored.id);
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // no user-enumeration
    const rawToken = signRefreshToken(user.id); // reuse signer for random opaque token
    console.log(`[stub email] Password reset link for ${email}: /reset-password?token=${rawToken}`);
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const decoded = verifyRefreshToken(rawToken);
    const passwordHash = await hashPassword(newPassword);
    await userRepository.update(decoded.userId, { passwordHash });
    await refreshTokenRepository.revokeAllForUser(decoded.userId);
  },
};
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -w apps/api -- auth.service`
Expected: PASS (3 tests, ~7s due to lockout loop).

- [x] **Step 6: Commit**

```bash
git add apps/api/src/services/auth.service.ts apps/api/test/auth.service.test.ts apps/api/test/setup.ts
git commit -m "feat: auth service with lockout and refresh rotation"
```

---

### Task 7: Auth middleware (authenticate, authorize) + validate middleware

**Files:**
- Create: `apps/api/src/middleware/authenticate.ts`, `apps/api/src/middleware/authorize.ts`, `apps/api/src/middleware/validate.ts`
- Test: `apps/api/test/authorize.middleware.test.ts`

**Interfaces:**
- Consumes: `verifyAccessToken` (Task 4), `ForbiddenError`/`UnauthorizedError` (Task 4).
- Produces: `authenticate` (Express middleware, sets `req.user: {userId, roles, permissions}`), `authorize(permissionKey: string)` (returns middleware), `validate(schema: ZodSchema)` (returns middleware validating `req.body`).

- [x] **Step 1: Write failing test**

`apps/api/test/authorize.middleware.test.ts`:
```typescript
import { authorize } from '../src/middleware/authorize';
import { ForbiddenError } from '../src/lib/errors';

function mockReqRes(permissions: string[]) {
  const req: any = { user: { userId: 'u1', roles: [], permissions } };
  const res: any = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('authorize middleware', () => {
  it('calls next() when permission present', () => {
    const { req, res, next } = mockReqRes(['user.create']);
    authorize('user.create')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('throws ForbiddenError when permission missing', () => {
    const { req, res, next } = mockReqRes(['other.perm']);
    authorize('user.create')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/api -- authorize.middleware`
Expected: FAIL — `../src/middleware/authorize` does not exist.

- [x] **Step 3: Implement middleware/authenticate.ts**

```typescript
import { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { UnauthorizedError } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; roles: string[]; permissions: string[] };
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError('Missing access token'));
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
```

- [x] **Step 4: Implement middleware/authorize.ts**

```typescript
import { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export function authorize(permissionKey: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!req.user.permissions.includes(permissionKey)) return next(new ForbiddenError(`Missing permission: ${permissionKey}`));
    next();
  };
}
```

- [x] **Step 5: Implement middleware/validate.ts**

```typescript
import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors';

export function validate(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(new ValidationError('Invalid request body', result.error.flatten()));
    req.body = result.data;
    next();
  };
}
```

- [x] **Step 6: Run test to verify it passes**

Run: `npm test -w apps/api -- authorize.middleware`
Expected: PASS (2 tests)

- [x] **Step 7: Commit**

```bash
git add apps/api/src/middleware
git commit -m "feat: authenticate/authorize/validate middleware"
```

---

### Task 8: Auth routes/controller + app wiring

**Files:**
- Create: `apps/api/src/controllers/auth.controller.ts`, `apps/api/src/routes/auth.routes.ts`, `apps/api/src/routes/index.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Test: `apps/api/test/auth.routes.test.ts`

**Interfaces:**
- Consumes: `authService` (Task 6), `validate` (Task 7), shared schemas (Task 2).
- Produces: Express `app` export for Supertest; routes `POST /api/v1/auth/login|refresh|logout|forgot-password|reset-password`.

- [x] **Step 1: Write failing test**

`apps/api/test/auth.routes.test.ts`:
```typescript
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/hash';
import { RoleName } from '@inventory/shared';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    const passwordHash = await hashPassword('RoutesPass1!');
    await prisma.user.create({ data: { email: 'routes@example.com', passwordHash, firstName: 'R', lastName: 'T', roles: { create: [{ roleId: role.id }] } } });
  });
  afterAll(async () => {
    await prisma.user.delete({ where: { email: 'routes@example.com' } });
    await prisma.$disconnect();
  });

  it('returns 200 and sets refresh cookie on valid login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'routes@example.com', password: 'RoutesPass1!' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refreshToken=/);
  });

  it('returns 401 on invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'routes@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on malformed body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/api -- auth.routes`
Expected: FAIL — `../src/app` does not exist.

- [x] **Step 3: Implement controllers/auth.controller.ts**

```typescript
import { RequestHandler } from 'express';
import { authService } from '../services/auth.service';

const REFRESH_COOKIE = 'refreshToken';
const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/v1/auth' };

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
    res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing refresh token' } });
    const result = await authService.refresh(token, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
    res.status(200).json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) { next(err); }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};
```

- [x] **Step 4: Implement routes/auth.routes.ts**

```typescript
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@inventory/shared';
import { login, refresh, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';

const authLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

export const authRouter = Router();
authRouter.use(authLimiter);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPassword);
```

- [x] **Step 5: Implement routes/index.ts, app.ts, server.ts**

`routes/index.ts`:
```typescript
import { Router } from 'express';
import { authRouter } from './auth.routes';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
```

`app.ts`:
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', apiRouter);
app.use(errorHandler);
```

`server.ts`:
```typescript
import 'dotenv/config';
import { app } from './app';

const port = process.env.API_PORT ?? 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
```

Add `cookie-parser`, `@types/cookie-parser`, `dotenv` to `apps/api/package.json` dependencies.

- [x] **Step 6: Run test to verify it passes**

Run: `npm test -w apps/api -- auth.routes`
Expected: PASS (3 tests)

- [x] **Step 7: Commit**

```bash
git add apps/api/src apps/api/package.json
git commit -m "feat: auth routes, controller, and express app wiring"
```

---

### Task 9: User service + CRUD routes

**Files:**
- Create: `apps/api/src/services/user.service.ts`, `apps/api/src/controllers/user.controller.ts`, `apps/api/src/routes/user.routes.ts`
- Modify: `apps/api/src/routes/index.ts`
- Test: `apps/api/test/user.service.test.ts`

**Interfaces:**
- Consumes: `userRepository`, `roleRepository` (Task 5), `hashPassword` (Task 4), `auditLogRepository` (Task 5).
- Produces: `userService.{create, update, deactivate, list, getById}`. Routes: `GET/POST /api/v1/users`, `GET/PATCH /api/v1/users/:id`, `DELETE /api/v1/users/:id` — all behind `authenticate` + `authorize('user.create'|'user.update'|'user.deactivate')`.

- [x] **Step 1: Write failing test**

`apps/api/test/user.service.test.ts`:
```typescript
import { userService } from '../src/services/user.service';
import { prisma } from '../src/lib/prisma';
import { RoleName } from '@inventory/shared';

describe('userService', () => {
  let roleId: string;
  let createdId: string;

  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    roleId = role.id;
  });

  afterAll(async () => {
    if (createdId) await prisma.userRole.deleteMany({ where: { userId: createdId } });
    if (createdId) await prisma.user.delete({ where: { id: createdId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('creates a user with a temporary password and assigned role', async () => {
    const user = await userService.create({ email: 'svc.user@example.com', firstName: 'S', lastName: 'U', roleIds: [roleId] }, 'admin-id');
    createdId = user.id;
    expect(user.email).toBe('svc.user@example.com');
  });

  it('excludes soft-deleted users from list()', async () => {
    await userService.deactivate(createdId, 'admin-id');
    const { items } = await userService.list({ page: 1, pageSize: 20 });
    expect(items.find((u) => u.id === createdId)).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/api -- user.service`
Expected: FAIL — `../src/services/user.service` does not exist.

- [x] **Step 3: Implement services/user.service.ts**

```typescript
import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { hashPassword } from '../lib/hash';
import { NotFoundError } from '../lib/errors';
import { CreateUserInput, UpdateUserInput } from '@inventory/shared';

export const userService = {
  async create(input: CreateUserInput, actorUserId: string) {
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);
    const user = await userRepository.create({ ...input, passwordHash });
    console.log(`[stub email] Account activation for ${input.email}, temp password: ${tempPassword}`);
    await auditLogRepository.create({ userId: actorUserId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, newValue: { email: input.email, roleIds: input.roleIds } });
    return user;
  },

  async update(id: string, input: UpdateUserInput, actorUserId: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');
    const { roleIds, ...rest } = input;
    const updated = await userRepository.update(id, {
      ...rest,
      ...(roleIds ? { roles: { deleteMany: {}, create: roleIds.map((roleId) => ({ roleId })) } } : {}),
    });
    await auditLogRepository.create({ userId: actorUserId, action: 'USER_UPDATED', entityType: 'User', entityId: id, oldValue: existing, newValue: input });
    return updated;
  },

  async deactivate(id: string, actorUserId: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');
    const result = await userRepository.softDelete(id);
    await auditLogRepository.create({ userId: actorUserId, action: 'USER_DEACTIVATED', entityType: 'User', entityId: id });
    return result;
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async list(params: { page: number; pageSize: number; search?: string }) {
    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await userRepository.list({ skip, take: params.pageSize, search: params.search });
    return { items, total, page: params.page, pageSize: params.pageSize };
  },
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -w apps/api -- user.service`
Expected: PASS (2 tests)

- [x] **Step 5: Implement controllers/user.controller.ts and routes/user.routes.ts**

```typescript
// controllers/user.controller.ts
import { RequestHandler } from 'express';
import { userService } from '../services/user.service';

export const createUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.create(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};
export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.body, req.user!.userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};
export const deactivateUser: RequestHandler = async (req, res, next) => {
  try {
    await userService.deactivate(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};
export const getUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};
export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await userService.list({ page, pageSize, search: req.query.search as string | undefined });
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
```

```typescript
// routes/user.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, PermissionKey } from '@inventory/shared';
import { createUser, updateUser, deactivateUser, getUser, listUsers } from '../controllers/user.controller';

export const userRouter = Router();
userRouter.use(authenticate);
userRouter.get('/', authorize(PermissionKey.USER_CREATE), listUsers);
userRouter.get('/:id', authorize(PermissionKey.USER_CREATE), getUser);
userRouter.post('/', authorize(PermissionKey.USER_CREATE), validate(createUserSchema), createUser);
userRouter.patch('/:id', authorize(PermissionKey.USER_UPDATE), validate(updateUserSchema), updateUser);
userRouter.delete('/:id', authorize(PermissionKey.USER_DEACTIVATE), deactivateUser);
```

Register in `routes/index.ts`: `apiRouter.use('/users', userRouter);`

- [x] **Step 6: Commit**

```bash
git add apps/api/src/services/user.service.ts apps/api/src/controllers/user.controller.ts apps/api/src/routes/user.routes.ts apps/api/src/routes/index.ts apps/api/test/user.service.test.ts
git commit -m "feat: user CRUD service, controller, and routes"
```

---

### Task 10: Role service + routes, AuditLog service + routes

**Files:**
- Create: `apps/api/src/services/role.service.ts`, `apps/api/src/controllers/role.controller.ts`, `apps/api/src/routes/role.routes.ts`, `apps/api/src/services/auditLog.service.ts`, `apps/api/src/controllers/auditLog.controller.ts`, `apps/api/src/routes/auditLog.routes.ts`
- Modify: `apps/api/src/routes/index.ts`
- Test: `apps/api/test/role.service.test.ts`

**Interfaces:**
- Consumes: `roleRepository`, `auditLogRepository` (Task 5).
- Produces: `roleService.{list, create, setPermissions, listPermissions}`; `auditLogService.list`. Routes `GET/POST /api/v1/roles`, `PATCH /api/v1/roles/:id/permissions`, `GET /api/v1/audit-logs` behind `authorize(PermissionKey.ROLE_MANAGE)` / `authorize(PermissionKey.AUDIT_LOG_VIEW)`.

- [x] **Step 1: Write failing test**

`apps/api/test/role.service.test.ts`:
```typescript
import { roleService } from '../src/services/role.service';
import { prisma } from '../src/lib/prisma';
import { RoleName } from '@inventory/shared';

describe('roleService', () => {
  afterAll(() => prisma.$disconnect());

  it('rejects deleting/renaming a system role via setPermissions on nonexistent role', async () => {
    await expect(roleService.setPermissions('nonexistent-id', [], 'admin-id')).rejects.toThrow();
  });

  it('creates a custom role and assigns permissions', async () => {
    const perms = await prisma.permission.findMany({ take: 1 });
    const role = await roleService.create({ name: 'CUSTOM_ROLE_TEST', description: 'test' }, 'admin-id');
    const updated = await roleService.setPermissions(role.id, perms.map((p) => p.id), 'admin-id');
    expect(updated).toBeDefined();
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.role.delete({ where: { id: role.id } });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/api -- role.service`
Expected: FAIL — module missing.

- [x] **Step 3: Implement services/role.service.ts**

```typescript
import { roleRepository } from '../repositories/role.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { CreateRoleInput } from '@inventory/shared';

export const roleService = {
  list() {
    return roleRepository.list();
  },
  listPermissions() {
    return roleRepository.allPermissions();
  },
  async create(input: CreateRoleInput, actorUserId: string) {
    const role = await roleRepository.create(input);
    await auditLogRepository.create({ userId: actorUserId, action: 'ROLE_CREATED', entityType: 'Role', entityId: role.id, newValue: input });
    return role;
  },
  async setPermissions(roleId: string, permissionIds: string[], actorUserId: string) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new ForbiddenError('Cannot modify permissions of a system role via this endpoint yet');
    const result = await roleRepository.setPermissions(roleId, permissionIds);
    await auditLogRepository.create({ userId: actorUserId, action: 'ROLE_PERMISSIONS_CHANGED', entityType: 'Role', entityId: roleId, newValue: { permissionIds } });
    return result;
  },
};
```

Note: test above expects `setPermissions` on a *nonexistent* role to throw `NotFoundError` — matches implementation. System-role permission edits are intentionally blocked in foundation scope; Super Admin can still fully configure custom roles.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -w apps/api -- role.service`
Expected: PASS (2 tests)

- [x] **Step 5: Implement auditLog.service.ts**

```typescript
import { auditLogRepository } from '../repositories/auditLog.repository';

export const auditLogService = {
  list(params: { page: number; pageSize: number; userId?: string; action?: string }) {
    const skip = (params.page - 1) * params.pageSize;
    return auditLogRepository.list({ skip, take: params.pageSize, userId: params.userId, action: params.action }).then(([items, total]) => ({ items, total, page: params.page, pageSize: params.pageSize }));
  },
};
```

- [x] **Step 6: Implement controllers + routes for role and auditLog**

```typescript
// controllers/role.controller.ts
import { RequestHandler } from 'express';
import { roleService } from '../services/role.service';

export const listRoles: RequestHandler = async (_req, res, next) => {
  try { res.json({ success: true, data: await roleService.list() }); } catch (err) { next(err); }
};
export const listPermissions: RequestHandler = async (_req, res, next) => {
  try { res.json({ success: true, data: await roleService.listPermissions() }); } catch (err) { next(err); }
};
export const createRole: RequestHandler = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await roleService.create(req.body, req.user!.userId) }); } catch (err) { next(err); }
};
export const setRolePermissions: RequestHandler = async (req, res, next) => {
  try { res.json({ success: true, data: await roleService.setPermissions(req.params.id, req.body.permissionIds, req.user!.userId) }); } catch (err) { next(err); }
};
```

```typescript
// routes/role.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createRoleSchema, updateRolePermissionsSchema, PermissionKey } from '@inventory/shared';
import { listRoles, listPermissions, createRole, setRolePermissions } from '../controllers/role.controller';

export const roleRouter = Router();
roleRouter.use(authenticate, authorize(PermissionKey.ROLE_MANAGE));
roleRouter.get('/', listRoles);
roleRouter.get('/permissions', listPermissions);
roleRouter.post('/', validate(createRoleSchema), createRole);
roleRouter.patch('/:id/permissions', validate(updateRolePermissionsSchema), setRolePermissions);
```

```typescript
// controllers/auditLog.controller.ts
import { RequestHandler } from 'express';
import { auditLogService } from '../services/auditLog.service';

export const listAuditLogs: RequestHandler = async (req, res, next) => {
  try {
    const result = await auditLogService.list({
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
      userId: req.query.userId as string | undefined,
      action: req.query.action as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
```

```typescript
// routes/auditLog.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { PermissionKey } from '@inventory/shared';
import { listAuditLogs } from '../controllers/auditLog.controller';

export const auditLogRouter = Router();
auditLogRouter.use(authenticate, authorize(PermissionKey.AUDIT_LOG_VIEW));
auditLogRouter.get('/', listAuditLogs);
```

Register both in `routes/index.ts`:
```typescript
apiRouter.use('/roles', roleRouter);
apiRouter.use('/audit-logs', auditLogRouter);
```

- [x] **Step 7: Commit**

```bash
git add apps/api/src/services/role.service.ts apps/api/src/services/auditLog.service.ts apps/api/src/controllers/role.controller.ts apps/api/src/controllers/auditLog.controller.ts apps/api/src/routes/role.routes.ts apps/api/src/routes/auditLog.routes.ts apps/api/src/routes/index.ts apps/api/test/role.service.test.ts
git commit -m "feat: role management and audit log read endpoints"
```

---

### Task 11: Unauthorized-access integration test (explicit spec case)

**Files:**
- Test: `apps/api/test/authorization.integration.test.ts`

**Interfaces:**
- Consumes: `app` (Task 8), `signAccessToken` (Task 4).

- [x] **Step 1: Write failing test**

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { signAccessToken } from '../src/lib/jwt';

describe('cross-role authorization', () => {
  it('403s when a DOCTOR-role token hits an admin-only user-management route', async () => {
    const token = signAccessToken({ userId: 'doctor-1', roles: ['DOCTOR'], permissions: [] });
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('401s with no token at all', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });
});
```

- [x] **Step 2: Run test to verify it currently passes (route already enforces authorize)**

Run: `npm test -w apps/api -- authorization.integration`
Expected: PASS (2 tests) — confirms Task 9's `authorize(PermissionKey.USER_CREATE)` correctly blocks a doctor token. If it fails, the bug is in `userRouter`'s middleware order from Task 9 — fix before proceeding.

- [x] **Step 3: Commit**

```bash
git add apps/api/test/authorization.integration.test.ts
git commit -m "test: explicit cross-role unauthorized-access coverage"
```

---

### Task 12: Next.js scaffold, Tailwind, i18n, theme

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js`, `apps/web/src/app/globals.css`, `apps/web/src/i18n/request.ts`, `apps/web/src/i18n/messages/en.json`, `apps/web/src/i18n/messages/ar.json`, `apps/web/src/i18n/messages/ku.json`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/layout/ThemeProvider.tsx`

**Interfaces:**
- Produces: `RootLayout` wrapping every page with `NextIntlClientProvider` + `ThemeProvider`; `dir="rtl"` applied automatically when locale is `ar`/`ku`.

- [x] **Step 1: package.json**

```json
{
  "name": "@inventory/web",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@inventory/shared": "*",
    "@tanstack/react-query": "^5.51.0",
    "axios": "^1.7.4",
    "next": "^14.2.5",
    "next-intl": "^3.17.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.2",
    "@hookform/resolvers": "^3.9.0",
    "sonner": "^1.5.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.46.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "jsdom": "^24.1.1"
  }
}
```

- [x] **Step 2: tailwind.config.ts + postcss.config.js**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
        active: '#2563eb',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

```javascript
// postcss.config.js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [x] **Step 3: src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [x] **Step 4: i18n setup**

`src/i18n/request.ts`:
```typescript
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar', 'ku'] as const;
export type Locale = (typeof locales)[number];
export const rtlLocales: Locale[] = ['ar', 'ku'];

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

`src/i18n/messages/en.json`:
```json
{ "auth": { "login": "Log in", "email": "Email", "password": "Password" }, "nav": { "dashboard": "Dashboard", "users": "Users", "roles": "Roles & Permissions", "auditLogs": "Audit Logs" } }
```

`src/i18n/messages/ar.json`:
```json
{ "auth": { "login": "تسجيل الدخول", "email": "البريد الإلكتروني", "password": "كلمة المرور" }, "nav": { "dashboard": "لوحة التحكم", "users": "المستخدمون", "roles": "الأدوار والصلاحيات", "auditLogs": "سجلات التدقيق" } }
```

`src/i18n/messages/ku.json`:
```json
{ "auth": { "login": "چوونەژوورەوە", "email": "ئیمەیل", "password": "وشەی نهێنی" }, "nav": { "dashboard": "داشبۆرد", "users": "بەکارهێنەران", "roles": "ڕۆڵ و دەسەڵاتەکان", "auditLogs": "تۆمارەکانی چاودێری" } }
```

- [x] **Step 5: ThemeProvider (dark mode)**

`src/components/layout/ThemeProvider.tsx`:
```typescript
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext<{ theme: 'light' | 'dark'; toggle: () => void }>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
```

- [x] **Step 6: Root layout**

`src/app/layout.tsx`:
```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { rtlLocales, Locale } from '@/i18n/request';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import './globals.css';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [x] **Step 7: Verify it builds and runs**

Run: `npm run dev -w apps/web` then visit `http://localhost:3000`
Expected: blank page renders with no console errors (no routes yet besides layout).

- [x] **Step 8: Commit**

```bash
git add apps/web
git commit -m "chore: scaffold next.js app with tailwind, i18n, and theme provider"
```

---

### Task 13: Axios client + AuthContext (frontend auth plumbing)

**Files:**
- Create: `apps/web/src/lib/apiClient.ts`, `apps/web/src/lib/AuthContext.tsx`
- Test: `apps/web/test/apiClient.test.ts`

**Interfaces:**
- Produces: `apiClient` (Axios instance with baseURL `/api/v1`, `withCredentials: true`, request interceptor injecting bearer token from `AuthContext`, response interceptor retrying once after `/auth/refresh` on 401); `AuthProvider`, `useAuth()` returning `{ user, accessToken, login, logout }`.

- [x] **Step 1: Write failing test**

`apps/web/test/apiClient.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from '../src/lib/apiClient';

describe('createApiClient', () => {
  it('attaches bearer token from the provided getter', async () => {
    const client = createApiClient(() => 'abc123');
    const config = await client.interceptors.request.handlers[0].fulfilled({ headers: {} } as any);
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/web -- apiClient`
Expected: FAIL — `createApiClient` not exported.

- [x] **Step 3: Implement lib/apiClient.ts**

```typescript
import axios, { AxiosInstance } from 'axios';

export function createApiClient(getAccessToken: () => string | null, onRefreshFailed?: () => void): AxiosInstance {
  const client = axios.create({ baseURL: '/api/v1', withCredentials: true });

  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  let refreshing: Promise<string> | null = null;

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          refreshing ??= axios.post('/api/v1/auth/refresh', {}, { withCredentials: true }).then((r) => r.data.data.accessToken);
          const newToken = await refreshing;
          refreshing = null;
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        } catch {
          refreshing = null;
          onRefreshFailed?.();
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -w apps/web -- apiClient`
Expected: PASS (1 test)

- [x] **Step 5: Implement lib/AuthContext.tsx**

```typescript
'use client';
import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from './apiClient';

interface AuthUser { id: string; email: string; roles: string[]; permissions: string[] }
interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  const client = useMemo(
    () => createApiClient(() => accessToken, () => router.push('/login')),
    [accessToken, router]
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
  }, [client]);

  const logout = useCallback(async () => {
    await client.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  }, [client, router]);

  return <AuthContext.Provider value={{ user, accessToken, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

- [x] **Step 6: Commit**

```bash
git add apps/web/src/lib/apiClient.ts apps/web/src/lib/AuthContext.tsx apps/web/test/apiClient.test.ts
git commit -m "feat: axios client with refresh interceptor and auth context"
```

---

### Task 14: Shared UI component library

**Files:**
- Create: `apps/web/src/components/ui/StatusBadge.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`, `Drawer.tsx`, `FormField.tsx`, `DataTable.tsx`
- Test: `apps/web/test/DataTable.test.tsx`

**Interfaces:**
- Produces: `<StatusBadge status="ACTIVE" />`, `<EmptyState title description />`, `<Skeleton className />`, `<Modal open onClose>`, `<ConfirmDialog open title description onConfirm onCancel>`, `<Drawer open onClose>`, `<FormField label error>`, `<DataTable columns rows page pageSize total onPageChange />` — consumed by pages in Tasks 16-18.

- [x] **Step 1: Write failing test**

`apps/web/test/DataTable.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from '../src/components/ui/DataTable';

describe('DataTable', () => {
  const columns = [{ key: 'name', header: 'Name' }];
  const rows = [{ name: 'Alice' }, { name: 'Bob' }];

  it('renders rows', () => {
    render(<DataTable columns={columns} rows={rows} page={1} pageSize={10} total={2} onPageChange={() => {}} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows empty state when rows is empty', () => {
    render(<DataTable columns={columns} rows={[]} page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn();
    render(<DataTable columns={columns} rows={rows} page={1} pageSize={1} total={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/web -- DataTable`
Expected: FAIL — `../src/components/ui/DataTable` does not exist.

- [x] **Step 3: Implement components/ui/EmptyState.tsx, StatusBadge.tsx, Skeleton.tsx**

```typescript
// EmptyState.tsx
export function EmptyState({ title = 'No results', description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="mt-1 text-sm">{description}</p>}
    </div>
  );
}
```

```typescript
// StatusBadge.tsx
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success', COMPLETED: 'bg-success/10 text-success', DELIVERED: 'bg-success/10 text-success',
  INACTIVE: 'bg-gray-200 text-gray-600', LOCKED: 'bg-warning/10 text-warning', PENDING: 'bg-warning/10 text-warning',
  REJECTED: 'bg-danger/10 text-danger', EXPIRED: 'bg-danger/10 text-danger', OUT_OF_STOCK: 'bg-danger/10 text-danger',
  SUBMITTED: 'bg-active/10 text-active', APPROVED: 'bg-active/10 text-active',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{status}</span>;
}
```

```typescript
// Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}
```

- [x] **Step 4: Implement components/ui/DataTable.tsx**

```typescript
'use client';
import { EmptyState } from './EmptyState';

interface Column<T> { key: keyof T; header: string; render?: (row: T) => React.ReactNode }
interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTable<T extends Record<string, any>>({ columns, rows, page, pageSize, total, onPageChange }: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) return <EmptyState description="Try adjusting your filters." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-2 text-sm">{col.render ? col.render(row) : String(row[col.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -w apps/web -- DataTable`
Expected: PASS (3 tests)

- [x] **Step 6: Implement remaining components: Modal.tsx, ConfirmDialog.tsx, Drawer.tsx, FormField.tsx**

```typescript
// Modal.tsx
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="max-w-lg rounded-lg bg-white p-6 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
```

```typescript
// ConfirmDialog.tsx
import { Modal } from './Modal';

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: { open: boolean; title: string; description?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={onConfirm} className="rounded bg-danger px-3 py-1.5 text-sm text-white">Confirm</button>
      </div>
    </Modal>
  );
}
```

```typescript
// Drawer.tsx
export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={`fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute inset-y-0 rtl:left-0 ltr:right-0 h-full w-full max-w-md bg-white p-6 shadow-xl transition-transform dark:bg-gray-900 ${open ? 'translate-x-0' : 'rtl:-translate-x-full ltr:translate-x-full'}`}>
        {children}
      </div>
    </div>
  );
}
```

```typescript
// FormField.tsx
export function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
```

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/ui
git commit -m "feat: shared UI component library (DataTable, Drawer, Modal, etc.)"
```

---

### Task 15: Auth pages (login, forgot-password, reset-password, activate)

**Files:**
- Create: `apps/web/src/app/(auth)/layout.tsx`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/forgot-password/page.tsx`, `apps/web/src/app/(auth)/reset-password/page.tsx`, `apps/web/src/app/(auth)/activate/page.tsx`
- Test: `apps/web/test/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 13), `loginSchema`/`resetPasswordSchema`/`activateAccountSchema` (Task 2), `FormField` (Task 14).

- [x] **Step 1: Write failing test**

`apps/web/test/LoginForm.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoginPage from '../src/app/(auth)/login/page';

describe('LoginPage', () => {
  it('shows validation error for invalid email', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByText(/invalid/i)).toBeInTheDocument());
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/web -- LoginForm`
Expected: FAIL — page module does not exist.

- [x] **Step 3: Implement (auth)/layout.tsx**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">{children}</div>;
}
```

- [x] **Step 4: Implement (auth)/login/page.tsx**

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@inventory/shared';
import { useAuth } from '@/lib/AuthContext';
import { FormField } from '@/components/ui/FormField';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
    } catch {
      toast.error('Invalid credentials or account locked');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Log in</h1>
      <FormField label="Email" error={errors.email?.message}>
        <input aria-label="email" {...register('email')} className="w-full rounded border px-3 py-2" />
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        <input aria-label="password" type="password" {...register('password')} className="w-full rounded border px-3 py-2" />
      </FormField>
      <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Log in</button>
      <a href="/forgot-password" className="block text-center text-sm text-active">Forgot password?</a>
    </form>
  );
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -w apps/web -- LoginForm`
Expected: PASS (1 test)

- [x] **Step 6: Implement forgot-password, reset-password, activate pages**

```typescript
// (auth)/forgot-password/page.tsx
'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/v1/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSent(true);
    toast.success('If that email exists, a reset link was sent.');
  };

  if (sent) return <p className="text-center">Check the server console for the reset link (dev mode).</p>;

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Forgot password</h1>
      <input aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Email" />
      <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Send reset link</button>
    </form>
  );
}
```

```typescript
// (auth)/reset-password/page.tsx
'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const token = params.get('token') ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/v1/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    if (res.ok) { toast.success('Password updated'); router.push('/login'); }
    else toast.error('Reset link invalid or expired');
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Reset password</h1>
      <input aria-label="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="New password" />
      <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Reset password</button>
    </form>
  );
}
```

```typescript
// (auth)/activate/page.tsx
// Reuses the same flow as reset-password: an admin-issued token sets the user's first real password.
export { default } from '../reset-password/page';
```

- [x] **Step 7: Commit**

```bash
git add "apps/web/src/app/(auth)"
git commit -m "feat: login, forgot/reset-password, and activation pages"
```

---

### Task 16: Role-gated layouts (Sidebar/TopNav) for all six route groups

**Files:**
- Create: `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/layout/TopNav.tsx`, `apps/web/src/components/layout/LanguageSwitcher.tsx`
- Create: `apps/web/src/app/(admin)/layout.tsx`, `apps/web/src/app/(inventory)/layout.tsx`, `apps/web/src/app/(doctor)/layout.tsx`, `apps/web/src/app/(delivery)/layout.tsx`, `apps/web/src/app/(supplier)/layout.tsx`
- Create placeholder dashboards: `apps/web/src/app/(admin)/dashboard/page.tsx`, `(inventory)/dashboard/page.tsx`, `(doctor)/dashboard/page.tsx`, `(delivery)/dashboard/page.tsx`, `(supplier)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 13), `useTheme` (Task 12), `EmptyState` (Task 14).
- Produces: `<Sidebar items={NavItem[]} />`, `<TopNav />` reused by every layout.

- [x] **Step 1: Sidebar.tsx**

```typescript
'use client';
import Link from 'next/link';

export interface NavItem { label: string; href: string; comingSoon?: boolean }

export function Sidebar({ items, title }: { items: NavItem[]; title: string }) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 px-2 text-lg font-semibold">{title}</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link key={item.href} href={item.comingSoon ? '#' : item.href} className={`block rounded px-3 py-2 text-sm ${item.comingSoon ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
            {item.label}{item.comingSoon && ' (coming soon)'}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [x] **Step 2: TopNav.tsx + LanguageSwitcher.tsx**

```typescript
// TopNav.tsx
'use client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from './ThemeProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

export function TopNav() {
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      <span className="text-sm text-gray-500">{user?.email}</span>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <button onClick={toggle} className="rounded px-2 py-1 text-sm">🌓</button>
        <button aria-label="notifications" className="rounded px-2 py-1 text-sm">🔔</button>
        <button onClick={() => logout()} className="rounded bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">Log out</button>
      </div>
    </header>
  );
}
```

```typescript
// LanguageSwitcher.tsx
'use client';
export function LanguageSwitcher() {
  return (
    <select className="rounded border px-2 py-1 text-sm" defaultValue="en" onChange={(e) => { document.cookie = `NEXT_LOCALE=${e.target.value}`; location.reload(); }}>
      <option value="en">EN</option>
      <option value="ar">AR</option>
      <option value="ku">KU</option>
    </select>
  );
}
```

- [x] **Step 3: (admin)/layout.tsx** (pattern repeated per group with role-specific nav items)

```typescript
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Users', href: '/users' },
  { label: 'Roles & Permissions', href: '/roles' },
  { label: 'Audit Logs', href: '/audit-logs' },
  { label: 'Products', href: '/products', comingSoon: true },
  { label: 'Warehouses', href: '/warehouses', comingSoon: true },
  { label: 'Settings', href: '/settings', comingSoon: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} title="Super Admin" />
      <div className="flex-1">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Repeat layout pattern for (inventory), (doctor), (delivery), (supplier)** with their respective spec page lists as `comingSoon` nav items (Dashboard always real, rest placeholders):

```typescript
// (inventory)/layout.tsx nav items
const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Products', href: '/products', comingSoon: true },
  { label: 'Stock Levels', href: '/stock', comingSoon: true },
  { label: 'Doctor Requests', href: '/requests', comingSoon: true },
  { label: 'Purchase Orders', href: '/purchase-orders', comingSoon: true },
  { label: 'Warehouses', href: '/warehouses', comingSoon: true },
  { label: 'Reports', href: '/reports', comingSoon: true },
];
```
```typescript
// (doctor)/layout.tsx nav items
const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Product Catalogue', href: '/catalogue', comingSoon: true },
  { label: 'Request Cart', href: '/cart', comingSoon: true },
  { label: 'Request History', href: '/requests', comingSoon: true },
  { label: 'Favourites', href: '/favourites', comingSoon: true },
  { label: 'Notifications', href: '/notifications', comingSoon: true },
];
```
```typescript
// (delivery)/layout.tsx nav items
const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Assigned Deliveries', href: '/deliveries', comingSoon: true },
  { label: 'Delivery History', href: '/history', comingSoon: true },
];
```
```typescript
// (supplier)/layout.tsx nav items
const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Purchase Orders', href: '/purchase-orders', comingSoon: true },
  { label: 'Invoices', href: '/invoices', comingSoon: true },
];
```

Each layout file follows the exact same structure as `(admin)/layout.tsx` in Step 3, swapping `items` and the `Sidebar` `title` prop (`"Inventory"`, `"Doctor Portal"`, `"Delivery"`, `"Supplier Portal"`).

- [x] **Step 5: Placeholder dashboard pages** (one per group, identical pattern)

```typescript
// (admin)/dashboard/page.tsx  (repeat for each group's dashboard/page.tsx)
export default function DashboardPage() {
  return <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">Dashboard widgets arrive in a later sub-project.</div>;
}
```

- [x] **Step 6: Manual verification**

Run: `npm run dev -w apps/web`, log in as seeded Super Admin, confirm `/dashboard` shows the admin sidebar with correct nav items and dark-mode toggle works.
Expected: sidebar renders 7 items, theme toggle switches `dark` class on `<html>`, language switcher reloads with `ar` producing `dir="rtl"`.

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/layout "apps/web/src/app/(admin)" "apps/web/src/app/(inventory)" "apps/web/src/app/(doctor)" "apps/web/src/app/(delivery)" "apps/web/src/app/(supplier)"
git commit -m "feat: role-gated sidebar/topnav layouts for all six portals"
```

---

### Task 17: Admin — Users page (list, create, edit, deactivate)

**Files:**
- Create: `apps/web/src/app/(admin)/users/page.tsx`, `apps/web/src/app/(admin)/users/UserFormDrawer.tsx`
- Test: `apps/web/test/UsersPage.test.tsx`

**Interfaces:**
- Consumes: `DataTable`, `Drawer`, `ConfirmDialog`, `StatusBadge`, `FormField` (Task 14); `useAuth` (Task 13); `createUserSchema`/`updateUserSchema` (Task 2); TanStack Query.

- [x] **Step 1: Write failing test**

`apps/web/test/UsersPage.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '../src/app/(admin)/users/page';

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ accessToken: 'x', user: { permissions: ['user.create'] } }) }));
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { items: [{ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', status: 'ACTIVE', roles: [] }], total: 1, page: 1, pageSize: 20 } } ) })) as any;

describe('UsersPage', () => {
  it('renders fetched users', async () => {
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><UsersPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -w apps/web -- UsersPage`
Expected: FAIL — page module does not exist.

- [x] **Step 3: Implement UserFormDrawer.tsx**

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserInput } from '@inventory/shared';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';

export function UserFormDrawer({ open, onClose, roles, onSubmit }: { open: boolean; onClose: () => void; roles: { id: string; name: string }[]; onSubmit: (data: CreateUserInput) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) });

  return (
    <Drawer open={open} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => { onSubmit(data); onClose(); })} className="space-y-4">
        <h3 className="text-lg font-semibold">New user</h3>
        <FormField label="Email" error={errors.email?.message}><input {...register('email')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="First name" error={errors.firstName?.message}><input {...register('firstName')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="Last name" error={errors.lastName?.message}><input {...register('lastName')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="Role" error={errors.roleIds?.message}>
          <select multiple {...register('roleIds')} className="w-full rounded border px-3 py-2">
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
        <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Create</button>
      </form>
    </Drawer>
  );
}
```

- [x] **Step 4: Implement (admin)/users/page.tsx**

```typescript
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserFormDrawer } from './UserFormDrawer';

export default function UsersPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetch(`/api/v1/users?page=${page}&pageSize=20`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetch('/api/v1/roles', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <button onClick={() => setDrawerOpen(true)} className="rounded bg-active px-4 py-2 text-sm text-white">New user</button>
      </div>
      <DataTable
        columns={[
          { key: 'email', header: 'Email' },
          { key: 'firstName', header: 'First name' },
          { key: 'lastName', header: 'Last name' },
          { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
          { key: 'id', header: 'Actions', render: (row: any) => <button onClick={() => setConfirmId(row.id)} className="text-sm text-danger">Deactivate</button> },
        ]}
        rows={usersQuery.data?.items ?? []}
        page={page}
        pageSize={20}
        total={usersQuery.data?.total ?? 0}
        onPageChange={setPage}
      />
      <UserFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} roles={rolesQuery.data ?? []} onSubmit={(data) => createMutation.mutate(data)} />
      <ConfirmDialog
        open={!!confirmId}
        title="Deactivate user?"
        description="They will no longer be able to log in."
        onConfirm={() => { deactivateMutation.mutate(confirmId!); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -w apps/web -- UsersPage`
Expected: PASS (1 test)

- [x] **Step 6: Commit**

```bash
git add "apps/web/src/app/(admin)/users"
git commit -m "feat: admin users page with create/deactivate flows"
```

---

### Task 18: Admin — Roles & Permissions page, Audit Logs page

**Files:**
- Create: `apps/web/src/app/(admin)/roles/page.tsx`, `apps/web/src/app/(admin)/audit-logs/page.tsx`

**Interfaces:**
- Consumes: `DataTable` (Task 14), `useAuth` (Task 13), TanStack Query, `/api/v1/roles`, `/api/v1/roles/permissions`, `/api/v1/audit-logs` (Task 10).

- [x] **Step 1: Implement (admin)/roles/page.tsx**

```typescript
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

export default function RolesPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetch('/api/v1/roles', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });
  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () => fetch('/api/v1/roles/permissions', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });

  const setPermsMutation = useMutation({
    mutationFn: (vars: { roleId: string; permissionIds: string[] }) =>
      fetch(`/api/v1/roles/${vars.roleId}/permissions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ permissionIds: vars.permissionIds }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const role = rolesQuery.data?.find((r: any) => r.id === selectedRole);
  const assignedKeys = new Set(role?.permissions?.map((rp: any) => rp.permission.id) ?? []);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-1">
        <h1 className="mb-2 text-xl font-semibold">Roles</h1>
        {rolesQuery.data?.map((r: any) => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)} className={`block w-full rounded px-3 py-2 text-left text-sm ${selectedRole === r.id ? 'bg-active/10 text-active' : 'hover:bg-gray-100'}`}>
            {r.name}{r.isSystem && <span className="ml-2 text-xs text-gray-400">(system)</span>}
          </button>
        ))}
      </div>
      <div className="col-span-2">
        {role ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{role.name} permissions</h2>
            {permissionsQuery.data?.map((p: any) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={role.isSystem}
                  defaultChecked={assignedKeys.has(p.id)}
                  onChange={(e) => {
                    const next = new Set(assignedKeys);
                    e.target.checked ? next.add(p.id) : next.delete(p.id);
                    setPermsMutation.mutate({ roleId: role.id, permissionIds: [...next] });
                  }}
                />
                {p.key}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Select a role to view its permissions.</p>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Implement (admin)/audit-logs/page.tsx**

```typescript
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';

export default function AuditLogsPage() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => fetch(`/api/v1/audit-logs?page=${page}&pageSize=20`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit Logs</h1>
      <DataTable
        columns={[
          { key: 'createdAt', header: 'Date', render: (row: any) => new Date(row.createdAt).toLocaleString() },
          { key: 'user', header: 'User', render: (row: any) => row.user?.email ?? '—' },
          { key: 'action', header: 'Action' },
          { key: 'entityType', header: 'Entity' },
          { key: 'ipAddress', header: 'IP' },
        ]}
        rows={logsQuery.data?.items ?? []}
        page={page}
        pageSize={20}
        total={logsQuery.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
```

- [x] **Step 3: Manual verification**

Run: `npm run dev -w apps/web` + `npm run dev -w apps/api`, log in as Super Admin, visit `/roles` (toggle a permission on the custom test role), visit `/audit-logs` (confirm the `LOGIN` and `ROLE_PERMISSIONS_CHANGED` entries appear).
Expected: both pages render populated tables, no console errors.

- [x] **Step 4: Commit**

```bash
git add "apps/web/src/app/(admin)/roles" "apps/web/src/app/(admin)/audit-logs"
git commit -m "feat: admin roles & permissions page and audit logs page"
```

---

### Task 19: End-to-end smoke test (Playwright)

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/test/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: running `apps/api` (port 4000) and `apps/web` (port 3000) with seeded DB from Task 3.

- [x] **Step 1: playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true },
});
```

- [x] **Step 2: Write smoke test**

`apps/web/test/e2e/smoke.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('super admin logs in, creates a user, assigns a role, logs out', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('email').fill('admin@inventory.local');
  await page.getByLabel('password').fill('ChangeMe123!');
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page).toHaveURL(/dashboard/);

  await page.goto('/users');
  await page.getByRole('button', { name: /new user/i }).click();
  await page.locator('input[name=email]').fill(`e2e.${Date.now()}@example.com`);
  await page.locator('input[name=firstName]').fill('E2E');
  await page.locator('input[name=lastName]').fill('Test');
  await page.locator('select[name=roleIds]').selectOption({ label: 'DOCTOR' });
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page.getByText(/e2e\./i)).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/login/);
});
```

- [x] **Step 3: Run e2e test**

Run: `docker compose up -d && npm run prisma:migrate -w apps/api && npm run prisma:seed -w apps/api && npm run dev:api -w apps/api & npm run test:e2e -w apps/web`
Expected: 1 passed.

- [x] **Step 4: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/test/e2e/smoke.spec.ts
git commit -m "test: end-to-end smoke test for login, user creation, logout"
```

---

## Self-Review Notes

- **Spec coverage:** every foundation-scope item from the design doc (repo structure, Prisma schema, login/refresh/logout/reset, lockout, RBAC, users/roles/audit-logs CRUD+read, six role shells, shared component library, i18n+RTL+dark mode plumbing, backend+frontend test suites, explicit unauthorized-access case) maps to a task above (Tasks 1–19).
- **Placeholder scan:** no TBD/TODO; "coming soon" nav items are an intentional, spec-approved UI stub for out-of-scope pages, not unfinished logic.
- **Type consistency:** `CreateUserInput`/`UpdateUserInput`/`CreateRoleInput`/`UpdateRolePermissionsInput` names match between `packages/shared` (Task 2) and every consumer (Tasks 9, 10, 17, 18). `authService` method names (`login`, `refresh`, `logout`, `requestPasswordReset`, `resetPassword`) match controller calls in Task 8. `userRepository`/`roleRepository`/`refreshTokenRepository`/`auditLogRepository` method names from Task 5 match every service call site in Tasks 6, 9, 10.
- **Scope:** deliberately excludes products/warehouses/stock/orders/deliveries/suppliers/purchase-orders/reports/real notifications/real-time — all deferred to sub-projects 2–7 per the design doc.
