---
name: nexora-upgrade-guide
description: Comprehensive developer and AI agent guide for upgrading, modifying, or extending the Nexora ERP platform without introducing database connection, schema migration, Vercel build, or authentication regressions.
---

# Nexora Upgrade & Engineering Governance Guide

This skill document defines the architectural rules, database patterns, serverless lifecycle constraints, and testing protocols required when maintaining, upgrading, or adding new features to the **Nexora AI-Native Platform**.

---

## 1. Database & Persistence Layer Protocols (`server/src/core/`)

### Rule 1.1: Always Use `@neondatabase/serverless` for Cloud PostgreSQL
Serverless functions (e.g. Vercel / AWS Lambda) freeze execution between requests. Raw TCP socket pools will drop connections after idle periods, causing `Client network socket disconnected before secure TLS connection was established` errors.
- For connections containing `neon.tech` or `vercel-storage`, always instantiate `NeonPool` from `@neondatabase/serverless`.
- For standard PostgreSQL connections, configure `max: 10`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 10000`, and attach a global `pool.on('error', ...)` handler.

### Rule 1.2: Never Manually Parse Connection Strings with `new URL()`
Cloud database URLs often contain special characters in passwords (e.g. `@`, `#`, `%`, `!`) and query parameters (`?sslmode=require`).
- **Incorrect**: `const url = new URL(connectionString); const host = url.hostname; ...`
- **Correct**: Pass `connectionString` directly into `new Pool({ connectionString, ssl: ... })`.

### Rule 1.3: PostgreSQL Case-Sensitive Column Quoting & Migration
In PostgreSQL, unquoted column names default to lowercase (`tenantid`), while quoted identifiers retain exact casing (`"tenantId"`).
- Always quote `"tenantId"` in table DDL, INSERT, and SELECT queries:
  ```sql
  CREATE TABLE IF NOT EXISTS "${t}" (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT '',
    data JSONB NOT NULL
  );
  ```
- Every `ensureTable()` call **must** include the legacy column migration block to automatically rename `tenantid` or `tenant_id` and drop legacy NOT NULL constraints:
  ```sql
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'tenantid') THEN
      ALTER TABLE "${t}" RENAME COLUMN "tenantid" TO "tenantid_old";
      ALTER TABLE "${t}" ALTER COLUMN "tenantid_old" DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'tenant_id') THEN
      ALTER TABLE "${t}" RENAME COLUMN "tenant_id" TO "tenant_id_old";
      ALTER TABLE "${t}" ALTER COLUMN "tenant_id_old" DROP NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'tenantId') THEN
      ALTER TABLE "${t}" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
    END IF;
  END $$;
  ```

### Rule 1.4: Sanitize `tenantId` on All Mutations & Queries
Never allow `null`, `undefined`, or empty string `""` to reach the database:
```typescript
const tid = (tenantId && String(tenantId).trim() !== '') ? String(tenantId) : 'tenant-default';
```

### Rule 1.5: Always Use Upsert in `seed()`
When seeding demo or default data, always update the existing record payload so modifications take effect across deployments:
```sql
INSERT INTO "${t}" (id, "tenantId", data) VALUES ($1, $2, $3::jsonb)
ON CONFLICT (id) DO UPDATE SET "tenantId" = EXCLUDED."tenantId", data = EXCLUDED.data
```

### Rule 1.6: Always Call `ensureTable()` in `nextId()`
Before calculating record counts (`SELECT COUNT(*) AS cnt FROM "${t}"`), always invoke `await this.ensureTable(name)` to avoid `relation "..." does not exist` errors on fresh tables.

---

## 2. Vercel Serverless Build & Deployment Pipeline

### Rule 2.1: Multi-Package Installation in `vercel.json`
Vercel executes the root `buildCommand` from `vercel.json`. Because the serverless function in `api/index.ts` imports from `server/`, `server` dependencies (such as `@neondatabase/serverless` and `pg`) must be installed during build:
```json
{
  "buildCommand": "npm install --prefix server && npm install --prefix frontend && npm run build --prefix frontend"
}
```

### Rule 2.2: Environment Variable Detection in `db.ts`
Vercel integrations provide database URLs under different keys depending on the provider. `server/src/core/db.ts` must discover all standard variables:
```typescript
const pgUrl =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL;
```

---

## 3. Authentication & Cold-Start Race Conditions

### Rule 3.1: Await Seed Initialization Promises on Route Handlers
In serverless cold-starts, top-level `init().catch(...)` runs concurrently with incoming HTTP requests. If a request hits `/api/auth/login` before `db.seed` finishes, `platform_users` will appear empty.
- Always wrap initialization in an `ensureInit()` promise and `await ensureInit()` at the start of authentication handlers:
  ```typescript
  let initPromise: Promise<void> | null = null;
  function ensureInit() {
    if (!initPromise) {
      initPromise = (async () => {
        await db.seed('platform_tenants', [TENANT]);
        await db.seed('platform_users', USERS);
      })();
    }
    return initPromise;
  }
  
  router.post('/login', asyncHandler(async (req, res) => {
    await ensureInit();
    // Proceed with authentication...
  }));
  ```

### Rule 3.2: Frontend Stale-Token Auto-Recovery
If the backend token secret or database resets, client browsers may hold invalid tokens in `localStorage`.
- In `frontend/src/App.tsx`, if `api.me()` returns `401 Unauthorized`, automatically clear `nx_token` and trigger the `LoginPage` component cleanly instead of displaying an unhandled exception screen.

---

## 4. Module & Dashboard Extension Guidelines

When adding a new enterprise module (e.g. `Asset Management` or `Payroll Enhancements`):
1. **Backend Route**: Create `server/src/modules/<module_name>.ts` exporting an Express router.
2. **Mount in `index.ts`**: Add `app.use('/api/<module_name>', moduleRoutes)` in `server/src/index.ts`.
3. **Module Dashboard**:
   - Add aggregation logic in `server/src/platform/dashboard.routes.ts` under `router.get('/:module', ...)`.
   - Update `MODULE_META` and `renderKpis` in `frontend/src/pages/dashboard/ModuleDashboard.tsx`.
   - Add a direct dashboard entry in `useActiveNav()` in `frontend/src/App.tsx` pointing to `/dashboard/<module_name>`.
4. **Audit Logging**: Wrap all create, update, and delete actions with `recordAudit()`.

---

## 5. Pre-Deployment Verification Checklist

Before pushing changes to `master`:
1. **Server Typecheck**:
   ```bash
   cd server && npm run typecheck
   ```
   *Must exit with code 0 (0 errors).*
2. **Frontend Production Build**:
   ```bash
   cd frontend && npm run build
   ```
   *Must compile Vite bundle cleanly without missing imports.*
3. **Live Health Smoke Test**:
   ```bash
   curl https://<app-domain>/health
   ```
   *Must return `{"status":"ok","dbImpl":"postgres","hasPgUrl":true}`.*
4. **Live Authentication Smoke Test**:
   ```bash
   curl -X POST https://<app-domain>/api/auth/login -H "Content-Type: application/json" -d '{"email":"owner@acme.in","password":"demo1234"}'
   ```
   *Must return HTTP 200 with bearer token and principal details.*
