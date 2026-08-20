import neon from 'neon-serverless';

export class PostgresStore {
  private sql: ReturnType<typeof neon.neon>;
  private initialized = new Set<string>();

  constructor(connectionString: string) {
    this.sql = neon.neon(connectionString);
  }

  private async ensureTable(name: string) {
    if (this.initialized.has(name)) return;
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await this.sql`
      CREATE TABLE IF NOT EXISTS ${sanitized} (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        data JSONB NOT NULL
      )
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS ${sanitized + '_tenant'} ON ${sanitized}(tenantId)
    `;
    this.initialized.add(name);
  }

  async collection(name: string): Promise<any[]> {
    await this.ensureTable(name);
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const rows = await this.sql`SELECT data FROM ${sanitized}`;
    return (rows as any[]).map((r: any) => r.data);
  }

  async seed(name: string, rows: any[]): Promise<void> {
    await this.ensureTable(name);
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    for (const row of rows) {
      await this.sql`
        INSERT INTO ${sanitized} (id, tenantId, data) VALUES (${row.id}, ${row.tenantId}, ${row})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  async nextId(prefix: string, name: string): Promise<string> {
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const result = (await this.sql`SELECT COUNT(*) as cnt FROM ${sanitized}`) as any[];
    const n = parseInt(result[0].cnt, 10) + 1;
    return `${prefix}-${String(n).padStart(5, '0')}`;
  }

  async all(tenantId: string, name: string): Promise<any[]> {
    await this.ensureTable(name);
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const rows = (await this.sql`SELECT data FROM ${sanitized} WHERE tenantId = ${tenantId}`) as any[];
    return rows.map((r: any) => r.data);
  }

  async byId(tenantId: string, name: string, id: string): Promise<any | undefined> {
    const rows = await this.all(tenantId, name);
    return rows.find((r: any) => r.id === id);
  }

  async insert(tenantId: string, name: string, row: any): Promise<any> {
    await this.ensureTable(name);
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const record = { ...row, tenantId };
    if (!record.id) record.id = await this.nextId('rec', name);
    await this.sql`
      INSERT INTO ${sanitized} (id, tenantId, data) VALUES (${record.id}, ${tenantId}, ${record})
    `;
    return record;
  }

  async update(tenantId: string, name: string, id: string, patch: any): Promise<any> {
    await this.ensureTable(name);
    const existing = await this.byId(tenantId, name, id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id, tenantId };
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await this.sql`
      UPDATE ${sanitized} SET data = ${updated} WHERE id = ${id} AND tenantId = ${tenantId}
    `;
    return updated;
  }

  async remove(tenantId: string, name: string, id: string): Promise<boolean> {
    await this.ensureTable(name);
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const result = (await this.sql`DELETE FROM ${sanitized} WHERE id = ${id} AND tenantId = ${tenantId}`) as any[];
    return (result[0]?.rowCount ?? 0) > 0;
  }

  async query(tenantId: string, name: string, predicate: (row: any) => boolean): Promise<any[]> {
    const rows = await this.all(tenantId, name);
    return rows.filter(predicate);
  }
}
