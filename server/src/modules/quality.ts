import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = {
  plans: 'qc_inspection_plans',
  checks: 'qc_checks',
  ncs: 'qc_non_conformances',
};

const planStatuses = ['active', 'draft', 'archived'];
const checkStatuses = ['pending', 'passed', 'failed', 'conditional'];
const ncStatuses = ['open', 'investigating', 'resolved', 'closed'];
const severities = ['minor', 'major', 'critical'];

router.use(requireAuth);

router.get('/inspection-plans', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = db.all(tenantId(req), COL.plans);
  if (req.query.status) rows = rows.filter((r: any) => r.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));

router.get('/inspection-plans/:id', asyncHandler(async (req, res) => {
  const plan = db.byId(tenantId(req), COL.plans, req.params.id);
  res.json(notFoundIfUndefined(plan, 'Inspection plan not found'));
}));

router.post('/inspection-plans', asyncHandler(async (req, res) => {
  const { name, itemId, type, frequency, criteria, status } = req.body;
  requireBody(req.body, ['name', 'itemId', 'type', 'frequency']);
  const plan = db.insert(tenantId(req), COL.plans, {
    name, itemId, type, frequency, criteria: criteria ?? '', status: status ?? 'draft', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'quality', recordRef: plan.id, newState: plan, ip: req.ip });
  res.status(201).json(plan);
}));

router.put('/inspection-plans/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.plans, req.params.id);
  notFoundIfUndefined(existing, 'Inspection plan not found');
  const updated = db.update(tenantId(req), COL.plans, req.params.id, req.body);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'quality', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

router.delete('/inspection-plans/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.plans, req.params.id);
  notFoundIfUndefined(existing, 'Inspection plan not found');
  db.remove(tenantId(req), COL.plans, req.params.id);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'delete', module: 'quality', recordRef: req.params.id, oldState: existing, ip: req.ip });
  res.status(204).send();
}));

router.get('/checks', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = db.all(tenantId(req), COL.checks);
  if (req.query.planId) rows = rows.filter((r: any) => r.planId === req.query.planId);
  if (req.query.status) rows = rows.filter((r: any) => r.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));

router.post('/checks', asyncHandler(async (req, res) => {
  const { planId, batchId, inspectorId, date, result, remarks, status } = req.body;
  requireBody(req.body, ['planId', 'inspectorId', 'date']);
  const check = db.insert(tenantId(req), COL.checks, {
    planId, batchId: batchId ?? '', inspectorId, date, result: result ?? '', remarks: remarks ?? '', status: status ?? 'pending', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'quality', recordRef: check.id, newState: check, ip: req.ip });
  res.status(201).json(check);
}));

router.put('/checks/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.checks, req.params.id);
  notFoundIfUndefined(existing, 'QC check not found');
  const updated = db.update(tenantId(req), COL.checks, req.params.id, req.body);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'quality', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

router.get('/non-conformances', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = db.all(tenantId(req), COL.ncs);
  if (req.query.checkId) rows = rows.filter((r: any) => r.checkId === req.query.checkId);
  if (req.query.status) rows = rows.filter((r: any) => r.status === req.query.status);
  if (req.query.severity) rows = rows.filter((r: any) => r.severity === req.query.severity);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));

router.post('/non-conformances', asyncHandler(async (req, res) => {
  const { checkId, description, severity, correctiveAction, status } = req.body;
  requireBody(req.body, ['checkId', 'description', 'severity']);
  const nc = db.insert(tenantId(req), COL.ncs, {
    checkId, description, severity, correctiveAction: correctiveAction ?? '', status: status ?? 'open', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'quality', recordRef: nc.id, newState: nc, ip: req.ip });
  res.status(201).json(nc);
}));

router.put('/non-conformances/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.ncs, req.params.id);
  notFoundIfUndefined(existing, 'Non-conformance not found');
  const updated = db.update(tenantId(req), COL.ncs, req.params.id, req.body);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'quality', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

db.seed(COL.plans, [
  { id: 'qcp_0001', tenantId: TID, name: 'Incoming Material Check', itemId: 'itm_0001', type: 'incoming', frequency: 'per-batch', criteria: 'Visual, dimensions, chemical composition', status: 'active', createdAt: '2026-06-01' },
  { id: 'qcp_0002', tenantId: TID, name: 'Final Product Inspection', itemId: 'itm_0002', type: 'final', frequency: 'per-batch', criteria: 'Functional test, packaging, label', status: 'active', createdAt: '2026-06-01' },
]);

db.seed(COL.checks, [
  { id: 'qch_0001', tenantId: TID, planId: 'qcp_0001', batchId: 'BTH-2026-089', inspectorId: 'emp_003', date: '2026-08-15', result: 'passed', remarks: 'All parameters within limits', status: 'passed', createdAt: '2026-08-15' },
  { id: 'qch_0002', tenantId: TID, planId: 'qcp_0001', batchId: 'BTH-2026-090', inspectorId: 'emp_003', date: '2026-08-16', result: 'failed', remarks: 'Dimensional deviation +0.5mm', status: 'failed', createdAt: '2026-08-16' },
]);

db.seed(COL.ncs, [
  { id: 'qnc_0001', tenantId: TID, checkId: 'qch_0002', description: 'Dimensional deviation beyond tolerance', severity: 'major', correctiveAction: 'Rework required, hold batch', status: 'open', createdAt: '2026-08-16' },
]);

export default router;
