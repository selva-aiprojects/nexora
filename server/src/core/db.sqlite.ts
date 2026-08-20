import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Store } from './db.js';

export class SqliteStore implements Store {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    const resolved = path.resolve(process.cwd(), dbPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new DatabaseSync(resolved);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        tenant_id  TEXT NOT NULL,
        collection TEXT NOT NULL,
        id         TEXT NOT NULL,
        body       TEXT NOT NULL,
        PRIMARY KEY (tenant_id, collection, id)
      );
      CREATE TABLE IF NOT EXISTS sequences (
        name  TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `);
  }

  private readRows(tenantId: string, name: string): Promise<any[]> {
    return Promise.resolve((() => {
      const rows = this.db
        .prepare('SELECT body FROM documents WHERE tenant_id = ? AND collection = ?')
        .all(tenantId, name) as { body: string }[];
      return rows.map((r) => JSON.parse(r.body));
    })());
  }

  collection(name: string): Promise<any[]> {
    return Promise.resolve(((() => {
      const rows = this.db
        .prepare('SELECT body FROM documents WHERE collection = ?')
        .all(name) as { body: string }[];
      return rows.map((r) => JSON.parse(r.body));
    })()));
  }

  seed(name: string, rows: any[]): Promise<void> {
    return Promise.resolve(((() => {
      const insert = this.db.prepare(
        'INSERT OR IGNORE INTO documents (tenant_id, collection, id, body) VALUES (?, ?, ?, ?)'
      );
      this.db.exec('BEGIN');
      try {
        for (const r of rows) {
          if (!r.id) continue;
          insert.run(r.tenantId ?? '', name, r.id, JSON.stringify(r));
        }
        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    })()));
  }

  nextId(prefix: string, name: string): Promise<string> {
    return Promise.resolve(((() => {
      const existing = this.db.prepare('SELECT value FROM sequences WHERE name = ?').get(name) as
        | { value: number }
        | undefined;
      const next = (existing?.value ?? 0) + 1;
      this.db
        .prepare(
          'INSERT INTO sequences (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value'
        )
        .run(name, next);
      return `${prefix}-${String(next).padStart(5, '0')}`;
    })()));
  }

  all(tenantId: string, name: string): Promise<any[]> {
    return this.readRows(tenantId, name);
  }

  byId(tenantId: string, name: string, id: string): Promise<any | undefined> {
    return Promise.resolve(((() => {
      const row = this.db
        .prepare('SELECT body FROM documents WHERE tenant_id = ? AND collection = ? AND id = ?')
        .get(tenantId, name, id) as { body: string } | undefined;
      return row ? JSON.parse(row.body) : undefined;
    })()));
  }

  async insert(tenantId: string, name: string, row: any): Promise<any> {
    const record = { ...row, tenantId };
    if (!record.id) {
      record.id = await this.nextId('rec', name);
    }
    this.db
      .prepare('INSERT OR REPLACE INTO documents (tenant_id, collection, id, body) VALUES (?, ?, ?, ?)')
      .run(tenantId, name, record.id, JSON.stringify(record));
    return record;
  }

  update(tenantId: string, name: string, id: string, patch: any): Promise<any> {
    return Promise.resolve((async () => {
      const current = await this.byId(tenantId, name, id);
      if (!current) return undefined;
      const merged = { ...current, ...patch, id, tenantId };
      this.db
        .prepare('UPDATE documents SET body = ? WHERE tenant_id = ? AND collection = ? AND id = ?')
        .run(JSON.stringify(merged), tenantId, name, id);
      return merged;
    })());
  }

  remove(tenantId: string, name: string, id: string): Promise<boolean> {
    return Promise.resolve(((() => {
      const res = this.db
        .prepare('DELETE FROM documents WHERE tenant_id = ? AND collection = ? AND id = ?')
        .run(tenantId, name, id);
      return (res.changes ?? 0) > 0;
    })()));
  }

  query(tenantId: string, name: string, predicate: (row: any) => boolean): Promise<any[]> {
    return this.all(tenantId, name).then((rows) => rows.filter(predicate));
  }

  /** Wipe all data (used by `npm run db:reset`). */
  reset(): void {
    this.db.exec('DELETE FROM documents; DELETE FROM sequences;');
  }
}
