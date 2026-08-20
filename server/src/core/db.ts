// SqliteStore is NOT statically imported — it uses node:sqlite (Node 22.5+ experimental)
// which is unavailable on Vercel. It is lazy-loaded only when DB_IMPL=sqlite.
import { PostgresStore } from './db.postgres.js';

export interface Store {
  collection(name: string): Promise<any[]>;
  seed(name: string, rows: any[]): Promise<void>;
  nextId(prefix: string, name: string): Promise<string>;
  all(tenantId: string, name: string): Promise<any[]>;
  byId(tenantId: string, name: string, id: string): Promise<any | undefined>;
  insert(tenantId: string, name: string, row: any): Promise<any>;
  update(tenantId: string, name: string, id: string, patch: any): Promise<any>;
  remove(tenantId: string, name: string, id: string): Promise<boolean>;
  query(tenantId: string, name: string, predicate: (row: any) => boolean): Promise<any[]>;
}

class MemoryStore implements Store {
  private collections = new Map<string, any[]>();
  private counters = new Map<string, number>();

  collection(name: string): Promise<any[]> {
    let col = this.collections.get(name);
    if (!col) {
      col = [];
      this.collections.set(name, col);
    }
    return Promise.resolve(col);
  }

  seed(name: string, rows: any[]): Promise<void> {
    return Promise.resolve(((() => {
      const col = this.collections.get(name) ?? [];
      const existing = new Set(col.map((r) => r.id));
      for (const r of rows) if (!existing.has(r.id)) col.push(r);
      this.collections.set(name, col);
    })()));
  }

  nextId(prefix: string, name: string): Promise<string> {
    return Promise.resolve(((() => {
      const n = (this.counters.get(name) ?? 0) + 1;
      this.counters.set(name, n);
      return `${prefix}-${String(n).padStart(5, '0')}`;
    })()));
  }

  all(_tenantId: string, name: string): Promise<any[]> {
    return Promise.resolve(this.collections.get(name) ?? []);
  }

  byId(_tenantId: string, name: string, id: string): Promise<any | undefined> {
    return Promise.resolve((this.collections.get(name) ?? []).find((r) => r.id === id));
  }

  insert(tenantId: string, name: string, row: any): Promise<any> {
    return Promise.resolve(((() => {
      const record = { ...row, tenantId };
      if (!record.id) {
        const n = (this.counters.get(name) ?? 0) + 1;
        this.counters.set(name, n);
        record.id = `rec-${String(n).padStart(5, '0')}`;
      }
      const col = this.collections.get(name) ?? [];
      col.push(record);
      this.collections.set(name, col);
      return record;
    })()));
  }

  update(tenantId: string, name: string, id: string, patch: any): Promise<any> {
    return Promise.resolve(((() => {
      const col = this.collections.get(name) ?? [];
      const idx = col.findIndex((r) => r.id === id);
      if (idx === -1) return undefined;
      col[idx] = { ...col[idx], ...patch, id, tenantId };
      return col[idx];
    })()));
  }

  remove(tenantId: string, name: string, id: string): Promise<boolean> {
    return Promise.resolve(((() => {
      const col = this.collections.get(name) ?? [];
      const idx = col.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      col.splice(idx, 1);
      return true;
    })()));
  }

  query(tenantId: string, name: string, predicate: (row: any) => boolean): Promise<any[]> {
    return this.all(tenantId, name).then((rows) => rows.filter(predicate));
  }
}

// Resolve which DB backend to use.
// Priority: DB_IMPL env var > POSTGRES_URL > memory (safe default for Vercel serverless).
// SQLite is only enabled when DB_IMPL=sqlite is explicitly set (requires Node 22.5+ node:sqlite).
const impl = process.env.DB_IMPL ?? (process.env.POSTGRES_URL ? 'postgres' : 'memory');
let dbInstance: Store;

if (impl === 'sqlite') {
  // Lazy-import so Vercel doesn't attempt to resolve node:sqlite at cold-start
  const { SqliteStore: Sqlite } = await import('./db.sqlite.js');
  dbInstance = new Sqlite(process.env.SQLITE_PATH ?? './data/nexora.db');
} else if (impl === 'postgres' || process.env.POSTGRES_URL) {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is required when DB_IMPL=postgres');
  }
  dbInstance = new PostgresStore(process.env.POSTGRES_URL);
} else {
  // Default: in-memory store (works everywhere, resets on each cold-start)
  dbInstance = new MemoryStore();
}

export const db = dbInstance;

