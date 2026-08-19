-- ============================================================================
-- Nexora — PostgreSQL seed (production target)
-- Representative seed for the default tenant. The node:sqlite dev DB is
-- seeded automatically by the application on first run; this file provides
-- the equivalent bootstrap for a real Postgres deployment.
-- ============================================================================

INSERT INTO documents (tenant_id, collection, id, body) VALUES
  ('tnt_acme', 'platform_tenants', 'tnt_acme',
   '{"id":"tnt_acme","name":"Acme Industries Pvt Ltd","gstin":"29ABCDE1234F1Z5","financialYear":"2026-2027","currency":"INR","baseCurrency":"INR"}')
ON CONFLICT (tenant_id, collection, id) DO NOTHING;

INSERT INTO documents (tenant_id, collection, id, body) VALUES
  ('tnt_acme', 'platform_users', 'usr_owner',
   '{"id":"usr_owner","tenantId":"tnt_acme","name":"Rajesh Kumar","email":"owner@acme.in","password":"demo1234","role":"owner"}'),
  ('tnt_acme', 'platform_users', 'usr_finance',
   '{"id":"usr_finance","tenantId":"tnt_acme","name":"Priya Nair","email":"finance@acme.in","password":"demo1234","role":"finance"}'),
  ('tnt_acme', 'platform_users', 'usr_hr',
   '{"id":"usr_hr","tenantId":"tnt_acme","name":"Anita Sharma","email":"hr@acme.in","password":"demo1234","role":"hr"}'),
  ('tnt_acme', 'platform_users', 'usr_emp',
   '{"id":"usr_emp","tenantId":"tnt_acme","name":"Vikram Singh","email":"vikram@acme.in","password":"demo1234","role":"employee","employeeId":"emp_1001"}')
ON CONFLICT (tenant_id, collection, id) DO NOTHING;
