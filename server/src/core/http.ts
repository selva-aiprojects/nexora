import type { Request, Response, NextFunction } from 'express';
import type { ListResult, Paginated } from './types.js';
import { ApiError } from './errors.js';

/** Wrap an async express handler so thrown ApiErrors reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Standard list response: { rows, total, page, pageSize } for the frontend's DataTable. */
export function listResult<T>(rows: T[], total: number, page: number, pageSize: number): ListResult<T> {
  return { rows, total, page, pageSize };
}

export function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(200, Math.max(1, pageSize));
  const start = (safePage - 1) * safeSize;
  return {
    data: items.slice(start, start + safeSize),
    pagination: { page: safePage, pageSize: safeSize, total: items.length },
  };
}

export function parseQueryInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Pick a subset of fields from an object (whitelist for responses). */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

export function requireBody<T extends Record<string, unknown>>(body: T, fields: (keyof T)[]): void {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw ApiError.badRequest(`Missing required field: ${String(f)}`);
    }
  }
}

export function notFoundIfUndefined<T>(value: T | undefined, message = 'Resource not found'): T {
  if (value === undefined || value === null) throw ApiError.notFound(message);
  return value;
}
