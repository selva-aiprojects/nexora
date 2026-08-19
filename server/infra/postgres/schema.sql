-- ============================================================================
-- Nexora — PostgreSQL schema (production target)
-- Multi-tenant modular monolith, per the PRD's "PostgreSQL + RLS" model.
--
-- This mirrors the node:sqlite document store used by the app's `db` seam so
-- the data model is identical across environments. Tenant isolation is
-- enforced at BOTH layers the PRD requires:
--   * application layer  -> every query filters on tenant_id (see core/db)
--   * database layer     -> Row-Level Security below, keyed by a session GUC
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- The document store: one table backs every module's collections.
CREATE TABLE IF NOT EXISTS documents (
  tenant_id  text      NOT NULL,
  collection text      NOT NULL,
  id         text      NOT NULL,
  body       jsonb     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, collection, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents (tenant_id, collection);

CREATE TABLE IF NOT EXISTS sequences (
  name  text PRIMARY KEY,
  value bigint NOT NULL
);

-- Session GUC holding the active tenant for the current connection/request.
-- The Postgres adapter would issue `SET LOCAL app.tenant_id = $tenant` inside
-- each transaction before querying.
ALTER DATABASE :DBNAME SET app.tenant_id TO '';

-- ---- Row-Level Security: hard tenant isolation at the DB layer ----
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
  FOR ALL
  TO app_user
  USING (tenant_id = current_setting('app.tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);

DROP POLICY IF EXISTS seq_tenant_isolation ON sequences;
CREATE POLICY seq_tenant_isolation ON sequences
  FOR ALL
  TO app_user
  USING (true)
  WITH CHECK (true);

-- ---- Illustrative normalized tables (module-level schemas) ----
-- The PRD recommends per-module schemas; the document store above is the
-- operational store, while these show the intended normalized shapes for
-- the Accounting and HR domains.
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS hrms;

CREATE TABLE IF NOT EXISTS accounting.chart_of_accounts (
  tenant_id   text NOT NULL,
  id          text NOT NULL,
  code        text NOT NULL,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('Asset','Liability','Equity','Revenue','Expense')),
  is_group    boolean NOT NULL DEFAULT false,
  opening     numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, id)
);
ALTER TABLE accounting.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY acc_coa_tenant ON accounting.chart_of_accounts
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);

CREATE TABLE IF NOT EXISTS hrms.employees (
  tenant_id       text NOT NULL,
  id              text NOT NULL,
  employee_code   text NOT NULL,
  name            text NOT NULL,
  email           text NOT NULL,
  department_id   text,
  designation_id  text,
  grade           text,
  date_of_joining date,
  status          text NOT NULL DEFAULT 'active',
  salary          jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (tenant_id, id)
);
ALTER TABLE hrms.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY hrms_emp_tenant ON hrms.employees
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
