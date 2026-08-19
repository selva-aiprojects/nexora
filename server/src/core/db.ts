import { SqliteStore } from './db.sqlite.js';

/**
 * The persistence seam. Every module reads/writes through this `Store`
 * interface, so changing the backing database means re-implementing only
 * this file. The PRD calls for PostgreSQL with multi-tenant RLS; the
 * production DDL + RLS policies live in `infra/postgres`, and the
 * `node:sqlite` implementation here is the runnable, zero-dependency default
 * that keeps the synchronous service API unchanged.
 *
 * Select with DB_IMPL: "sqlite" (default, on-disk file) | "memory".
 */
export interface Store {
  collection(name: string): any[];
  seed(name: string, rows: any[]): void;
  nextId(prefix: string, name: string): string;
  all(tenantId: string, name: string): any[];
  byId(tenantId: string, name: string, id: string): any | undefined;
  insert(tenantId: string, name: string, row: any): any;
  update(tenantId: string, name: string, id: string, patch: any): any;
  remove(tenantId: string, name: string, id: string): boolean;
  query(tenantId: string, name: string, predicate: (row: any) => boolean): any[];
}

class MemoryStore implements Store {
  private collections = new Map<string, any[]>();
  private counters = new Map<string, number>();

  collection(name: string): any[] {
    let col = this.collections.get(name);
    if (!col) {
      col = [];
      this.collections.set(name, col);
    }
    return col;
  }

  seed(name: string, rows: any[]): void {
    const col = this.collection(name);
    const existing = new Set(col.map((r) => r.id));
    for (const r of rows) if (!existing.has(r.id)) col.push(r);
  }

  nextId(prefix: string, name: string): string {
    const n = (this.counters.get(name) ?? 0) + 1;
    this.counters.set(name, n);
    return `${prefix}-${String(n).padStart(5, '0')}`;
  }

  all(tenantId: string, name: string): any[] {
    return this.collection(name).filter((r) => r.tenantId === tenantId);
  }

  byId(tenantId: string, name: string, id: string): any | undefined {
    return this.all(tenantId, name).find((r) => r.id === id);
  }

  insert(tenantId: string, name: string, row: any): any {
    const record = { ...row, tenantId };
    if (!record.id) record.id = this.nextId('rec', name + '#id');
    this.collection(name).push(record);
    return record;
  }

  update(tenantId: string, name: string, id: string, patch: any): any {
    const col = this.collection(name);
    const idx = col.findIndex((r) => r.tenantId === tenantId && r.id === id);
    if (idx === -1) return undefined;
    col[idx] = { ...col[idx], ...patch, id, tenantId };
    return col[idx];
  }

  remove(tenantId: string, name: string, id: string): boolean {
    const col = this.collection(name);
    const idx = col.findIndex((r) => r.tenantId === tenantId && r.id === id);
    if (idx === -1) return false;
    col.splice(idx, 1);
    return true;
  }

  query(tenantId: string, name: string, predicate: (row: any) => boolean): any[] {
    return this.all(tenantId, name).filter(predicate);
  }
}

const impl = process.env.DB_IMPL ?? 'sqlite';
export const db: Store =
  impl === 'memory'
    ? new MemoryStore()
    : new SqliteStore(process.env.SQLITE_PATH ?? './data/nexora.db');
