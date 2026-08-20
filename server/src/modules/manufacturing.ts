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










// ----------------------------- Helpers -----------------------------
async function writeLedger(itemId: string, type: 'in' | 'out' | 'adjust', qty: number, reference: string) {
  const stock = await db.query(TID, COL.stock, (s) => s.itemId === itemId);
  const current = stock.reduce((s, st) => s + st.quantity, 0);
  const balance = type === 'out' ? current - qty : current + qty;
  await db.insert(TID, COL.ledger, { id: await db.nextId('sl', COL.ledger), itemId, date: new Date().toISOString().slice(0, 10), type, qty, balance, reference });
}

// ----------------------------- Routes -----------------------------
// Item master
router.get('/items', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.items);
  if (req.query.type) rows = rows.filter((i) => i.type === req.query.type);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/items', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['sku', 'name', 'type', 'uom']);
  const row = await db.insert(TID, COL.items, { standardCost: req.body.standardCost ?? 0, reorderLevel: req.body.reorderLevel ?? 0, hsn: req.body.hsn ?? '', ...req.body });
  res.status(201).json(row);
}));

// Warehouse & Stock
router.get('/warehouses', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.warehouses))));
router.get('/stock', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.stock);
  if (req.query.warehouseId) rows = rows.filter((s) => s.warehouseId === req.query.warehouseId);
  if (req.query.itemId) rows = rows.filter((s) => s.itemId === req.query.itemId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/stock-transfers', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'fromWarehouseId', 'toWarehouseId', 'qty']);
  const row = await db.insert(TID, COL.transfers, { number: await db.nextId('ST', COL.transfers), date: new Date().toISOString().slice(0, 10), status: 'completed', ...req.body });
  // move stock
  const fromRows = await db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.fromWarehouseId);
  const from = fromRows[0];
  const toRows = await db.query(TID, COL.stock, (s) => s.itemId === req.body.itemId && s.warehouseId === req.body.toWarehouseId);
  const to = toRows[0];
  if (from) await db.update(TID, COL.stock, from.id, { quantity: from.quantity - req.body.qty });
  if (to) await db.update(TID, COL.stock, to.id, { quantity: to.quantity + req.body.qty });
  else await db.insert(TID, COL.stock, { itemId: req.body.itemId, warehouseId: req.body.toWarehouseId, quantity: req.body.qty, batch: null, serial: null });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'manufacturing', recordRef: row.number, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Procurement
router.get('/purchase-requisitions', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.prs);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/purchase-requisitions', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['itemId', 'qty', 'requiredBy']);
  const row = await db.insert(TID, COL.prs, { number: await db.nextId('PR', COL.prs), status: 'draft', ...req.body });
  res.status(201).json(row);
}));
router.get('/purchase-orders', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.pos);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/goods-receipts', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.grs);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/goods-receipts', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['poId', 'qty']);
  const po = notFoundIfUndefined(await db.byId(TID, COL.pos, req.body.poId), 'Purchase order not found');
  const row = await db.insert(TID, COL.grs, { id: await db.nextId('GR', COL.grs), date: new Date().toISOString().slice(0, 10), ...req.body });
  // increase stock
  const stkRows = await db.query(TID, COL.stock, (s) => s.itemId === po.itemId);
  const stk = stkRows[0];
  if (stk) await db.update(TID, COL.stock, stk.id, { quantity: stk.quantity + req.body.qty });
  await db.update(TID, COL.pos, po.id, { status: 'received' });
  await writeLedger(po.itemId, 'in', req.body.qty, `GR ${row.id}`);
  res.status(201).json(row);
}));

// BOM & Production
router.get('/boms', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.boms))));
router.post('/boms', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'finishedItemId', 'components']);
  const row = await db.insert(TID, COL.boms, { ...req.body });
  res.status(201).json(row);
}));
router.get('/production-orders', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.pos_order);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/production-orders', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['bomId', 'finishedItemId', 'qty']);
  const row = await db.insert(TID, COL.pos_order, { number: await db.nextId('PROD', COL.pos_order), status: 'planned', stage: 'Planning', ...req.body });
  res.status(201).json(row);
}));
router.post('/production-orders/:id/issue', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const order = notFoundIfUndefined(await db.byId(TID, COL.pos_order, req.params.id), 'Production order not found');
  const bom = await db.byId(TID, COL.boms, order.bomId);
  // consume components
  for (const c of bom?.components ?? []) {
    const stkRows = await db.query(TID, COL.stock, (s) => s.itemId === c.itemId);
    const stk = stkRows[0];
    if (stk) await db.update(TID, COL.stock, stk.id, { quantity: Math.max(0, stk.quantity - c.qty * order.qty) });
    await writeLedger(c.itemId, 'out', c.qty * order.qty, `Issue ${order.number}`);
  }
  const updated = await db.update(TID, COL.pos_order, order.id, { status: 'wip', stage: 'WIP' });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'manufacturing', recordRef: order.number, newState: { status: 'wip' }, ip: req.ip });
  res.json(updated);
}));
router.post('/production-orders/:id/complete', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const order = notFoundIfUndefined(await db.byId(TID, COL.pos_order, req.params.id), 'Production order not found');
  const stkRows = await db.query(TID, COL.stock, (s) => s.itemId === order.finishedItemId);
  const stk = stkRows[0];
  if (stk) await db.update(TID, COL.stock, stk.id, { quantity: stk.quantity + order.qty });
  else await db.insert(TID, COL.stock, { itemId: order.finishedItemId, warehouseId: 'wh_002', quantity: order.qty, batch: null, serial: null });
  await writeLedger(order.finishedItemId, 'in', order.qty, `Finish ${order.number}`);
  const updated = await db.update(TID, COL.pos_order, order.id, { status: 'completed', stage: 'Finished Goods' });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'manufacturing', recordRef: order.number, newState: { status: 'completed' }, ip: req.ip });
  res.json(updated);
}));

// Reports
router.get('/reports/stock-ledger', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.ledger);
  const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.itemId) rows = rows.filter((r) => r.itemId === req.query.itemId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/reports/valuation', requireAuth, asyncHandler(async (_req, res) => {
  const items = await db.all(TID, COL.items);
  const cost = new Map(items.map((i) => [i.id, i.standardCost]));
  const stock = await db.all(TID, COL.stock);
  const rows = stock.map((s) => ({ itemId: s.itemId, warehouseId: s.warehouseId, quantity: s.quantity, unitCost: cost.get(s.itemId) ?? 0, value: s.quantity * (cost.get(s.itemId) ?? 0) }));
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  res.json({ rows, totalValue });
}));
router.get('/reports/material-shortage', requireAuth, asyncHandler(async (_req, res) => {
  const boms = await db.all(TID, COL.boms);
  const items = await db.all(TID, COL.items);
  const name = new Map(items.map((i) => [i.id, i.name]));
  const report: any[] = [];
  for (const bom of boms) {
    for (const c of bom.components) {
      const stockRows = await db.query(TID, COL.stock, (s) => s.itemId === c.itemId);
      const stock = stockRows.reduce((s, st) => s + st.quantity, 0);
      const short = Math.max(0, c.qty - stock);
      if (short > 0) {
        report.push({ bomId: bom.id, bomName: bom.name, itemId: c.itemId, itemName: name.get(c.itemId), requiredPerUnit: c.qty, available: stock, short });
      }
    }
  }
  res.json({ shortages: report });
}));

async function init() {
  await db.seed(COL.items, [
  { id: 'itm_001', tenantId: TID, sku: 'RM-001', name: 'Steel Coil', hsn: '7208', type: 'raw_material', uom: 'kg', standardCost: 420, reorderLevel: 500 },
  { id: 'itm_002', tenantId: TID, sku: 'RM-002', name: 'Copper Wire', hsn: '7408', type: 'raw_material', uom: 'm', standardCost: 180, reorderLevel: 300 },
  { id: 'itm_003', tenantId: TID, sku: 'SF-001', name: 'Motor Assembly', hsn: '8501', type: 'semi_finished', uom: 'pcs', standardCost: 3200, reorderLevel: 50 },
  { id: 'itm_004', tenantId: TID, sku: 'FG-001', name: 'Industrial Pump', hsn: '8413', type: 'finished_good', uom: 'pcs', standardCost: 9800, reorderLevel: 30 },
]);
  await db.seed(COL.warehouses, [
  { id: 'wh_001', tenantId: TID, name: 'Main Warehouse', location: 'Bengaluru' },
  { id: 'wh_002', tenantId: TID, name: 'Factory Floor', location: 'Bengaluru' },
]);
  await db.seed(COL.stock, [
  { id: 'stk_001', tenantId: TID, itemId: 'itm_001', warehouseId: 'wh_001', quantity: 120, batch: 'B24', serial: null },
  { id: 'stk_002', tenantId: TID, itemId: 'itm_002', warehouseId: 'wh_001', quantity: 640, batch: 'B25', serial: null },
  { id: 'stk_003', tenantId: TID, itemId: 'itm_003', warehouseId: 'wh_002', quantity: 80, batch: null, serial: null },
  { id: 'stk_004', tenantId: TID, itemId: 'itm_004', warehouseId: 'wh_002', quantity: 45, batch: null, serial: null },
]);
  await db.seed(COL.prs, [
  { id: 'pr_0001', tenantId: TID, number: 'PR-2026-001', itemId: 'itm_001', qty: 500, requiredBy: '2026-09-01', status: 'approved' },
  { id: 'pr_0002', tenantId: TID, number: 'PR-2026-002', itemId: 'itm_002', qty: 200, requiredBy: '2026-09-15', status: 'approved' },
  { id: 'pr_0003', tenantId: TID, number: 'PR-2026-003', itemId: 'itm_005', qty: 300, requiredBy: '2026-08-30', status: 'pending' },
  { id: 'pr_0004', tenantId: TID, number: 'PR-2026-004', itemId: 'itm_001', qty: 400, requiredBy: '2026-10-01', status: 'approved' },
  { id: 'pr_0005', tenantId: TID, number: 'PR-2026-005', itemId: 'itm_006', qty: 150, requiredBy: '2026-09-20', status: 'pending' },
]);
  await db.seed(COL.pos, [
  { id: 'po_0001', tenantId: TID, number: 'PO-2026-001', vendorId: 'ven_001', itemId: 'itm_001', qty: 500, rate: 415, status: 'open' },
  { id: 'po_0002', tenantId: TID, number: 'PO-2026-002', vendorId: 'ven_002', itemId: 'itm_002', qty: 200, rate: 178, status: 'open' },
  { id: 'po_0003', tenantId: TID, number: 'PO-2026-003', vendorId: 'ven_001', itemId: 'itm_001', qty: 400, rate: 405, status: 'received' },
  { id: 'po_0004', tenantId: TID, number: 'PO-2026-004', vendorId: 'ven_002', itemId: 'itm_005', qty: 300, rate: 520, status: 'open' },
  { id: 'po_0005', tenantId: TID, number: 'PO-2026-005', vendorId: 'ven_001', itemId: 'itm_006', qty: 150, rate: 890, status: 'received' },
]);
  await db.seed(COL.grs, [
  { id: 'gr_0001', tenantId: TID, poId: 'po_0001', qty: 500, date: '2026-08-12' },
  { id: 'gr_0002', tenantId: TID, poId: 'po_0002', qty: 180, date: '2026-08-18' },
  { id: 'gr_0003', tenantId: TID, poId: 'po_0003', qty: 400, date: '2026-07-25' },
  { id: 'gr_0004', tenantId: TID, poId: 'po_0005', qty: 150, date: '2026-07-10' },
]);
  await db.seed(COL.boms, [
  { id: 'bom_001', tenantId: TID, name: 'Industrial Pump BOM', finishedItemId: 'itm_004', components: [{ itemId: 'itm_003', qty: 1 }, { itemId: 'itm_002', qty: 12 }] },
  { id: 'bom_002', tenantId: TID, name: 'Control Panel BOM', finishedItemId: 'itm_005', components: [{ itemId: 'itm_001', qty: 8 }, { itemId: 'itm_006', qty: 2 }] },
  { id: 'bom_003', tenantId: TID, name: 'Valve Assembly BOM', finishedItemId: 'itm_006', components: [{ itemId: 'itm_002', qty: 5 }, { itemId: 'itm_001', qty: 3 }] },
]);
  await db.seed(COL.pos_order, [
  { id: 'poord_001', tenantId: TID, number: 'PROD-2026-001', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 20, status: 'planned', stage: 'Planning' },
  { id: 'poord_002', tenantId: TID, number: 'PROD-2026-002', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 15, status: 'in-progress', stage: 'WIP' },
  { id: 'poord_003', tenantId: TID, number: 'PROD-2026-003', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 25, status: 'completed', stage: 'Finished Goods' },
  { id: 'poord_004', tenantId: TID, number: 'PROD-2026-004', bomId: 'bom_002', finishedItemId: 'itm_005', qty: 30, status: 'in-progress', stage: 'WIP' },
  { id: 'poord_005', tenantId: TID, number: 'PROD-2026-005', bomId: 'bom_002', finishedItemId: 'itm_005', qty: 10, status: 'completed', stage: 'Finished Goods' },
  { id: 'poord_006', tenantId: TID, number: 'PROD-2026-006', bomId: 'bom_003', finishedItemId: 'itm_006', qty: 50, status: 'planned', stage: 'Planning' },
  { id: 'poord_007', tenantId: TID, number: 'PROD-2026-007', bomId: 'bom_003', finishedItemId: 'itm_006', qty: 40, status: 'cancelled', stage: 'Planning' },
  { id: 'poord_008', tenantId: TID, number: 'PROD-2026-008', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 18, status: 'in-progress', stage: 'WIP' },
  { id: 'poord_009', tenantId: TID, number: 'PROD-2026-009', bomId: 'bom_002', finishedItemId: 'itm_005', qty: 25, status: 'planned', stage: 'Planning' },
  { id: 'poord_010', tenantId: TID, number: 'PROD-2026-010', bomId: 'bom_003', finishedItemId: 'itm_006', qty: 60, status: 'completed', stage: 'Finished Goods' },
  { id: 'poord_011', tenantId: TID, number: 'PROD-2026-011', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 12, status: 'cancelled', stage: 'Planning' },
  { id: 'poord_012', tenantId: TID, number: 'PROD-2026-012', bomId: 'bom_002', finishedItemId: 'itm_005', qty: 35, status: 'in-progress', stage: 'WIP' },
  { id: 'poord_013', tenantId: TID, number: 'PROD-2026-013', bomId: 'bom_003', finishedItemId: 'itm_006', qty: 45, status: 'completed', stage: 'Finished Goods' },
  { id: 'poord_014', tenantId: TID, number: 'PROD-2026-014', bomId: 'bom_001', finishedItemId: 'itm_004', qty: 22, status: 'planned', stage: 'Planning' },
  { id: 'poord_015', tenantId: TID, number: 'PROD-2026-015', bomId: 'bom_002', finishedItemId: 'itm_005', qty: 20, status: 'completed', stage: 'Finished Goods' },
]);
  await db.seed(COL.ledger, [
  { id: 'sl_001', tenantId: TID, itemId: 'itm_001', date: '2026-07-01', type: 'in', qty: 620, balance: 620, reference: 'Opening' },
  { id: 'sl_002', tenantId: TID, itemId: 'itm_001', date: '2026-08-10', type: 'out', qty: 500, balance: 120, reference: 'Issue PROD-2026-000' },
  { id: 'sl_003', tenantId: TID, itemId: 'itm_001', date: '2026-07-15', type: 'out', qty: 120, balance: 500, reference: 'Transfer TRF-001' },
  { id: 'sl_004', tenantId: TID, itemId: 'itm_002', date: '2026-07-01', type: 'in', qty: 900, balance: 900, reference: 'Opening' },
  { id: 'sl_005', tenantId: TID, itemId: 'itm_002', date: '2026-08-05', type: 'out', qty: 260, balance: 640, reference: 'Issue PROD-2026-001' },
  { id: 'sl_006', tenantId: TID, itemId: 'itm_003', date: '2026-07-01', type: 'in', qty: 150, balance: 150, reference: 'Opening' },
  { id: 'sl_007', tenantId: TID, itemId: 'itm_003', date: '2026-07-20', type: 'out', qty: 70, balance: 80, reference: 'Transfer TRF-003' },
  { id: 'sl_008', tenantId: TID, itemId: 'itm_004', date: '2026-07-01', type: 'in', qty: 60, balance: 60, reference: 'Opening' },
  { id: 'sl_009', tenantId: TID, itemId: 'itm_004', date: '2026-08-01', type: 'out', qty: 15, balance: 45, reference: 'Issue PROD-2026-002' },
  { id: 'sl_010', tenantId: TID, itemId: 'itm_005', date: '2026-07-01', type: 'in', qty: 50, balance: 50, reference: 'Opening' },
  { id: 'sl_011', tenantId: TID, itemId: 'itm_006', date: '2026-07-01', type: 'in', qty: 80, balance: 80, reference: 'Opening' },
  { id: 'sl_012', tenantId: TID, itemId: 'itm_006', date: '2026-08-15', type: 'out', qty: 20, balance: 60, reference: 'Issue PROD-2026-005' },
]);
}
init().catch(console.error);

export default router;
