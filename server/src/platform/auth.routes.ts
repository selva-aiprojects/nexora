import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler } from '../core/http.js';
import { createToken, requireAuth } from '../core/auth.js';
import type { User } from '../core/types.js';

const router = Router();

// ---- Seed: platform tenant + demo users (used by every module) ----
const TENANT = {
  id: 'tnt_acme',
  name: 'Acme Industries Pvt Ltd',
  gstin: '29ABCDE1234F1Z5',
  financialYear: '2026-2027',
  currency: 'INR',
  baseCurrency: 'INR',
};

const USERS: User[] = [
  { id: 'usr_owner', tenantId: TENANT.id, name: 'Rajesh Kumar', email: 'owner@acme.in', password: 'demo1234', role: 'owner' },
  { id: 'usr_finance', tenantId: TENANT.id, name: 'Priya Nair', email: 'finance@acme.in', password: 'demo1234', role: 'finance' },
  { id: 'usr_hr', tenantId: TENANT.id, name: 'Anita Sharma', email: 'hr@acme.in', password: 'demo1234', role: 'hr' },
  { id: 'usr_emp', tenantId: TENANT.id, name: 'Vikram Singh', email: 'vikram@acme.in', password: 'demo1234', role: 'employee', employeeId: 'emp_1001' },
];

db.seed('platform_tenants', [TENANT]);
db.seed('platform_users', USERS);

/**
 * POST /api/auth/login
 * Body: { email, password } -> { token, user }
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) throw ApiError.badRequest('email and password are required');
    const user = db.collection('platform_users').find((u) => u.email === email && u.tenantId === TENANT.id);
    if (!user || user.password !== password) throw ApiError.unauthorized('Invalid email or password');
    const principal = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    };
    res.json({ token: createToken(principal), user: principal });
  })
);

/** GET /api/auth/me — current principal */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

/** GET /api/auth/tenant — tenant configuration */
router.get(
  '/tenant',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = db.byId(req.user!.tenantId, 'platform_tenants', req.user!.tenantId);
    res.json(tenant ?? null);
  })
);

export default router;
