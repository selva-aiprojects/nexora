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
  { id: 'ven_004', tenantId: TID, name: 'Electrical Solutions', gstin: '29LMNOP5678Q9R0', category: 'electrical', rating: 4.0, paymentTerms: 'Net 30', status: 'active', createdAt: '2026-04-05' },
  { id: 'ven_005', tenantId: TID, name: 'Fastener Tech', gstin: '24ABCDE1234F1Z5', category: 'hardware', rating: 3.9, paymentTerms: 'Net 15', status: 'active', createdAt: '2026-05-12' },
  { id: 'ven_006', tenantId: TID, name: 'Safety Gear India', gstin: '27XYZAB5678G2H3', category: 'safety', rating: 4.1, paymentTerms: 'Net 30', status: 'active', createdAt: '2026-06-08' },
  { id: 'ven_007', tenantId: TID, name: 'LogiTrans Pvt Ltd', gstin: '06PQRST9012I3J4', category: 'logistics', rating: 3.7, paymentTerms: 'Net 45', status: 'active', createdAt: '2026-07-14' },
  { id: 'ven_008', tenantId: TID, name: 'ChemSuppliers', gstin: '29LMNOP5678Q9R0', category: 'chemicals', rating: 4.3, paymentTerms: 'Net 30', status: 'inactive', createdAt: '2026-08-02' },
]);

db.seed(COL.vendorQuotes, [
  { id: 'vq_001', tenantId: TID, vendorId: 'ven_001', number: 'VQ-2026-001', date: '2026-08-01', validUntil: '2026-08-15', status: 'accepted', total: 420000, currency: 'INR' },
  { id: 'vq_002', tenantId: TID, vendorId: 'ven_002', number: 'VQ-2026-002', date: '2026-08-05', validUntil: '2026-08-19', status: 'sent', total: 180000, currency: 'INR' },
  { id: 'vq_003', tenantId: TID, vendorId: 'ven_001', number: 'VQ-2026-003', date: '2026-03-10', validUntil: '2026-03-25', status: 'accepted', total: 350000, currency: 'INR' },
  { id: 'vq_004', tenantId: TID, vendorId: 'ven_004', number: 'VQ-2026-004', date: '2026-04-05', validUntil: '2026-04-20', status: 'rejected', total: 125000, currency: 'INR' },
  { id: 'vq_005', tenantId: TID, vendorId: 'ven_003', number: 'VQ-2026-005', date: '2026-05-15', validUntil: '2026-05-30', status: 'accepted', total: 85000, currency: 'INR' },
  { id: 'vq_006', tenantId: TID, vendorId: 'ven_005', number: 'VQ-2026-006', date: '2026-06-20', validUntil: '2026-07-05', status: 'accepted', total: 52000, currency: 'INR' },
  { id: 'vq_007', tenantId: TID, vendorId: 'ven_006', number: 'VQ-2026-007', date: '2026-07-10', validUntil: '2026-07-25', status: 'sent', total: 78000, currency: 'INR' },
  { id: 'vq_008', tenantId: TID, vendorId: 'ven_004', number: 'VQ-2026-008', date: '2026-08-08', validUntil: '2026-08-22', status: 'sent', total: 195000, currency: 'INR' },
  { id: 'vq_009', tenantId: TID, vendorId: 'ven_001', number: 'VQ-2026-009', date: '2026-06-05', validUntil: '2026-06-20', status: 'accepted', total: 410000, currency: 'INR' },
  { id: 'vq_010', tenantId: TID, vendorId: 'ven_002', number: 'VQ-2026-010', date: '2026-03-25', validUntil: '2026-04-10', status: 'accepted', total: 220000, currency: 'INR' },
]);

db.seed(COL.contracts, [
  { id: 'con_001', tenantId: TID, vendorId: 'ven_001', number: 'CON-2026-001', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', value: 500000, terms: 'Net 30, quality assurance clause' },
  { id: 'con_002', tenantId: TID, vendorId: 'ven_002', number: 'CON-2026-002', startDate: '2026-02-01', endDate: '2026-07-31', status: 'expired', value: 200000, terms: 'Net 45' },
  { id: 'con_003', tenantId: TID, vendorId: 'ven_003', number: 'CON-2026-003', startDate: '2026-03-15', endDate: '2027-03-14', status: 'active', value: 120000, terms: 'Net 15, volume discount' },
  { id: 'con_004', tenantId: TID, vendorId: 'ven_004', number: 'CON-2026-004', startDate: '2026-04-01', endDate: '2026-12-31', status: 'active', value: 280000, terms: 'Net 30, warranty 12 months' },
  { id: 'con_005', tenantId: TID, vendorId: 'ven_005', number: 'CON-2026-005', startDate: '2026-05-01', endDate: '2027-04-30', status: 'active', value: 95000, terms: 'Net 15' },
  { id: 'con_006', tenantId: TID, vendorId: 'ven_001', number: 'CON-2026-006', startDate: '2026-06-01', endDate: '2027-05-31', status: 'active', value: 600000, terms: 'Net 30, quarterly review' },
]);

db.seed(COL.grns, [
  { id: 'grn_001', tenantId: TID, poId: 'po_0001', vendorId: 'ven_001', number: 'GRN-2026-001', date: '2026-08-10', qty: 500, acceptedQty: 498, rejectedQty: 2, remarks: '2 kg damaged', status: 'accepted' },
  { id: 'grn_002', tenantId: TID, poId: 'po_0002', vendorId: 'ven_002', number: 'GRN-2026-002', date: '2026-08-18', qty: 180, acceptedQty: 180, rejectedQty: 0, remarks: 'Clean receipt', status: 'accepted' },
  { id: 'grn_003', tenantId: TID, poId: 'po_0003', vendorId: 'ven_001', number: 'GRN-2026-003', date: '2026-07-25', qty: 400, acceptedQty: 395, rejectedQty: 5, remarks: '5 coils rusted', status: 'accepted' },
  { id: 'grn_004', tenantId: TID, poId: 'po_0005', vendorId: 'ven_001', number: 'GRN-2026-004', date: '2026-07-10', qty: 150, acceptedQty: 150, rejectedQty: 0, remarks: 'All good', status: 'accepted' },
  { id: 'grn_005', tenantId: TID, poId: 'po_0001', vendorId: 'ven_001', number: 'GRN-2026-005', date: '2026-06-05', qty: 300, acceptedQty: 298, rejectedQty: 2, remarks: 'Minor dent', status: 'accepted' },
  { id: 'grn_006', tenantId: TID, poId: 'po_0002', vendorId: 'ven_002', number: 'GRN-2026-006', date: '2026-06-22', qty: 120, acceptedQty: 120, rejectedQty: 0, remarks: 'Full qty received', status: 'accepted' },
  { id: 'grn_007', tenantId: TID, poId: 'po_0004', vendorId: 'ven_004', number: 'GRN-2026-007', date: '2026-05-15', qty: 300, acceptedQty: 295, rejectedQty: 5, remarks: 'Quality deviation', status: 'pending' },
  { id: 'grn_008', tenantId: TID, poId: 'po_0003', vendorId: 'ven_001', number: 'GRN-2026-008', date: '2026-05-02', qty: 250, acceptedQty: 250, rejectedQty: 0, remarks: 'Perfect', status: 'accepted' },
  { id: 'grn_009', tenantId: TID, poId: 'po_0005', vendorId: 'ven_001', number: 'GRN-2026-009', date: '2026-04-10', qty: 100, acceptedQty: 98, rejectedQty: 2, remarks: '2 units defective', status: 'accepted' },
  { id: 'grn_010', tenantId: TID, poId: 'po_0002', vendorId: 'ven_002', number: 'GRN-2026-010', date: '2026-03-20', qty: 200, acceptedQty: 200, rejectedQty: 0, remarks: 'On time delivery', status: 'accepted' },
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
