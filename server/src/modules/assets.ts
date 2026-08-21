import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const COL = {
  assets: 'asset_registers',
  depreciations: 'asset_depreciations',
};

const CATEGORIES = [
  'Machinery & Equipment',
  'IT & Hardware',
  'Vehicles',
  'Furniture & Fixtures',
  'Buildings & Infrastructure',
  'Tools & Fixtures',
];

const DEPRECIATION_METHODS = ['SLM', 'WDV'];
const ASSET_STATUSES = ['active', 'disposed', 'written_off', 'under_maintenance'];

router.use(requireAuth);

// GET /api/assets — list all assets with summary KPIs
router.get('/', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  const tid = tenantId(req);

  let rows = await db.all(tid, COL.assets);

  if (req.query.category) {
    rows = rows.filter((r: any) => r.category === req.query.category);
  }
  if (req.query.status) {
    rows = rows.filter((r: any) => r.status === req.query.status);
  }
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();
    rows = rows.filter((r: any) =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.assetNumber && r.assetNumber.toLowerCase().includes(q)) ||
      (r.serialNumber && r.serialNumber.toLowerCase().includes(q)) ||
      (r.location && r.location.toLowerCase().includes(q))
    );
  }

  // Calculate summary metrics across all tenant assets
  const allAssets = await db.all(tid, COL.assets);
  const totalCost = allAssets.reduce((acc, a) => acc + (Number(a.purchaseCost) || 0), 0);
  const totalAccumulatedDepreciation = allAssets.reduce((acc, a) => acc + (Number(a.accumulatedDepreciation) || 0), 0);
  const totalBookValue = allAssets.reduce((acc, a) => acc + (Number(a.bookValue) || 0), 0);

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paginated = rows.slice(start, start + pageSize);

  const result: any = listResult(paginated, total, page, pageSize);
  result.metrics = {
    totalAssets: allAssets.length,
    activeAssets: allAssets.filter(a => a.status === 'active').length,
    totalCost,
    totalAccumulatedDepreciation,
    totalBookValue,
  };

  res.json(result);
}));

// GET /api/assets/:id — asset details with depreciation history
router.get('/:id', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const asset = await db.byId(tid, COL.assets, req.params.id);
  notFoundIfUndefined(asset, 'Asset not found');

  const allDepreciations = await db.all(tid, COL.depreciations);
  const history = allDepreciations.filter((d: any) => d.assetId === req.params.id);

  res.json({
    ...asset,
    depreciationHistory: history.sort((a: any, b: any) => new Date(b.periodDate).getTime() - new Date(a.periodDate).getTime()),
  });
}));

// POST /api/assets — capitalize a new fixed asset
router.post('/', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['name', 'category', 'purchaseCost', 'usefulLifeMonths']);

  const {
    name,
    category,
    purchaseDate,
    purchaseCost,
    salvageValue = 0,
    usefulLifeMonths,
    depreciationMethod = 'SLM',
    depreciationRate = 0,
    serialNumber = '',
    location = 'Main Facility',
    costCenter = 'Operations',
    vendor = '',
    warrantyExpiry = '',
  } = req.body;

  if (!CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Invalid category. Allowed: ${CATEGORIES.join(', ')}`);
  }

  const cost = Number(purchaseCost);
  const salvage = Number(salvageValue) || 0;
  const months = Number(usefulLifeMonths);

  if (cost <= 0) throw ApiError.badRequest('Purchase cost must be greater than zero');
  if (months <= 0) throw ApiError.badRequest('Useful life in months must be greater than zero');

  const assetNumber = await db.nextId('AST', COL.assets);

  const newAsset = {
    assetNumber,
    name,
    category,
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    purchaseCost: cost,
    salvageValue: salvage,
    usefulLifeMonths: months,
    depreciationMethod: DEPRECIATION_METHODS.includes(depreciationMethod) ? depreciationMethod : 'SLM',
    depreciationRate: Number(depreciationRate) || (depreciationMethod === 'SLM' ? (100 / (months / 12)) : 15),
    accumulatedDepreciation: 0,
    bookValue: cost,
    status: 'active',
    serialNumber,
    location,
    costCenter,
    vendor,
    warrantyExpiry,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const asset = await db.insert(tid, COL.assets, newAsset);

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'create',
    module: 'assets',
    recordRef: asset.assetNumber,
    newState: { assetNumber: asset.assetNumber, name: asset.name, purchaseCost: cost },
    ip: req.ip,
  });

  res.status(201).json(asset);
}));

// POST /api/assets/:id/depreciate — run monthly depreciation on an asset
router.post('/:id/depreciate', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const asset = await db.byId(tid, COL.assets, req.params.id);
  notFoundIfUndefined(asset, 'Asset not found');

  if (asset.status !== 'active') {
    throw ApiError.badRequest(`Cannot depreciate asset with status '${asset.status}'`);
  }

  if (asset.bookValue <= asset.salvageValue) {
    throw ApiError.badRequest('Asset has reached or fallen below salvage value. No further depreciation allowed.');
  }

  let depAmount = 0;
  if (asset.depreciationMethod === 'SLM') {
    const depreciableBase = asset.purchaseCost - asset.salvageValue;
    depAmount = Math.round((depreciableBase / asset.usefulLifeMonths) * 100) / 100;
  } else {
    // WDV method monthly
    const annualRate = (asset.depreciationRate || 15) / 100;
    depAmount = Math.round((asset.bookValue * (annualRate / 12)) * 100) / 100;
  }

  // Prevent depreciating below salvage value
  if (asset.bookValue - depAmount < asset.salvageValue) {
    depAmount = Math.max(0, asset.bookValue - asset.salvageValue);
  }

  const newAccDep = Math.round((asset.accumulatedDepreciation + depAmount) * 100) / 100;
  const newBookValue = Math.round((asset.purchaseCost - newAccDep) * 100) / 100;

  const periodDate = req.body.periodDate || new Date().toISOString().split('T')[0];

  const depEntry = await db.insert(tid, COL.depreciations, {
    assetId: asset.id,
    assetNumber: asset.assetNumber,
    assetName: asset.name,
    periodDate,
    amount: depAmount,
    accumulatedDepreciation: newAccDep,
    bookValue: newBookValue,
    journalRef: `JRN-DEP-${asset.assetNumber}-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
  });

  const updatedAsset = await db.update(tid, COL.assets, asset.id, {
    accumulatedDepreciation: newAccDep,
    bookValue: newBookValue,
    lastDepreciationDate: periodDate,
    updatedAt: new Date().toISOString(),
  });

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'update',
    module: 'assets',
    recordRef: asset.assetNumber,
    newState: { event: 'depreciation_run', amount: depAmount, newBookValue },
    ip: req.ip,
  });

  res.json({
    asset: updatedAsset,
    depreciation: depEntry,
    message: `Depreciation of ₹${depAmount.toLocaleString('en-IN')} successfully applied.`,
  });
}));

// POST /api/assets/batch-depreciate — batch run monthly depreciation across all active assets
router.post('/batch-depreciate', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const periodDate = req.body.periodDate || new Date().toISOString().split('T')[0];
  const allAssets = await db.all(tid, COL.assets);
  const activeAssets = allAssets.filter((a: any) => a.status === 'active' && a.bookValue > a.salvageValue);

  const results: any[] = [];
  let totalBatchAmount = 0;

  for (const asset of activeAssets) {
    let depAmount = 0;
    if (asset.depreciationMethod === 'SLM') {
      const depreciableBase = asset.purchaseCost - asset.salvageValue;
      depAmount = Math.round((depreciableBase / asset.usefulLifeMonths) * 100) / 100;
    } else {
      const annualRate = (asset.depreciationRate || 15) / 100;
      depAmount = Math.round((asset.bookValue * (annualRate / 12)) * 100) / 100;
    }

    if (asset.bookValue - depAmount < asset.salvageValue) {
      depAmount = Math.max(0, asset.bookValue - asset.salvageValue);
    }

    if (depAmount > 0) {
      const newAccDep = Math.round((asset.accumulatedDepreciation + depAmount) * 100) / 100;
      const newBookValue = Math.round((asset.purchaseCost - newAccDep) * 100) / 100;

      await db.insert(tid, COL.depreciations, {
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        periodDate,
        amount: depAmount,
        accumulatedDepreciation: newAccDep,
        bookValue: newBookValue,
        journalRef: `JRN-DEP-${asset.assetNumber}-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      });

      await db.update(tid, COL.assets, asset.id, {
        accumulatedDepreciation: newAccDep,
        bookValue: newBookValue,
        lastDepreciationDate: periodDate,
        updatedAt: new Date().toISOString(),
      });

      totalBatchAmount += depAmount;
      results.push({ assetId: asset.id, assetNumber: asset.assetNumber, name: asset.name, amount: depAmount, newBookValue });
    }
  }

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'update',
    module: 'assets',
    recordRef: 'batch',
    newState: { event: 'batch_depreciation', processedCount: results.length, totalAmount: totalBatchAmount, periodDate },
    ip: req.ip,
  });

  res.json({
    periodDate,
    processedCount: results.length,
    totalDepreciationAmount: totalBatchAmount,
    assets: results,
    message: `Batch depreciation completed for ${results.length} assets. Total: ₹${totalBatchAmount.toLocaleString('en-IN')}`,
  });
}));

// POST /api/assets/:id/dispose — dispose or write off asset
router.post('/:id/dispose', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const asset = await db.byId(tid, COL.assets, req.params.id);
  notFoundIfUndefined(asset, 'Asset not found');

  const { saleProceeds = 0, disposalDate = new Date().toISOString().split('T')[0], reason = 'Scrapped' } = req.body;
  const proceeds = Number(saleProceeds) || 0;
  const gainOrLoss = proceeds - asset.bookValue;

  const updatedAsset = await db.update(tid, COL.assets, asset.id, {
    status: proceeds > 0 ? 'disposed' : 'written_off',
    disposalDate,
    saleProceeds: proceeds,
    gainOrLoss,
    disposalReason: reason,
    bookValue: 0,
    updatedAt: new Date().toISOString(),
  });

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'update',
    module: 'assets',
    recordRef: asset.assetNumber,
    newState: { event: 'asset_disposed', saleProceeds: proceeds, gainOrLoss, reason },
    ip: req.ip,
  });

  res.json({
    asset: updatedAsset,
    gainOrLoss,
    message: `Asset successfully ${proceeds > 0 ? 'disposed' : 'written off'}. Gain/Loss: ₹${gainOrLoss.toLocaleString('en-IN')}`,
  });
}));

// DELETE /api/assets/:id — delete asset
router.delete('/:id', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const asset = await db.byId(tid, COL.assets, req.params.id);
  notFoundIfUndefined(asset, 'Asset not found');

  await db.remove(tid, COL.assets, req.params.id);

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'delete',
    module: 'assets',
    recordRef: asset.assetNumber,
    newState: { assetNumber: asset.assetNumber, name: asset.name },
    ip: req.ip,
  });

  res.json({ message: 'Asset removed successfully' });
}));

export const assetsRouter = router;
