import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';
import type { User, Role } from '../core/types.js';

const router = Router();
const TID = 'tnt_acme';
const COL = 'platform_users';

const ROLES: Role[] = ['owner', 'admin', 'finance', 'accountant', 'hr', 'manager', 'employee'];

const STATUSES = ['active', 'inactive', 'suspended'] as const;
type UserStatus = typeof STATUSES[number];

interface ManagedUser extends Omit<User, 'password'> {
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

function sanitize(user: User): ManagedUser {
  const { password, ...rest } = user as any;
  return {
    ...rest,
    status: (user as any).status ?? 'active',
    lastLogin: (user as any).lastLogin ?? null,
    createdAt: (user as any).createdAt ?? new Date().toISOString(),
    updatedAt: (user as any).updatedAt ?? new Date().toISOString(),
  };
}

router.use(requireAuth);

router.get('/', asyncHandler((req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  const role = req.query.role as string | undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  let rows = db.all(tenantId(req), COL);
  if (role) rows = rows.filter((r: any) => r.role === role);
  if (status) rows = rows.filter((r: any) => (r as any).status === status);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r: any) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize).map(sanitize), total, page, pageSize));
}));

router.get('/roles', asyncHandler((_req, res) => {
  const permissions: Record<Role, string[]> = {
    owner: ['*'],
    admin: ['dashboard', 'accounting', 'hrms', 'manufacturing', 'inventory', 'procurement', 'projects', 'quality', 'crm', 'compliance', 'dms', 'ess', 'ai', 'users', 'settings'],
    finance: ['dashboard', 'accounting', 'inventory', 'reports', 'ess'],
    accountant: ['dashboard', 'accounting', 'reports'],
    hr: ['dashboard', 'hrms', 'ess', 'reports'],
    manager: ['dashboard', 'sales', 'inventory', 'production', 'reports'],
    employee: ['dashboard', 'ess', 'dms'],
  };
  res.json({
    roles: ROLES.map((r) => ({ key: r, label: r.charAt(0).toUpperCase() + r.slice(1), permissions: permissions[r] })),
  });
}));

router.get('/:id', asyncHandler((req, res) => {
  const user = db.byId(tenantId(req), COL, req.params.id);
  res.json(sanitize(notFoundIfUndefined(user, 'User not found')));
}));

router.post('/', asyncHandler((req, res) => {
  const { name, email, password, role, employeeId, status, module } = req.body;
  requireBody(req.body, ['name', 'email', 'password', 'role']);

  const existing = db.collection(COL).find((u: any) => u.email === email && u.tenantId === tenantId(req));
  if (existing) throw ApiError.conflict('Email already exists');

  if (!ROLES.includes(role)) throw ApiError.badRequest(`Invalid role. Allowed: ${ROLES.join(', ')}`);
  if (status && !STATUSES.includes(status)) throw ApiError.badRequest(`Invalid status. Allowed: ${STATUSES.join(', ')}`);

  const user = db.insert(tenantId(req), COL, {
    id: db.nextId('usr', COL),
    tenantId: tenantId(req),
    name,
    email,
    password,
    role,
    employeeId: employeeId ?? null,
    module: module ?? null,
    status: status ?? 'active',
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'users', recordRef: user.id, newState: sanitize(user), ip: req.ip });
  res.status(201).json(sanitize(user));
}));

router.put('/:id', asyncHandler((req, res) => {
  const existing = db.byId(tenantId(req), COL, req.params.id);
  notFoundIfUndefined(existing, 'User not found');

  const { name, email, password, role, employeeId, status, module } = req.body;

  if (email && email !== existing.email) {
    const dup = db.collection(COL).find((u: any) => u.email === email && u.tenantId === tenantId(req) && u.id !== req.params.id);
    if (dup) throw ApiError.conflict('Email already exists');
  }

  if (role && !ROLES.includes(role)) throw ApiError.badRequest(`Invalid role. Allowed: ${ROLES.join(', ')}`);
  if (status && !STATUSES.includes(status)) throw ApiError.badRequest(`Invalid status. Allowed: ${STATUSES.join(', ')}`);

  const updated = db.update(tenantId(req), COL, req.params.id, {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(password !== undefined && { password }),
    ...(role !== undefined && { role }),
    ...(employeeId !== undefined && { employeeId }),
    ...(module !== undefined && { module }),
    ...(status !== undefined && { status }),
    updatedAt: new Date().toISOString(),
  });

  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'users', recordRef: updated.id, oldState: sanitize(existing), newState: sanitize(updated), ip: req.ip });
  res.json(sanitize(updated));
}));

router.delete('/:id', asyncHandler((req, res) => {
  const existing = db.byId(tenantId(req), COL, req.params.id);
  notFoundIfUndefined(existing, 'User not found');
  db.remove(tenantId(req), COL, req.params.id);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'delete', module: 'users', recordRef: req.params.id, oldState: sanitize(existing), ip: req.ip });
  res.status(204).send();
}));

router.post('/:id/activate', asyncHandler((req, res) => {
  const existing = db.byId(tenantId(req), COL, req.params.id);
  notFoundIfUndefined(existing, 'User not found');
  const updated = db.update(tenantId(req), COL, req.params.id, { status: 'active', updatedAt: new Date().toISOString() });
  res.json(sanitize(updated));
}));

router.post('/:id/suspend', asyncHandler((req, res) => {
  const existing = db.byId(tenantId(req), COL, req.params.id);
  notFoundIfUndefined(existing, 'User not found');
  const updated = db.update(tenantId(req), COL, req.params.id, { status: 'suspended', updatedAt: new Date().toISOString() });
  res.json(sanitize(updated));
}));

router.post('/:id/reset-password', asyncHandler((req, res) => {
  const existing = db.byId(tenantId(req), COL, req.params.id);
  notFoundIfUndefined(existing, 'User not found');
  const { password } = req.body;
  if (!password || password.length < 6) throw ApiError.badRequest('Password must be at least 6 characters');
  const updated = db.update(tenantId(req), COL, req.params.id, { password, updatedAt: new Date().toISOString() });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'users', recordRef: updated.id, newState: { passwordChanged: true }, ip: req.ip });
  res.json(sanitize(updated));
}));

db.seed(COL, [
  { id: 'usr_owner', tenantId: TID, name: 'Rajesh Kumar', email: 'owner@acme.in', password: 'demo1234', role: 'owner', module: 'superadmin', status: 'active', lastLogin: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
  { id: 'usr_admin', tenantId: TID, name: 'Sneha Patel', email: 'admin@acme.in', password: 'demo1234', role: 'admin', module: 'superadmin', status: 'active', lastLogin: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
  { id: 'usr_finance', tenantId: TID, name: 'Priya Nair', email: 'finance@acme.in', password: 'demo1234', role: 'finance', module: 'finance', status: 'active', lastLogin: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
  { id: 'usr_hr', tenantId: TID, name: 'Anita Sharma', email: 'hr@acme.in', password: 'demo1234', role: 'hr', module: 'hrms', status: 'active', lastLogin: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
  { id: 'usr_mgr', tenantId: TID, name: 'Karthik Reddy', email: 'karthik@acme.in', password: 'demo1234', role: 'manager', module: 'manufacturing', status: 'active', lastLogin: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
  { id: 'usr_emp', tenantId: TID, name: 'Vikram Singh', email: 'vikram@acme.in', password: 'demo1234', role: 'employee', employeeId: 'emp_1001', module: 'ess', status: 'active', lastLogin: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
]);

export default router;
