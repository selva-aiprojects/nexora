import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, requireRole, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';

const COL = {
  vendors: 'procurement_vendors',
  vendorQuotes: 'procurement_vendor_quotes',
  contracts: 'procurement_contracts',
  grns: 'procurement_grns',
};

db.seed(COL.vendors, [
  { id: 'ven_001', tenantId: TID, name: 'Steel Corp', gstin: '29ABCDE1234F1Z5', category: 'raw_material', rating: 4.5, paymentTerms: 'Net 30', status: 'active', createdAt: '2026-01-10' },
  { id: 'ven_002', tenantId: TID, name: 'Copper Ltd', gstin: '27XYZAB5678G2H3', category: 'raw_material', rating: 4.2, paymentTerms: 'Net 45', status: 'active', createdAt: '2026-02-15' },
  { id: 'ven_003', tenantId: TID, name: 'Packaging Pro', gstin: '06PQRST9012I3J4', category: 'packaging', rating: 3.8, paymentTerms: 'Net 15', status: 'active', createdAt: '2026-03-20' },
]);

db.seed(COL.vendorQuotes, [
  { id: 'vq_001', tenantId: TID, vendorId: 'ven_001', number: 'VQ-2026-001', date: '2026-08-01', validUntil: '2026-08-15', status: 'accepted', total: 420000, currency: 'INR' },
  { id: 'vq_002', tenantId: TID, vendorId: 'ven_002', number: 'VQ-2026-002', date: '2026-08-05', validUntil: '2026-08-19', status: 'sent', total: 180000, currency: 'INR' },
]);

db.seed(COL.contracts, [
  { id: 'con_001', tenantId: TID, vendorId: 'ven_001', number: 'CON-2026-001', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', value: 500000, terms: 'Net 30, quality assurance clause' },
  { id: 'con_002', tenantId: TID, vendorId: 'ven_002', number: 'CON-2026-002', startDate: '2026-02-01', endDate: '2026-07-31', status: 'expired', value: 200000, terms: 'Net 45' },
]);

db.seed(COL.grns, [
  { id: 'grn_001', tenantId: TID, poId: 'po_0001', vendorId: 'ven_001', number: 'GRN-2026-001', date: '2026-08-10', qty: 500, acceptedQty: 498, rejectedQty: 2, remarks: '2 kg damaged', status: 'accepted' },
]);

// Vendors
router.get('/vendors', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.vendors);
  if (req.query.status) rows = rows.filter((v) => v.status === req.query.status);
  if (req.query.category) rows = rows.filter((v) => v.category === req.query.category);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/vendors', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'category']);
  const row = db.insert(TID, COL.vendors, { id: db.nextId('ven', COL.vendors), createdAt: new Date().toISOString().slice(0, 10), ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'procurement', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.get('/vendors/:id', requireAuth, asyncHandler(async (req, res) => {
  const vendor = notFoundIfUndefined(db.byId(TID, COL.vendors, req.params.id), 'Vendor not found');
  res.json(vendor);
}));
router.put('/vendors/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.vendors, req.params.id), 'Vendor not found');
  const updated = db.update(TID, COL.vendors, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'procurement', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));

// Vendor Quotes
router.get('/vendor-quotes', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.vendorQuotes);
  if (req.query.status) rows = rows.filter((q) => q.status === req.query.status);
  if (req.query.vendorId) rows = rows.filter((q) => q.vendorId === req.query.vendorId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/vendor-quotes', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['vendorId', 'number', 'date', 'validUntil', 'total']);
  const row = db.insert(TID, COL.vendorQuotes, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'procurement', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.put('/vendor-quotes/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.vendorQuotes, req.params.id), 'Vendor quote not found');
  const updated = db.update(TID, COL.vendorQuotes, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'procurement', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));

// Contracts
router.get('/contracts', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.contracts);
  if (req.query.status) rows = rows.filter((c) => c.status === req.query.status);
  if (req.query.vendorId) rows = rows.filter((c) => c.vendorId === req.query.vendorId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/contracts', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['vendorId', 'number', 'startDate', 'endDate', 'value']);
  const row = db.insert(TID, COL.contracts, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'procurement', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.put('/contracts/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.contracts, req.params.id), 'Contract not found');
  const updated = db.update(TID, COL.contracts, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'procurement', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));

// GRNs
router.get('/grns', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.grns);
  if (req.query.poId) rows = rows.filter((g) => g.poId === req.query.poId);
  if (req.query.status) rows = rows.filter((g) => g.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/grns', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['poId', 'vendorId', 'number', 'date', 'qty', 'acceptedQty', 'rejectedQty']);
  const row = db.insert(TID, COL.grns, { id: db.nextId('grn', COL.grns), ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'procurement', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.put('/grns/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.grns, req.params.id), 'GRN not found');
  const updated = db.update(TID, COL.grns, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'procurement', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));

export default router;
