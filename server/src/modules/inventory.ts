import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, requireBody } from '../core/http.js';
import { requireAuth, requireRole, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';

const COL = {
  warehouses: 'inventory_warehouses',
  bins: 'inventory_bins',
  stock: 'inventory_stock',
  adjustments: 'inventory_adjustments',
  transfers: 'inventory_transfers',
  cycleCounts: 'inventory_cycle_counts',
};

db.seed(COL.warehouses, [
  { id: 'wh_001', tenantId: TID, name: 'Main Warehouse', location: 'Bengaluru', manager: 'Rahul Verma' },
  { id: 'wh_002', tenantId: TID, name: 'Factory Floor', location: 'Bengaluru', manager: 'Priya Nair' },
  { id: 'wh_003', tenantId: TID, name: 'Cold Storage', location: 'Mysuru', manager: 'Arjun Singh' },
]);

db.seed(COL.bins, [
  { id: 'bin_001', tenantId: TID, warehouseId: 'wh_001', code: 'A-01-01', name: 'Rack A1' },
  { id: 'bin_002', tenantId: TID, warehouseId: 'wh_001', code: 'A-01-02', name: 'Rack A2' },
  { id: 'bin_003', tenantId: TID, warehouseId: 'wh_002', code: 'B-01-01', name: 'Floor B1' },
]);

db.seed(COL.stock, [
  { id: 'stk_001', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_001', quantity: 120, batch: 'B24', serial: null },
  { id: 'stk_002', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', binId: 'bin_002', quantity: 640, batch: 'B25', serial: null },
  { id: 'stk_003', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', binId: 'bin_003', quantity: 80, batch: null, serial: null },
  { id: 'stk_004', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_001', binId: 'bin_001', quantity: 45, batch: null, serial: null },
]);

db.seed(COL.adjustments, [
  { id: 'adj_001', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_001', type: 'write_off', qty: 10, reason: 'Damaged in transit', date: '2026-08-10' },
]);

db.seed(COL.transfers, [
  { id: 'trf_001', tenantId: TID, itemId: 'itm_001', fromWarehouseId: 'wh_001', toWarehouseId: 'wh_002', qty: 20, date: '2026-08-12', status: 'completed' },
]);

db.seed(COL.cycleCounts, [
  { id: 'cc_001', tenantId: TID, warehouseId: 'wh_001', binId: 'bin_001', itemId: 'itm_001', expectedQty: 120, countedQty: 118, variance: -2, countedOn: '2026-08-15', countedBy: 'Rahul Verma', status: 'closed' },
]);

// Warehouses
router.get('/warehouses', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.warehouses))));
router.post('/warehouses', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'location']);
  const row = db.insert(TID, COL.warehouses, { name: req.body.name, location: req.body.location, manager: req.body.manager ?? null });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Bins
router.get('/bins', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.bins);
  if (req.query.warehouseId) rows = rows.filter((b) => b.warehouseId === req.query.warehouseId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/bins', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['warehouseId', 'code', 'name']);
  const row = db.insert(TID, COL.bins, { warehouseId: req.body.warehouseId, code: req.body.code, name: req.body.name });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Stock
router.get('/stock', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.stock);
  if (req.query.warehouseId) rows = rows.filter((s) => s.warehouseId === req.query.warehouseId);
  if (req.query.binId) rows = rows.filter((s) => s.binId === req.query.binId);
  if (req.query.itemId) rows = rows.filter((s) => s.itemId === req.query.itemId);
  if (req.query.batch) rows = rows.filter((s) => s.batch === req.query.batch);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

// Adjustments
router.get('/adjustments', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.adjustments).sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.itemId) rows = rows.filter((r) => r.itemId === req.query.itemId);
  if (req.query.warehouseId) rows = rows.filter((r) => r.warehouseId === req.query.warehouseId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/adjustments', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'warehouseId', 'binId', 'type', 'qty', 'reason', 'date']);
  const row = db.insert(TID, COL.adjustments, { id: db.nextId('ADJ', COL.adjustments), ...req.body });
  // update stock
  const stk = db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.warehouseId && s.binId === req.body.binId)[0];
  const delta = req.body.type === 'write_off' || req.body.type === 'write_back' ? -Math.abs(req.body.qty) : Math.abs(req.body.qty);
  if (stk) db.update(TID, COL.stock, stk.id, { quantity: Math.max(0, stk.quantity + delta) });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Transfers
router.get('/transfers', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.transfers).sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.itemId) rows = rows.filter((r) => r.itemId === req.query.itemId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/transfers', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'fromWarehouseId', 'toWarehouseId', 'qty']);
  const row = db.insert(TID, COL.transfers, { id: db.nextId('TRF', COL.transfers), date: new Date().toISOString().slice(0, 10), status: 'completed', ...req.body });
  const from = db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.fromWarehouseId)[0];
  const to = db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.toWarehouseId)[0];
  if (from) db.update(TID, COL.stock, from.id, { quantity: from.quantity - req.body.qty });
  if (to) db.update(TID, COL.stock, to.id, { quantity: to.quantity + req.body.qty });
  else db.insert(TID, COL.stock, { itemId: req.body.itemId, warehouseId: req.body.toWarehouseId, binId: null, quantity: req.body.qty, batch: null, serial: null });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Cycle Counts
router.get('/cycle-counts', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.cycleCounts).sort((a, b) => b.countedOn.localeCompare(a.countedOn));
  if (req.query.warehouseId) rows = rows.filter((r) => r.warehouseId === req.query.warehouseId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/cycle-counts', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['warehouseId', 'binId', 'itemId', 'expectedQty', 'countedQty']);
  const expectedQty = Number(req.body.expectedQty);
  const countedQty = Number(req.body.countedQty);
  const row = db.insert(TID, COL.cycleCounts, {
    id: db.nextId('CC', COL.cycleCounts),
    countedOn: new Date().toISOString().slice(0, 10),
    countedBy: actor(req).name,
    status: 'closed',
    variance: countedQty - expectedQty,
    ...req.body,
  });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Reports
router.get('/reports/valuation', requireAuth, asyncHandler(async (_req, res) => {
  const items = db.all(TID, 'manufacturing_items');
  const cost = new Map(items.map((i) => [i.id, i.standardCost]));
  const rows = db.all(TID, COL.stock).map((s) => ({ itemId: s.itemId, warehouseId: s.warehouseId, binId: s.binId, quantity: s.quantity, unitCost: cost.get(s.itemId) ?? 0, value: s.quantity * (cost.get(s.itemId) ?? 0) }));
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  res.json({ rows, totalValue });
}));
router.get('/reports/movement', requireAuth, asyncHandler(async (_req, res) => {
  const adjustments = db.all(TID, COL.adjustments).map((a) => ({ ...a, type: 'adjustment' }));
  const transfers = db.all(TID, COL.transfers).map((t) => ({ ...t, type: 'transfer' }));
  const rows = [...adjustments, ...transfers].sort((a, b) => b.date.localeCompare(a.date));
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/reports/aging', requireAuth, asyncHandler(async (_req, res) => {
  const rows = db.all(TID, COL.stock).map((s) => {
    const cost = db.byId(TID, 'manufacturing_items', s.itemId)?.standardCost ?? 0;
    const value = s.quantity * cost;
    return { ...s, unitCost: cost, value };
  });
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

export default router;
