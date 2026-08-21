import { Pool } from 'pg';
import type { Store } from './db.js';

export class PostgresStore implements Store {
  private pool: Pool;
  private initialized = new Set<string>();

  constructor(connectionString: string) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    this.pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    });
  }

  private async ensureTable(name: string): Promise<void> {
    if (this.initialized.has(name)) return;
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "${t}" (
        id TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL DEFAULT '',
        data JSONB NOT NULL
      )
    `);
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${t}' AND column_name = 'tenantId'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = '${t}' AND column_name = 'tenant_id'
          ) THEN
            ALTER TABLE "${t}" RENAME COLUMN "tenant_id" TO "tenantId";
          ELSE
            ALTER TABLE "${t}" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
          END IF;
        END IF;
      END $$;
    `);
    this.initialized.add(name);
  }

  async collection(name: string): Promise<any[]> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const res = await this.pool.query(`SELECT data FROM "${t}"`);
    return res.rows.map((r: any) => r.data);
  }

  async seed(name: string, rows: any[]): Promise<void> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    for (const row of rows) {
      const tenantId = row.tenantId ?? 'tenant-default';
      const record = { tenantId, ...row };
      await this.pool.query(
        `INSERT INTO "${t}" (id, "tenantId", data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (id) DO UPDATE SET "tenantId" = EXCLUDED."tenantId", data = EXCLUDED.data`,
        [record.id, tenantId, JSON.stringify(record)]
      );
    }
  }

  async nextId(prefix: string, name: string): Promise<string> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const res = await this.pool.query(`SELECT COUNT(*) AS cnt FROM "${t}"`);
    const n = parseInt(res.rows[0].cnt, 10) + 1;
    return `${prefix}-${String(n).padStart(5, '0')}`;
  }

  async all(tenantId: string, name: string): Promise<any[]> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const res = await this.pool.query(`SELECT data FROM "${t}" WHERE "tenantId" = $1`, [tenantId]);
    return res.rows.map((r: any) => r.data);
  }

  async byId(tenantId: string, name: string, id: string): Promise<any | undefined> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const res = await this.pool.query(`SELECT data FROM "${t}" WHERE id = $1 AND "tenantId" = $2`, [id, tenantId]);
    return res.rows[0]?.data;
  }

  async insert(tenantId: string, name: string, row: any): Promise<any> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const record = { ...row, tenantId };
    if (!record.id) record.id = await this.nextId('rec', name);
    await this.pool.query(
      `INSERT INTO "${t}" (id, "tenantId", data) VALUES ($1, $2, $3::jsonb)`,
      [record.id, tenantId, JSON.stringify(record)]
    );
    return record;
  }

  async update(tenantId: string, name: string, id: string, patch: any): Promise<any> {
    await this.ensureTable(name);
    const existing = await this.byId(tenantId, name, id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id, tenantId };
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await this.pool.query(
      `UPDATE "${t}" SET data = $1::jsonb WHERE id = $2 AND "tenantId" = $3`,
      [JSON.stringify(updated), id, tenantId]
    );
    return updated;
  }

  async remove(tenantId: string, name: string, id: string): Promise<boolean> {
    await this.ensureTable(name);
    const t = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const res = await this.pool.query(`DELETE FROM "${t}" WHERE id = $1 AND "tenantId" = $2`, [id, tenantId]);
    return (res.rowCount ?? 0) > 0;
  }

  async query(tenantId: string, name: string, predicate: (row: any) => boolean): Promise<any[]> {
    const rows = await this.all(tenantId, name);
    return rows.filter(predicate);
  }
}
