import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, requireRole, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = {
  categories: 'compliance_categories',
  obligations: 'compliance_obligations',
  deadlines: 'compliance_deadlines',
  filings: 'compliance_filings',
  evidence: 'compliance_evidence',
};

// ----------------------------- Seed data -----------------------------
db.seed(COL.categories, [
  { id: 'cmp_tax', tenantId: TID, name: 'Tax', type: 'tax' },
  { id: 'cmp_corp', tenantId: TID, name: 'Corporate', type: 'corporate' },
  { id: 'cmp_lab', tenantId: TID, name: 'Labour', type: 'labour' },
  { id: 'cmp_fac', tenantId: TID, name: 'Factory', type: 'factory' },
]);
db.seed(COL.obligations, [
  { id: 'obl_001', tenantId: TID, categoryId: 'cmp_tax', name: 'GSTR-3B Filing', frequency: 'monthly', authority: 'GSTN' },
  { id: 'obl_002', tenantId: TID, categoryId: 'cmp_tax', name: 'TDS Return', frequency: 'quarterly', authority: 'Income Tax' },
  { id: 'obl_003', tenantId: TID, categoryId: 'cmp_lab', name: 'EPF Return', frequency: 'monthly', authority: 'EPFO' },
  { id: 'cmp_004', tenantId: TID, categoryId: 'cmp_fac', name: 'Factory License Renewal', frequency: 'annual', authority: 'Factory Inspectorate' },
]);
db.seed(COL.deadlines, [
  { id: 'cdl_001', tenantId: TID, obligationId: 'obl_001', dueDate: '2026-08-23', ownerId: 'usr_finance', status: 'due_soon' },
  { id: 'cdl_002', tenantId: TID, obligationId: 'obl_003', dueDate: '2026-09-05', ownerId: 'usr_hr', status: 'upcoming' },
  { id: 'cdl_003', tenantId: TID, obligationId: 'cmp_004', dueDate: '2026-07-30', ownerId: 'usr_owner', status: 'overdue' },
]);
db.seed(COL.filings, [
  { id: 'cfl_001', tenantId: TID, obligationId: 'obl_001', period: '2026-07', status: 'submitted', filedOn: '2026-08-11' },
  { id: 'cfl_002', tenantId: TID, obligationId: 'obl_001', period: '2026-08', status: 'pending', filedOn: null },
]);
db.seed(COL.evidence, [
  { id: 'cve_001', tenantId: TID, filingId: 'cfl_001', fileName: 'GSTR3B_Jul2026.pdf', uploadedOn: '2026-08-11' },
]);

// ----------------------------- Routes -----------------------------
router.get('/categories', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.categories))));
router.get('/obligations', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.obligations))));
router.get('/deadlines', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.deadlines).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // recompute alert level from due date
  const today = new Date('2026-08-19');
  rows = rows.map((d) => {
    const days = Math.floor((new Date(d.dueDate).getTime() - today.getTime()) / 86400000);
    const level = days < 0 ? 'overdue' : days <= 2 ? 'critical' : days <= 7 ? 'warning' : 'ok';
    return { ...d, daysUntilDue: days, alertLevel: level };
  });
  if (req.query.level) rows = rows.filter((r) => r.alertLevel === req.query.level);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/filings', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.filings);
  if (req.query.status) rows = rows.filter((f) => f.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/filings/:id/submit', requireAuth, requireRole('finance', 'hr', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const filing = notFoundIfUndefined(db.byId(TID, COL.filings, req.params.id), 'Filing not found');
  const updated = db.update(TID, COL.filings, filing.id, { status: 'submitted', filedOn: new Date().toISOString().slice(0, 10) });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'compliance', recordRef: filing.id, newState: { status: 'submitted' }, ip: req.ip });
  res.json(updated);
}));
router.post('/filings/:id/verify', requireAuth, requireRole('admin', 'owner'), asyncHandler(async (req, res) => {
  const filing = notFoundIfUndefined(db.byId(TID, COL.filings, req.params.id), 'Filing not found');
  const updated = db.update(TID, COL.filings, filing.id, { status: 'verified' });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'compliance', recordRef: filing.id, newState: { status: 'verified' }, ip: req.ip });
  res.json(updated);
}));
router.post('/evidence', requireAuth, asyncHandler(async (req, res) => {
  requireBody(req.body, ['filingId', 'fileName']);
  const row = db.insert(TID, COL.evidence, { id: db.nextId('cve', COL.evidence), uploadedOn: new Date().toISOString().slice(0, 10), ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'compliance', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.get('/evidence/:filingId', requireAuth, asyncHandler(async (req, res) => {
  res.json(db.query(TID, COL.evidence, (e) => e.filingId === req.params.filingId));
}));

export default router;
