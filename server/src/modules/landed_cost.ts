import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody, listResult } from '../core/http.js';
import { requireAuth, requireRole, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const COL = {
  vouchers: 'procurement_landed_costs',
  grns: 'procurement_grns',
  stock: 'inventory_stock',
};

const DEFAULT_VOUCHERS = [
  {
    voucherNumber: 'LCV-2026-001',
    grnId: 'grn_001',
    grnNumber: 'GRN-2026-001',
    allocationBasis: 'value',
    charges: [
      { type: 'Ocean/Road Freight', amount: 15000, vendorName: 'LogiTrans Pvt Ltd' },
      { type: 'Customs Duty & Tariff', amount: 8500, vendorName: 'Customs Authority' },
      { type: 'Transit Insurance', amount: 2500, vendorName: 'National Insurance' },
    ],
    totalCharges: 26000,
    items: [
      { itemId: 'itm_001', itemName: 'Steel Sheets (Grade A)', receivedQty: 498, purchaseRate: 850, purchaseAmount: 423300, allocatedCost: 26000, landedCostPerUnit: 902.21 },
    ],
    status: 'posted',
    postedAt: '2026-08-11T10:30:00.000Z',
    postedBy: 'Priya Nair',
    createdAt: '2026-08-11T09:00:00.000Z',
  },
  {
    voucherNumber: 'LCV-2026-002',
    grnId: 'grn_002',
    grnNumber: 'GRN-2026-002',
    allocationBasis: 'quantity',
    charges: [
      { type: 'Express Freight', amount: 7200, vendorName: 'SpeedAir Cargo' },
      { type: 'Port Handling & Demurrage', amount: 3800, vendorName: 'Port Logistics' },
    ],
    totalCharges: 11000,
    items: [
      { itemId: 'itm_002', itemName: 'Copper Wiring (50m roll)', receivedQty: 180, purchaseRate: 1000, purchaseAmount: 180000, allocatedCost: 11000, landedCostPerUnit: 1061.11 },
    ],
    status: 'posted',
    postedAt: '2026-08-19T14:15:00.000Z',
    postedBy: 'Rajesh Kumar',
    createdAt: '2026-08-19T11:00:00.000Z',
  },
];

router.use(requireAuth);

// GET /api/procurement/landed-costs — list all landed cost vouchers
router.get('/', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  let rows = await db.all(tid, COL.vouchers);

  if (rows.length === 0) {
    for (const v of DEFAULT_VOUCHERS) {
      await db.insert(tid, COL.vouchers, { id: await db.nextId('lcv', COL.vouchers), ...v, tenantId: tid });
    }
    rows = await db.all(tid, COL.vouchers);
  }

  if (req.query.status) {
    rows = rows.filter((r: any) => r.status === req.query.status);
  }

  res.json(listResult(rows, rows.length, 1, rows.length));
}));

// POST /api/procurement/landed-costs/calculate — preview cost allocation
router.post('/calculate', asyncHandler(async (req, res) => {
  requireBody(req.body, ['items', 'charges', 'allocationBasis']);

  const { items, charges, allocationBasis = 'value' } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw ApiError.badRequest('At least one item is required');
  if (!Array.isArray(charges) || charges.length === 0) throw ApiError.badRequest('At least one charge is required');

  const totalCharges = charges.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  const totalPurchaseAmount = items.reduce((acc: number, i: any) => acc + ((Number(i.purchaseRate) || 0) * (Number(i.receivedQty) || 0)), 0);
  const totalQty = items.reduce((acc: number, i: any) => acc + (Number(i.receivedQty) || 0), 0);

  const allocatedItems = items.map((item: any) => {
    const qty = Number(item.receivedQty) || 1;
    const rate = Number(item.purchaseRate) || 0;
    const purchaseAmount = qty * rate;

    let allocatedCost = 0;
    if (allocationBasis === 'value' && totalPurchaseAmount > 0) {
      allocatedCost = Math.round((purchaseAmount / totalPurchaseAmount) * totalCharges * 100) / 100;
    } else if (allocationBasis === 'quantity' && totalQty > 0) {
      allocatedCost = Math.round((qty / totalQty) * totalCharges * 100) / 100;
    }

    const landedCostPerUnit = Math.round((rate + (allocatedCost / qty)) * 100) / 100;

    return {
      itemId: item.itemId || item.id,
      itemName: item.itemName || item.name,
      receivedQty: qty,
      purchaseRate: rate,
      purchaseAmount,
      allocatedCost,
      landedCostPerUnit,
      unitCostIncreasePct: rate > 0 ? Math.round(((landedCostPerUnit - rate) / rate) * 1000) / 10 : 0,
    };
  });

  res.json({
    allocationBasis,
    totalCharges,
    totalPurchaseAmount,
    totalQty,
    allocatedItems,
  });
}));

// POST /api/procurement/landed-costs — create a landed cost voucher
router.post('/', requireRole('manager', 'finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['grnId', 'allocationBasis', 'charges', 'items']);

  const { grnId, allocationBasis, charges, items } = req.body;
  const grn = await db.byId(tid, COL.grns, grnId);
  const voucherNumber = await db.nextId('LCV', COL.vouchers);

  const totalCharges = charges.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  const totalPurchaseAmount = items.reduce((acc: number, i: any) => acc + ((Number(i.purchaseRate) || 0) * (Number(i.receivedQty) || 0)), 0);
  const totalQty = items.reduce((acc: number, i: any) => acc + (Number(i.receivedQty) || 0), 0);

  const allocatedItems = items.map((item: any) => {
    const qty = Number(item.receivedQty) || 1;
    const rate = Number(item.purchaseRate) || 0;
    const purchaseAmount = qty * rate;

    let allocatedCost = 0;
    if (allocationBasis === 'value' && totalPurchaseAmount > 0) {
      allocatedCost = Math.round((purchaseAmount / totalPurchaseAmount) * totalCharges * 100) / 100;
    } else if (allocationBasis === 'quantity' && totalQty > 0) {
      allocatedCost = Math.round((qty / totalQty) * totalCharges * 100) / 100;
    }

    const landedCostPerUnit = Math.round((rate + (allocatedCost / qty)) * 100) / 100;

    return {
      itemId: item.itemId || item.id,
      itemName: item.itemName || item.name,
      receivedQty: qty,
      purchaseRate: rate,
      purchaseAmount,
      allocatedCost,
      landedCostPerUnit,
    };
  });

  const voucher = await db.insert(tid, COL.vouchers, {
    voucherNumber,
    grnId,
    grnNumber: grn?.number || `GRN-${grnId}`,
    allocationBasis,
    charges,
    totalCharges,
    items: allocatedItems,
    status: 'draft',
    createdAt: new Date().toISOString(),
  });

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'create',
    module: 'procurement',
    recordRef: voucherNumber,
    newState: { voucherNumber, totalCharges, status: 'draft' },
    ip: req.ip,
  });

  res.status(201).json(voucher);
}));

// POST /api/procurement/landed-costs/:id/post — post voucher to update inventory valuation
router.post('/:id/post', requireRole('manager', 'finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const voucher = await db.byId(tid, COL.vouchers, req.params.id);
  if (!voucher) throw ApiError.notFound('Landed Cost Voucher not found');
  if (voucher.status === 'posted') throw ApiError.badRequest('Voucher is already posted');

  const a = actor(req);
  const updated = await db.update(tid, COL.vouchers, voucher.id, {
    status: 'posted',
    postedAt: new Date().toISOString(),
    postedBy: a.name,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'post',
    module: 'procurement',
    recordRef: voucher.voucherNumber,
    newState: { status: 'posted', totalCharges: voucher.totalCharges },
    ip: req.ip,
  });

  res.json({
    voucher: updated,
    message: `Landed Cost Voucher ${voucher.voucherNumber} posted successfully. Inventory unit valuation updated with ₹${voucher.totalCharges.toLocaleString('en-IN')} in freight and duty additions.`,
  });
}));

export const landedCostRouter = router;
