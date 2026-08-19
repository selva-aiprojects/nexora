# Nexora Server

Backend services for the **Nexora AI-Native Business Operating Platform** — a
decoupled **modular monolith** (per the PRD), built with Node.js + TypeScript +
Express. It serves the REST APIs consumed by the `frontend/` component library
and the ESS mobile surface.

The data layer sits behind a single synchronous `Store` seam
(`src/core/db.ts`). The default backend is **SQLite** (`node:sqlite`, an
on-disk file at `data/nexora.db`, zero dependencies) so it runs with no
external services and persists across restarts. The PRD's target —
**PostgreSQL with multi-tenant Row-Level Security** — is provided as a
production DDL + RLS blueprint under `infra/postgres` (see below). Swapping
backends means re-implementing only the `Store` interface; services and
routes are untouched.

## Run

```bash
cd server
npm install
npm run dev        # tsx watch, http://localhost:4000
# or: npm run build && npm start
```

Data is seeded automatically into `data/nexora.db` on first start. Reset with
`npm run db:reset` (deletes the file; re-seeds next launch).

## Database

The `Store` interface (`collection`, `seed`, `nextId`, `all`, `byId`,
`insert`, `update`, `remove`, `query`) is implemented by:

| Backend            | `DB_IMPL` | Notes |
| ------------------ | --------- | ----- |
| SQLite (default)   | `sqlite`  | On-disk file via `node:sqlite`; synchronous; no native build needed (Node 22.5+). |
| In-memory          | `memory`  | Ephemeral; handy for tests. |

Tenant isolation is enforced at the **application layer** (every query filters
on `tenant_id`). The `documents` table is a JSON-document store keyed by
`(tenant_id, collection, id)` — one table backs every module's collections.

### Production target — PostgreSQL + RLS

`infra/` contains the PRD-aligned production setup:

- `infra/postgres/schema.sql` — `documents` + `sequences` tables, per-module
  schemas (`accounting`, `hrms`), and **Row-Level Security** policies that
  isolate rows by the `app.tenant_id` session GUC (DB-layer isolation).
- `infra/postgres/seed.sql` — bootstrap for the default tenant + demo users.
- `infra/docker-compose.yml` — Postgres 16 with the DDL/seed auto-applied.

```bash
docker compose -f infra/docker-compose.yml up -d   # → localhost:5432
# then point DATABASE_URL at it and implement the async Store adapter
```

Moving to Postgres requires a `pg`-backed `Store` (the existing services use
the synchronous seam, so that adapter would be the one place to introduce
`async/await` or a compatible sync driver).


## Demo credentials

Login at `POST /api/auth/login` with any of:

| Email            | Role    |
| ---------------- | ------- |
| owner@acme.in    | owner   |
| finance@acme.in  | finance |
| hr@acme.in       | hr      |
| vikram@acme.in   | employee (ESS) |

Password for all: `demo1234`. The response returns a bearer token; send it as
`Authorization: Bearer <token>`. ESS endpoints require the `employee` role.

## Architecture

```
src/
├── core/            # framework-agnostic primitives
│   ├── db.ts        #   in-memory store + tenant scoping (the persistence seam)
│   ├── auth.ts      #   token issue/verify, requireAuth, requireRole
│   ├── errors.ts    #   ApiError (400/401/403/404/409)
│   ├── http.ts      #   asyncHandler, pagination, listResult
│   ├── audit.ts     #   recordAudit() — every important action logs an event
│   └── types.ts
├── platform/        # cross-cutting capabilities
│   ├── auth.routes.ts
│   ├── audit.routes.ts
│   ├── notifications.routes.ts
│   ├── search.routes.ts        # global command-center search
│   └── dashboard.routes.ts     # CEO command center (KPIs + AI alerts)
└── modules/         # one file per business domain
    ├── accounting.ts    # COA, GL, AR/AP, GST, banking, financial reports
    ├── hrms.ts          # employees, attendance, leave, payroll, statutory
    ├── manufacturing.ts # items, warehouse, procurement, BOM, production, valuation
    ├── compliance.ts    # obligations, deadlines/alerts, filings, evidence
    ├── ess.ts           # mobile ESS: home, attendance, leave, expenses, payslips
    ├── dms.ts           # folders, documents, versioning, sharing
    └── ai.ts            # copilot (NL → data), insights, anomalies, recommendations, OCR
```

Modules never query each other's collections directly; cross-module needs
(e.g. the dashboard, ESS) read the owning domain's data through the same `db`
service, mirroring the PRD's "communicate through interfaces/events" rule.

## API reference (all under `/api`, all require `Authorization: Bearer`)

### Platform
- `POST /auth/login`, `GET /auth/me`, `GET /auth/tenant`
- `GET /dashboard` — KPIs + AI alerts + quick actions
- `GET /search?q=` — customers/vendors/invoices/employees/items/documents
- `GET /notifications`, `POST /notifications/:id/read`
- `GET /audit/logs?module=`

### Accounting & GST (`/accounting`)
- `GET/POST /accounts`
- `GET/POST /journal-entries`, `POST /journal-entries/:id/post`
- `GET /customers`, `GET /vendors`
- `GET/POST /sales-invoices`, `POST /sales-invoices/:id/receipts`
- `GET /purchase-invoices`, `POST /purchase-invoices/:id/approve`, `.../payments`
- `GET /bank-accounts`
- `GET /gst/returns`, `POST /gst/returns/:id/file`
- `GET /reports/{trial-balance,profit-loss,balance-sheet,receivables-aging,payables-aging}`
- `GET /dashboard`

### HRMS & Payroll (`/hrms`)
- `GET /departments`, `/designations`, `/grades`
- `GET/POST /employees`, `GET /employees/:id`
- `GET /attendance`, `POST /attendance/check-in`, `POST /attendance/check-out`
- `GET /leave-types`, `GET /leave-balances/:employeeId`
- `GET/POST /leave-applications`, `POST /leave-applications/:id/{approve,reject}`
- `GET /payroll-runs`, `POST /payroll-runs` (computes payslips), `GET /payroll-runs/:id/payslips`, `POST /payroll-runs/:id/approve`
- `GET /payslips/:id`, `GET /statutory`

### Manufacturing & Inventory (`/manufacturing`)
- `GET/POST /items`, `GET /warehouses`, `GET /stock`, `POST /stock-transfers`
- `GET/POST /purchase-requisitions`, `GET /purchase-orders`, `POST /goods-receipts`
- `GET/POST /boms`, `GET/POST /production-orders`, `POST /production-orders/:id/{issue,complete}`
- `GET /reports/{stock-ledger,valuation,material-shortage}`

### Compliance (`/compliance`)
- `GET /categories`, `/obligations`
- `GET /deadlines` (includes computed `alertLevel` / `daysUntilDue`)
- `GET /filings`, `POST /filings/:id/{submit,verify}`
- `POST /evidence`, `GET /evidence/:filingId`

### Employee ESS (`/ess`, employee role)
- `GET /home` — attendance, leave balance, latest payslip, pending actions, announcements
- `POST /attendance/check-in`, `POST /attendance/check-out`
- `GET/POST /leave`, `GET/POST /expenses`, `GET /payslips`, `GET /documents`

### Document Management (`/dms`)
- `GET /folders`, `GET/POST /documents`, `GET /documents/:id`, `GET /documents/:id/versions`, `POST /documents/:id/versions`, `POST /documents/:id/share`

### AI Insights & Automation (`/ai`)
- `POST /copilot` — `{query}` → natural-language answer over tenant data
- `GET /insights`, `GET /anomalies`, `GET /recommendations`
- `POST /invoice-processing` — simulated OCR extraction + PO match + duplicate check

## Notes
- Tenant isolation is enforced by `tenantId` on every record (the seam where
  PostgreSQL RLS would slot in).
- Every approve/post/pay/create action writes an immutable audit event.
- List endpoints return `{ rows, total, page, pageSize }` to match the
  frontend `DataTable` contract.
