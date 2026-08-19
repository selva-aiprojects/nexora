// Minimal type declarations for the experimental built-in `node:sqlite`
// module (available at runtime in Node 22.5+, used here for a zero-dependency
// on-disk store). @types/node ships fuller typings from v22.8; this shim keeps
// the project building on older @types/node without forcing an upgrade.
declare module 'node:sqlite' {
  export interface SqliteRunResult {
    changes?: number;
    lastInsertRowid?: number | bigint;
  }
  export interface StatementSync {
    run(...params: unknown[]): SqliteRunResult;
    get(...params: unknown[]): any;
    all(...params: unknown[]): any[];
  }
  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
