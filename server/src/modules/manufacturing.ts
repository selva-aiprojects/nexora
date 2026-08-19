import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, requireRole, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = {
  items: 'manufacturing_items',
  warehouses: 'manufacturing_warehouses',
  stock: 'manufacturing_stock',
  transfers: 'manufacturing_stock_transfers',
  prs: 'manufacturing_purchase_requisitions',
  pos: 'manufacturing_purchase_orders',
  grs: 'manufacturing_goods_receipts',
  boms: 'manufacturing_boms',
  pos_order: 'manufacturing_production_orders',
  ledger: 'manufacturing_stock_ledger',
};

// ----------------------------- Seed data -----------------------------
db.seed(COL.items, [
  { id: 'itm_001', tenantId: TID, sku: 'RM-001', name: 'Steel Coil', hsn: '7208', type: 'raw_material', uom: 'kg', standardCost: 420, reorderLevel: 500 },
  { id: 'itm_002', tenantId: TID, sku: 'RM-002', name: 'Copper Wire', hsn: '7408', type: 'raw_material', uom: 'm', standardCost: 180, reorderLevel: 300 },
  { id: 'itm_003', tenantId: TID, sku: 'SF-001', name: 'Motor Assembly', hsn: '8501', type: 'semi_finished', uom: 'pcs', standardCost: 3200, reorderLevel: 50 },
  { id: 'itm_004', tenantId: TID, sku: 'FG-001', name: 'Industrial Pump', hsn: '8413', type: 'finished_good', uom: 'pcs', standardCost: 9800, reorderLevel: 30 },
]);
db.seed(COL.warehouses, [
  { id: 'wh_001', tenantId: TID, name: 'Main Warehouse', location: 'Bengaluru' },
  { id: 'wh_002', tenantId: TID, name: 'Factory Floor', location: 'Bengaluru' },
]);
db.seed(COL.stock, [
  { id: 'stk_001', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', quantity: 120, batch: 'B24', serial: null },
  { id: 'stk_002', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', quantity: 640, batch: 'B25', serial: null },
  { id: 'stk_003', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', quantity: 80, batch: null, serial: null },
  { id: 'stk_004', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_002', quantity: 45, batch: null, serial: null },
]);
db.seed(COL.prs, [
  { id: 'pr_0001', tenantId: TID, number: 'PR-2026-001', itemId: 'itm_001', qty: 500, requiredBy: '2026-09-01', status: 'approved' },
]);
db.seed(COL.pos, [
  { id: 'po_0001', tenantId: TID, number: 'PO-2026-001', vendorId: 'ven_001', itemId: 'itm_001', qty: 500, rate: 415, status: 'open' },
]);
db.seed(COL.grs, [
  { id: 'gr_0001', tenantId: TID, poId: 'po_0001', qty: 0, date: null },
]);
db.seed(COL.boms, [
  { id: 'bom_001', tenantId: TID, name: 'Industrial Pump BOM', finishedItemId: 'itm_004', components: [{ itemId: 'itm_003', qty: 1 }, { itemId: 'itm_002', qty: 12 }] },
]);
db.seed(COL.pos_order, [
  { id: 'poord_001', tenantId: TID, number: 'PROD-2026-001', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 20, status: 'planned', stage: 'Planning' },
]);
db.seed(COL.ledger, [
  { id: 'sl_001', tenantId: TID, itemId: 'itm_001', date: '2026-07-01', type: 'in', qty: 620, balance: 620, reference: 'Opening' },
  { id: 'sl_002', tenantId: TID, itemId: 'itm_001', date: '2026-08-10', type: 'out', qty: 500, balance: 120, reference: 'Issue PROD-2026-000' },
]);

// ----------------------------- Helpers -----------------------------
function writeLedger(itemId: string, type: 'in' | 'out' | 'adjust', qty: number, reference: string) {
  const stock = db.query(TID, COL.stock, (s) => s.itemId === itemId);
  const current = stock.reduce((s, st) => s + st.quantity, 0);
  const balance = type === 'out' ? current - qty : current + qty;
  db.insert(TID, COL.ledger, { id: db.nextId('sl', COL.ledger), itemId, date: new Date().toISOString().slice(0, 10), type, qty, balance, reference });
}

// ----------------------------- Routes -----------------------------
// Item master
router.get('/items', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.items);
  if (req.query.type) rows = rows.filter((i) => i.type === req.query.type);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/items', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['sku', 'name', 'type', 'uom']);
  const row = db.insert(TID, COL.items, { standardCost: req.body.standardCost ?? 0, reorderLevel: req.body.reorderLevel ?? 0, hsn: req.body.hsn ?? '', ...req.body });
  res.status(201).json(row);
}));

// Warehouse & Stock
router.get('/warehouses', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.warehouses))));
router.get('/stock', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.stock);
  if (req.query.warehouseId) rows = rows.filter((s) => s.warehouseId === req.query.warehouseId);
  if (req.query.itemId) rows = rows.filter((s) => s.itemId === req.query.itemId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/stock-transfers', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'fromWarehouseId', 'toWarehouseId', 'qty']);
  const row = db.insert(TID, COL.transfers, { number: db.nextId('ST', COL.transfers), date: new Date().toISOString().slice(0, 10), status: 'completed', ...req.body });
  // move stock
  const from = db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.fromWarehouseId)[0];
  const to = db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.toWarehouseId)[0];
  if (from) db.update(TID, COL.stock, from.id, { quantity: from.quantity - req.body.qty });
  if (to) db.update(TID, COL.stock, to.id, { quantity: to.quantity + req.body.qty });
  else db.insert(TID, COL.stock, { itemId: req.body.itemId, warehouseId: req.body.toWarehouseId, quantity: req.body.qty, batch: null, serial: null });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'manufacturing', recordRef: row.number, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Procurement
router.get('/purchase-requisitions', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.prs);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/purchase-requisitions', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'qty', 'requiredBy']);
  const row = db.insert(TID, COL.prs, { number: db.nextId('PR', COL.prs), status: 'draft', ...req.body });
  res.status(201).json(row);
}));
router.get('/purchase-orders', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.pos);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/goods-receipts', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.grs);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/goods-receipts', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['poId', 'qty']);
  const po = notFoundIfUndefined(db.byId(TID, COL.pos, req.body.poId), 'Purchase order not found');
  const row = db.insert(TID, COL.grs, { id: db.nextId('GR', COL.grs), date: new Date().toISOString().slice(0, 10), ...req.body });
  // increase stock
  const stk = db.query(TID, COL.stock, (s) => s.itemId === po.itemId)[0];
  if (stk) db.update(TID, COL.stock, stk.id, { quantity: stk.quantity + req.body.qty });
  db.update(TID, COL.pos, po.id, { status: 'received' });
  writeLedger(po.itemId, 'in', req.body.qty, `GR ${row.id}`);
  res.status(201).json(row);
}));

// BOM & Production
router.get('/boms', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.boms))));
router.post('/boms', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'finishedItemId', 'components']);
  const row = db.insert(TID, COL.boms, { ...req.body });
  res.status(201).json(row);
}));
router.get('/production-orders', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.pos_order);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/production-orders', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['bomId', 'finishedItemId', 'qty']);
  const row = db.insert(TID, COL.pos_order, { number: db.nextId('PROD', COL.pos_order), status: 'planned', stage: 'Planning', ...req.body });
  res.status(201).json(row);
}));
router.post('/production-orders/:id/issue', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const order = notFoundIfUndefined(db.byId(TID, COL.pos_order, req.params.id), 'Production order not found');
  const bom = db.byId(TID, COL.boms, order.bomId);
  // consume components
  for (const c of bom?.components ?? []) {
    const stk = db.query(TID, COL.stock, (s) => s.itemId === c.itemId)[0];
    if (stk) db.update(TID, COL.stock, stk.id, { quantity: Math.max(0, stk.quantity - c.qty * order.qty) });
    writeLedger(c.itemId, 'out', c.qty * order.qty, `Issue ${order.number}`);
  }
  const updated = db.update(TID, COL.pos_order, order.id, { status: 'wip', stage: 'WIP' });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'manufacturing', recordRef: order.number, newState: { status: 'wip' }, ip: req.ip });
  res.json(updated);
}));
router.post('/production-orders/:id/complete', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const order = notFoundIfUndefined(db.byId(TID, COL.pos_order, req.params.id), 'Production order not found');
  const stk = db.query(TID, COL.stock, (s) => s.itemId === order.finishedItemId)[0];
  if (stk) db.update(TID, COL.stock, stk.id, { quantity: stk.quantity + order.qty });
  else db.insert(TID, COL.stock, { itemId: order.finishedItemId, warehouseId: 'wh_002', quantity: order.qty, batch: null, serial: null });
  writeLedger(order.finishedItemId, 'in', order.qty, `Finish ${order.number}`);
  const updated = db.update(TID, COL.pos_order, order.id, { status: 'completed', stage: 'Finished Goods' });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'manufacturing', recordRef: order.number, newState: { status: 'completed' }, ip: req.ip });
  res.json(updated);
}));

// Reports
router.get('/reports/stock-ledger', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.ledger).sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.itemId) rows = rows.filter((r) => r.itemId === req.query.itemId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/reports/valuation', requireAuth, asyncHandler(async (_req, res) => {
  const items = db.all(TID, COL.items);
  const cost = new Map(items.map((i) => [i.id, i.standardCost]));
  const rows = db.all(TID, COL.stock).map((s) => ({ itemId: s.itemId, warehouseId: s.warehouseId, quantity: s.quantity, unitCost: cost.get(s.itemId) ?? 0, value: s.quantity * (cost.get(s.itemId) ?? 0) }));
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  res.json({ rows, totalValue });
}));
router.get('/reports/material-shortage', requireAuth, asyncHandler(async (_req, res) => {
  const boms = db.all(TID, COL.boms);
  const items = db.all(TID, COL.items);
  const name = new Map(items.map((i) => [i.id, i.name]));
  const shortages = boms.flatMap((bom) =>
    bom.components.map((c: any) => {
      const stock = db.query(TID, COL.stock, (s) => s.itemId === c.itemId).reduce((s, st) => s + st.quantity, 0);
      return { bomId: bom.id, bomName: bom.name, itemId: c.itemId, itemName: name.get(c.itemId), requiredPerUnit: c.qty, available: stock, short: Math.max(0, c.qty - stock) };
    }).filter((x: any) => x.short > 0)
  );
  res.json({ shortages });
}));

export default router;
