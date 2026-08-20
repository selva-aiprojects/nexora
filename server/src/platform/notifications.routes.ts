import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler } from '../core/http.js';
import { requireAuth } from '../core/auth.js';

const router = Router();

const SEED = [
  { id: 'ntf_00001', type: 'approval', title: 'Purchase invoice pending approval', body: 'INV-2026-00451 from Sharma Traders ₹1,28,400', link: '/accounting/purchase-invoices', channel: 'in_app' },
  { id: 'ntf_00002', type: 'ai', title: 'Duplicate payment risk', body: 'Vendor "Sharma Traders" appears paid twice for INV-2291', link: '/ai/anomalies', channel: 'in_app' },
  { id: 'ntf_00003', type: 'compliance', title: 'GST GSTR-3B due in 4 days', body: 'August 2026 return must be filed by 20th', link: '/compliance/deadlines', channel: 'email' },
  { id: 'ntf_00004', type: 'leave', title: 'Leave request awaiting you', body: 'Vikram Singh applied for 2 days casual leave', link: '/hrms/leave', channel: 'push' },
  { id: 'ntf_00005', type: 'inventory', title: 'Raw material below reorder level', body: 'Steel Coil (RM-004) stock at 120 kg vs reorder 500 kg', link: '/manufacturing/stock', channel: 'in_app' },
];

async function init() {
  await db.seed(
    'platform_notifications',
    SEED.map((n) => ({ ...n, tenantId: 'tnt_acme', userId: null, read: false, createdAt: new Date().toISOString() }))
  );
}
init().catch(console.error);

/** GET /api/notifications — centralized notification center. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = (await db.all(req.user!.tenantId, 'platform_notifications'))
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const filtered = req.query.unread === 'true' ? items.filter((n) => !n.read) : items;
    const unread = items.filter((n) => !n.read).length;
    res.json({ rows: filtered, total: filtered.length, unread });
  })
);

/** POST /api/notifications/:id/read */
router.post(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await db.update(req.user!.tenantId, 'platform_notifications', req.params.id, { read: true });
    if (!updated) throw ApiError.notFound('Notification not found');
    res.json(updated);
  })
);

export default router;
