import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody, listResult } from '../core/http.js';
import { requireAuth, requireRole, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const COL = {
  stock: 'inventory_stock',
  items: 'manufacturing_items',
  warehouses: 'inventory_warehouses',
  autoPrs: 'inventory_auto_prs',
};

// Seed inventory items for ROP simulation if missing
const DEFAULT_ITEMS = [
  { id: 'itm_001', name: 'Steel Sheets (Grade A)', sku: 'STL-SHT-01', category: 'Raw Material', currentStock: 45, avgDailyDemand: 8, leadTimeDays: 7, safetyStock: 20, unitCost: 850, preferredVendor: 'Steel Corp', vendorId: 'ven_001' },
  { id: 'itm_002', name: 'Copper Wiring (50m roll)', sku: 'CPR-WIR-02', category: 'Raw Material', currentStock: 12, avgDailyDemand: 5, leadTimeDays: 10, safetyStock: 25, unitCost: 1000, preferredVendor: 'Copper Ltd', vendorId: 'ven_002' },
  { id: 'itm_003', name: 'Alloy Fasteners (Pack 100)', sku: 'FST-ALL-03', category: 'Hardware', currentStock: 80, avgDailyDemand: 10, leadTimeDays: 4, safetyStock: 30, unitCost: 120, preferredVendor: 'Fastener Tech', vendorId: 'ven_005' },
  { id: 'itm_004', name: 'Electrical Relays 24V', sku: 'ELC-RLY-04', category: 'Electrical', currentStock: 8, avgDailyDemand: 3, leadTimeDays: 14, safetyStock: 15, unitCost: 450, preferredVendor: 'Electrical Solutions', vendorId: 'ven_004' },
  { id: 'itm_005', name: 'Heavy Packaging Boxes', sku: 'PKG-BOX-05', category: 'Packaging', currentStock: 250, avgDailyDemand: 25, leadTimeDays: 3, safetyStock: 50, unitCost: 35, preferredVendor: 'Packaging Pro', vendorId: 'ven_003' },
  { id: 'itm_006', name: 'Industrial Safety Gloves', sku: 'SFT-GLV-06', category: 'Safety', currentStock: 5, avgDailyDemand: 4, leadTimeDays: 5, safetyStock: 20, unitCost: 180, preferredVendor: 'Safety Gear India', vendorId: 'ven_006' },
];

router.use(requireAuth);

// GET /api/inventory/reorder/analysis — dynamic ROP analysis for all items
router.get('/analysis', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  let items = await db.all(tid, COL.items);

  if (items.length === 0) {
    items = DEFAULT_ITEMS;
  }

  const analysis = items.map((item: any) => {
    const currentStock = Number(item.currentStock) || 0;
    const avgDailyDemand = Number(item.avgDailyDemand) || 5;
    const leadTimeDays = Number(item.leadTimeDays) || 7;
    const safetyStock = Number(item.safetyStock) || 15;
    const unitCost = Number(item.unitCost) || 500;

    // Standard Supply Chain Reorder Point Formula: ROP = (Daily Demand * Lead Time) + Safety Stock
    const leadTimeDemand = avgDailyDemand * leadTimeDays;
    const rop = leadTimeDemand + safetyStock;

    // Economic Order Quantity approximation: EOQ = sqrt((2 * Annual Demand * Order Cost) / Holding Cost)
    const annualDemand = avgDailyDemand * 300;
    const orderCost = 1500;
    const holdingCost = Math.max(1, unitCost * 0.15);
    const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));

    // Suggested Order Quantity
    const shortfall = Math.max(0, rop - currentStock);
    const suggestedOrderQty = shortfall > 0 ? Math.max(eoq, (rop * 2) - currentStock) : 0;
    const estimatedOrderValue = Math.round(suggestedOrderQty * unitCost);

    let status: 'critical_stockout' | 'reorder_needed' | 'healthy' = 'healthy';
    if (currentStock <= 0) {
      status = 'critical_stockout';
    } else if (currentStock <= rop) {
      status = 'reorder_needed';
    }

    const daysOfInventory = avgDailyDemand > 0 ? Math.round((currentStock / avgDailyDemand) * 10) / 10 : 0;

    return {
      id: item.id,
      name: item.name,
      sku: item.sku || `SKU-${item.id}`,
      category: item.category || 'General',
      currentStock,
      avgDailyDemand,
      leadTimeDays,
      safetyStock,
      leadTimeDemand,
      rop,
      eoq,
      shortfall,
      suggestedOrderQty,
      unitCost,
      estimatedOrderValue,
      status,
      daysOfInventory,
      preferredVendor: item.preferredVendor || 'Approved Vendor',
      vendorId: item.vendorId || 'ven_001',
    };
  });

  const totalItems = analysis.length;
  const reorderNeeded = analysis.filter(a => a.status === 'reorder_needed').length;
  const criticalStockout = analysis.filter(a => a.status === 'critical_stockout').length;
  const healthy = analysis.filter(a => a.status === 'healthy').length;
  const totalSuggestedOrderValue = analysis.reduce((sum, a) => sum + a.estimatedOrderValue, 0);

  res.json({
    metrics: {
      totalItems,
      reorderNeeded,
      criticalStockout,
      healthy,
      totalSuggestedOrderValue,
    },
    items: analysis.sort((a, b) => {
      const priority = { critical_stockout: 0, reorder_needed: 1, healthy: 2 };
      return priority[a.status] - priority[b.status];
    }),
  });
}));

// POST /api/inventory/reorder/generate-prs — 1-click batch purchase requisition generator
router.post('/generate-prs', requireRole('manager', 'admin', 'owner', 'finance'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const { selectedItemIds } = req.body;

  let items = await db.all(tid, COL.items);
  if (items.length === 0) items = DEFAULT_ITEMS;

  const candidateItems = items.filter((item: any) => {
    if (selectedItemIds && Array.isArray(selectedItemIds)) {
      return selectedItemIds.includes(item.id);
    }
    const currentStock = Number(item.currentStock) || 0;
    const avgDailyDemand = Number(item.avgDailyDemand) || 5;
    const leadTimeDays = Number(item.leadTimeDays) || 7;
    const safetyStock = Number(item.safetyStock) || 15;
    const rop = (avgDailyDemand * leadTimeDays) + safetyStock;
    return currentStock <= rop;
  });

  if (candidateItems.length === 0) {
    return res.json({
      createdPrs: [],
      message: 'All inventory items are currently above their Reorder Point. No Purchase Requisitions needed.',
    });
  }

  const createdPrs = [];
  for (const item of candidateItems) {
    const currentStock = Number(item.currentStock) || 0;
    const avgDailyDemand = Number(item.avgDailyDemand) || 5;
    const leadTimeDays = Number(item.leadTimeDays) || 7;
    const safetyStock = Number(item.safetyStock) || 15;
    const unitCost = Number(item.unitCost) || 500;
    const rop = (avgDailyDemand * leadTimeDays) + safetyStock;

    const annualDemand = avgDailyDemand * 300;
    const orderCost = 1500;
    const holdingCost = Math.max(1, unitCost * 0.15);
    const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));

    const qty = Math.max(eoq, (rop * 2) - currentStock);
    const prNumber = await db.nextId('PR', COL.autoPrs);

    const pr = await db.insert(tid, COL.autoPrs, {
      prNumber,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku || `SKU-${item.id}`,
      requiredQty: qty,
      estimatedUnitCost: unitCost,
      estimatedTotal: qty * unitCost,
      vendorName: item.preferredVendor || 'Approved Vendor',
      vendorId: item.vendorId || 'ven_001',
      triggerReason: `Stock (${currentStock}) fell below ROP (${rop})`,
      status: 'pending_approval',
      requestedBy: 'System Auto-ROP Engine',
      requestedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });

    createdPrs.push(pr);
  }

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'create',
    module: 'inventory',
    recordRef: `BATCH-ROP-${createdPrs.length}`,
    newState: { generatedPrCount: createdPrs.length },
    ip: req.ip,
  });

  res.status(201).json({
    createdCount: createdPrs.length,
    prs: createdPrs,
    message: `Generated ${createdPrs.length} Purchase Requisitions based on dynamic ROP analysis.`,
  });
}));

// GET /api/inventory/reorder/requisitions — list generated PRs
router.get('/requisitions', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  let rows = await db.all(tid, COL.autoPrs);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

export const reorderRouter = router;
