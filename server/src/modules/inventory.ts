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















// Warehouses
router.get('/warehouses', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.warehouses))));
router.post('/warehouses', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'location']);
  const row = await db.insert(TID, COL.warehouses, { name: req.body.name, location: req.body.location, manager: req.body.manager ?? null });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Bins
router.get('/bins', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.bins);
  if (req.query.warehouseId) rows = rows.filter((b) => b.warehouseId === req.query.warehouseId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/bins', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['warehouseId', 'code', 'name']);
  const row = await db.insert(TID, COL.bins, { warehouseId: req.body.warehouseId, code: req.body.code, name: req.body.name });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Stock
router.get('/stock', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.stock);
  if (req.query.warehouseId) rows = rows.filter((s) => s.warehouseId === req.query.warehouseId);
  if (req.query.binId) rows = rows.filter((s) => s.binId === req.query.binId);
  if (req.query.itemId) rows = rows.filter((s) => s.itemId === req.query.itemId);
  if (req.query.batch) rows = rows.filter((s) => s.batch === req.query.batch);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

// Adjustments
router.get('/adjustments', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.adjustments);
  const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.itemId) rows = rows.filter((r) => r.itemId === req.query.itemId);
  if (req.query.warehouseId) rows = rows.filter((r) => r.warehouseId === req.query.warehouseId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/adjustments', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'warehouseId', 'binId', 'type', 'qty', 'reason', 'date']);
  const row = await db.insert(TID, COL.adjustments, { id: await db.nextId('ADJ', COL.adjustments), ...req.body });
  // update stock
  const stkRows = await db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.warehouseId && s.binId === req.body.binId);
  const stk = stkRows[0];
  const delta = req.body.type === 'write_off' || req.body.type === 'write_back' ? -Math.abs(req.body.qty) : Math.abs(req.body.qty);
  if (stk) await db.update(TID, COL.stock, stk.id, { quantity: Math.max(0, stk.quantity + delta) });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Transfers
router.get('/transfers', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.transfers);
  const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.itemId) rows = rows.filter((r) => r.itemId === req.query.itemId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/transfers', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'fromWarehouseId', 'toWarehouseId', 'qty']);
  const row = await db.insert(TID, COL.transfers, { id: await db.nextId('TRF', COL.transfers), date: new Date().toISOString().slice(0, 10), status: 'completed', ...req.body });
  const fromRows = await db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.fromWarehouseId);
  const from = fromRows[0];
  const toRows = await db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.toWarehouseId);
  const to = toRows[0];
  if (from) await db.update(TID, COL.stock, from.id, { quantity: from.quantity - req.body.qty });
  if (to) await db.update(TID, COL.stock, to.id, { quantity: to.quantity + req.body.qty });
  else await db.insert(TID, COL.stock, { itemId: req.body.itemId, warehouseId: req.body.toWarehouseId, binId: null, quantity: req.body.qty, batch: null, serial: null });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Cycle Counts
router.get('/cycle-counts', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.cycleCounts);
  const sorted = rows.sort((a, b) => b.countedOn.localeCompare(a.countedOn));
  if (req.query.warehouseId) rows = rows.filter((r) => r.warehouseId === req.query.warehouseId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/cycle-counts', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['warehouseId', 'binId', 'itemId', 'expectedQty', 'countedQty']);
  const expectedQty = Number(req.body.expectedQty);
  const countedQty = Number(req.body.countedQty);
  const row = await db.insert(TID, COL.cycleCounts, {
    id: await db.nextId('CC', COL.cycleCounts),
    countedOn: new Date().toISOString().slice(0, 10),
    countedBy: actor(req).name,
    status: 'closed',
    variance: countedQty - expectedQty,
    ...req.body,
  });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'inventory', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Reports
router.get('/reports/valuation', requireAuth, asyncHandler(async (_req, res) => {
  const items = await db.all(TID, 'manufacturing_items');
  const cost = new Map(items.map((i) => [i.id, i.standardCost]));
  const stockRows = await db.all(TID, COL.stock);
  const rows = stockRows.map((s) => ({ itemId: s.itemId, warehouseId: s.warehouseId, binId: s.binId, quantity: s.quantity, unitCost: cost.get(s.itemId) ?? 0, value: s.quantity * (cost.get(s.itemId) ?? 0) }));
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  res.json({ rows, totalValue });
}));
router.get('/reports/movement', requireAuth, asyncHandler(async (_req, res) => {
  const adjustments = await db.all(TID, COL.adjustments);
  const adjRows = adjustments.map((a) => ({ ...a, type: 'adjustment' }));
  const transfers = await db.all(TID, COL.transfers);
  const trRows = transfers.map((t) => ({ ...t, type: 'transfer' }));
  const rows = [...adjRows, ...trRows].sort((a, b) => b.date.localeCompare(a.date));
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/reports/aging', requireAuth, asyncHandler(async (_req, res) => {
  const stockRows = await db.all(TID, COL.stock);
  const rows: any[] = [];
  for (const s of stockRows) {
    const item = await db.byId(TID, 'manufacturing_items', s.itemId);
    const cost = item?.standardCost ?? 0;
    const value = s.quantity * cost;
    rows.push({ ...s, unitCost: cost, value });
  }
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

async function init() {
  await db.seed(COL.warehouses, [
  { id: 'wh_001', tenantId: TID, name: 'Main Warehouse', location: 'Bengaluru', manager: 'Rahul Verma' },
  { id: 'wh_002', tenantId: TID, name: 'Factory Floor', location: 'Bengaluru', manager: 'Priya Nair' },
  { id: 'wh_003', tenantId: TID, name: 'Cold Storage', location: 'Mysuru', manager: 'Arjun Singh' },
]);
  await db.seed(COL.bins, [
  { id: 'bin_001', tenantId: TID, warehouseId: 'wh_001', code: 'A-01-01', name: 'Rack A1' },
  { id: 'bin_002', tenantId: TID, warehouseId: 'wh_001', code: 'A-01-02', name: 'Rack A2' },
  { id: 'bin_003', tenantId: TID, warehouseId: 'wh_002', code: 'B-01-01', name: 'Floor B1' },
]);
  await db.seed(COL.stock, [
  { id: 'stk_001', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_001', quantity: 120, batch: 'B24', serial: null },
  { id: 'stk_002', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', binId: 'bin_002', quantity: 640, batch: 'B25', serial: null },
  { id: 'stk_003', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', binId: 'bin_003', quantity: 80, batch: null, serial: null },
  { id: 'stk_004', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_001', binId: 'bin_001', quantity: 45, batch: null, serial: null },
  { id: 'stk_005', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_002', binId: 'bin_003', quantity: 60, batch: 'B26', serial: null },
  { id: 'stk_006', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_002', binId: 'bin_003', quantity: 200, batch: 'B27', serial: null },
  { id: 'stk_007', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_001', binId: 'bin_002', quantity: 150, batch: null, serial: null },
  { id: 'stk_008', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_002', binId: 'bin_003', quantity: 30, batch: 'B28', serial: null },
  { id: 'stk_009', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_002', quantity: 85, batch: 'B29', serial: null },
  { id: 'stk_010', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', binId: 'bin_001', quantity: 420, batch: 'B30', serial: null },
  { id: 'stk_011', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_001', binId: 'bin_001', quantity: 95, batch: null, serial: null },
  { id: 'stk_012', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_001', binId: 'bin_002', quantity: 55, batch: null, serial: null },
  { id: 'stk_013', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_002', binId: null, quantity: 40, batch: 'B31', serial: null },
  { id: 'stk_014', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_002', binId: null, quantity: 170, batch: 'B32', serial: null },
  { id: 'stk_015', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', binId: null, quantity: 60, batch: null, serial: null },
  { id: 'stk_016', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_001', binId: null, quantity: 25, batch: 'B33', serial: null },
  { id: 'stk_017', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_001', quantity: 35, batch: 'B34', serial: 'SN-001-A' },
  { id: 'stk_018', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', binId: 'bin_002', quantity: 280, batch: 'B35', serial: null },
  { id: 'stk_019', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', binId: 'bin_003', quantity: 45, batch: null, serial: null },
  { id: 'stk_020', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_002', binId: null, quantity: 20, batch: 'B36', serial: 'SN-004-B' },
  { id: 'stk_021', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_002', binId: 'bin_003', quantity: 90, batch: 'B37', serial: null },
  { id: 'stk_022', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_002', binId: null, quantity: 310, batch: 'B38', serial: null },
  { id: 'stk_023', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_001', binId: 'bin_001', quantity: 110, batch: null, serial: null },
  { id: 'stk_024', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_001', binId: null, quantity: 38, batch: 'B39', serial: null },
  { id: 'stk_025', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_002', quantity: 72, batch: 'B40', serial: null },
  { id: 'stk_026', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', binId: 'bin_001', quantity: 195, batch: 'B41', serial: null },
  { id: 'stk_027', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', binId: null, quantity: 50, batch: null, serial: null },
  { id: 'stk_028', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_002', binId: 'bin_003', quantity: 15, batch: 'B42', serial: null },
  { id: 'stk_029', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_002', binId: null, quantity: 55, batch: 'B43', serial: null },
  { id: 'stk_030', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_002', binId: 'bin_003', quantity: 240, batch: 'B44', serial: null },
]);
  await db.seed(COL.adjustments, [
  { id: 'adj_001', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', binId: 'bin_001', type: 'write_off', qty: 10, reason: 'Damaged in transit', date: '2026-08-10' },
  { id: 'adj_002', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', binId: 'bin_002', type: 'write_off', qty: 25, reason: 'Rust damage reported', date: '2026-07-22' },
  { id: 'adj_003', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', binId: 'bin_003', type: 'write_back', qty: 5, reason: 'Count correction after audit', date: '2026-07-15' },
  { id: 'adj_004', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_001', binId: 'bin_001', type: 'write_off', qty: 3, reason: 'Expired shelf life', date: '2026-06-28' },
  { id: 'adj_005', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_002', binId: 'bin_003', type: 'write_off', qty: 8, reason: 'Theft suspected', date: '2026-06-10' },
  { id: 'adj_006', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_002', binId: null, type: 'write_back', qty: 15, reason: 'System stock mismatch', date: '2026-05-20' },
]);
  await db.seed(COL.transfers, [
  { id: 'trf_001', tenantId: TID, itemId: 'itm_001', fromWarehouseId: 'wh_001', toWarehouseId: 'wh_002', qty: 20, date: '2026-08-12', status: 'completed' },
  { id: 'trf_002', tenantId: TID, itemId: 'itm_002', fromWarehouseId: 'wh_001', toWarehouseId: 'wh_002', qty: 50, date: '2026-08-05', status: 'completed' },
  { id: 'trf_003', tenantId: TID, itemId: 'itm_003', fromWarehouseId: 'wh_002', toWarehouseId: 'wh_001', qty: 15, date: '2026-07-20', status: 'completed' },
  { id: 'trf_004', tenantId: TID, itemId: 'itm_004', fromWarehouseId: 'wh_001', toWarehouseId: 'wh_002', qty: 10, date: '2026-07-10', status: 'completed' },
  { id: 'trf_005', tenantId: TID, itemId: 'itm_001', fromWarehouseId: 'wh_002', toWarehouseId: 'wh_001', qty: 25, date: '2026-06-25', status: 'completed' },
  { id: 'trf_006', tenantId: TID, itemId: 'itm_002', fromWarehouseId: 'wh_002', toWarehouseId: 'wh_001', qty: 80, date: '2026-06-15', status: 'completed' },
  { id: 'trf_007', tenantId: TID, itemId: 'itm_004', fromWarehouseId: 'wh_002', toWarehouseId: 'wh_001', qty: 12, date: '2026-05-30', status: 'completed' },
  { id: 'trf_008', tenantId: TID, itemId: 'itm_003', fromWarehouseId: 'wh_001', toWarehouseId: 'wh_002', qty: 30, date: '2026-05-12', status: 'completed' },
]);
  await db.seed(COL.cycleCounts, [
  { id: 'cc_001', tenantId: TID, warehouseId: 'wh_001', binId: 'bin_001', itemId: 'itm_001', expectedQty: 120, countedQty: 118, variance: -2, countedOn: '2026-08-15', countedBy: 'Rahul Verma', status: 'closed' },
  { id: 'cc_002', tenantId: TID, warehouseId: 'wh_001', binId: 'bin_002', itemId: 'itm_002', expectedQty: 640, countedQty: 642, variance: 2, countedOn: '2026-08-14', countedBy: 'Priya Nair', status: 'closed' },
  { id: 'cc_003', tenantId: TID, warehouseId: 'wh_002', binId: 'bin_003', itemId: 'itm_003', expectedQty: 80, countedQty: 76, variance: -4, countedOn: '2026-08-12', countedBy: 'Arjun Singh', status: 'closed' },
  { id: 'cc_004', tenantId: TID, warehouseId: 'wh_001', binId: 'bin_001', itemId: 'itm_004', expectedQty: 45, countedQty: 45, variance: 0, countedOn: '2026-07-28', countedBy: 'Rahul Verma', status: 'closed' },
  { id: 'cc_005', tenantId: TID, warehouseId: 'wh_002', binId: 'bin_003', itemId: 'itm_001', expectedQty: 60, countedQty: 58, variance: -2, countedOn: '2026-07-20', countedBy: 'Arjun Singh', status: 'closed' },
  { id: 'cc_006', tenantId: TID, warehouseId: 'wh_001', binId: 'bin_002', itemId: 'itm_003', expectedQty: 150, countedQty: 152, variance: 2, countedOn: '2026-07-15', countedBy: 'Priya Nair', status: 'open' },
  { id: 'cc_007', tenantId: TID, warehouseId: 'wh_002', binId: null, itemId: 'itm_004', expectedQty: 30, countedQty: 30, variance: 0, countedOn: '2026-06-30', countedBy: 'Arjun Singh', status: 'closed' },
]);
}
init().catch(console.error);

export default router;
