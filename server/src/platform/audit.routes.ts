import { Router } from 'express';
import { db } from '../core/db.js';
import { asyncHandler } from '../core/http.js';
import { requireAuth } from '../core/auth.js';

const router = Router();

/** GET /api/audit/logs — tamper-evident-ish audit trail (most recent first). */
router.get(
  '/logs',
  requireAuth,
  asyncHandler(async (req, res) => {
    const all = (await db.all(req.user!.tenantId, 'platform_audit'))
      .slice()
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    const { module } = req.query;
    const filtered = module ? all.filter((l) => l.module === module) : all;
    res.json({ rows: filtered, total: filtered.length });
  })
);

export default router;
