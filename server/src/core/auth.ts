import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './errors.js';
import type { AuthUser, Role } from './types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const ALGO = 'nx1';

/** Opaque token (demo only — not a real JWT). Encodes the auth principal. */
export function createToken(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  return `${ALGO}.${payload}`;
}

export function verifyToken(token: string): AuthUser | null {
  const [scheme, payload] = token.split('.');
  if (scheme !== ALGO || !payload) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthUser;
    if (!user.id || !user.tenantId || !user.role) return null;
    return user;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized();
  const user = verifyToken(header.slice(7));
  if (!user) throw ApiError.unauthorized('Invalid or expired token');
  req.user = user;
  next();
}

/** Role gate — e.g. requireRole('finance','admin'). */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

export function tenantId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.tenantId;
}

export function actor(req: Request): { id: string; name: string } {
  if (!req.user) throw ApiError.unauthorized();
  return { id: req.user.id, name: req.user.name };
}
