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
  let rows = await db.all(tenantId(req), COL.plans);
  if (req.query.status) rows = rows.filter((r: any) => r.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));

router.get('/inspection-plans/:id', asyncHandler(async (req, res) => {
  const plan = await db.byId(tenantId(req), COL.plans, req.params.id);
  res.json(notFoundIfUndefined(plan, 'Inspection plan not found'));
}));

router.post('/inspection-plans', asyncHandler(async (req, res) => {
  const { name, itemId, type, frequency, criteria, status } = req.body;
  requireBody(req.body, ['name', 'itemId', 'type', 'frequency']);
  const plan = await db.insert(tenantId(req), COL.plans, {
    name, itemId, type, frequency, criteria: criteria ?? '', status: status ?? 'draft', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'quality', recordRef: plan.id, newState: plan, ip: req.ip });
  res.status(201).json(plan);
}));

router.put('/inspection-plans/:id', asyncHandler(async (req, res) => {
  const existing = await db.byId(tenantId(req), COL.plans, req.params.id);
  notFoundIfUndefined(existing, 'Inspection plan not found');
  const updated = await db.update(tenantId(req), COL.plans, req.params.id, req.body);
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'quality', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

router.delete('/inspection-plans/:id', asyncHandler(async (req, res) => {
  const existing = await db.byId(tenantId(req), COL.plans, req.params.id);
  notFoundIfUndefined(existing, 'Inspection plan not found');
  await db.remove(tenantId(req), COL.plans, req.params.id);
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'delete', module: 'quality', recordRef: req.params.id, oldState: existing, ip: req.ip });
  res.status(204).send();
}));

router.get('/checks', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = await db.all(tenantId(req), COL.checks);
  if (req.query.planId) rows = rows.filter((r: any) => r.planId === req.query.planId);
  if (req.query.status) rows = rows.filter((r: any) => r.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));

router.post('/checks', asyncHandler(async (req, res) => {
  const { planId, batchId, inspectorId, date, result, remarks, status } = req.body;
  requireBody(req.body, ['planId', 'inspectorId', 'date']);
  const check = await db.insert(tenantId(req), COL.checks, {
    planId, batchId: batchId ?? '', inspectorId, date, result: result ?? '', remarks: remarks ?? '', status: status ?? 'pending', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'quality', recordRef: check.id, newState: check, ip: req.ip });
  res.status(201).json(check);
}));

router.put('/checks/:id', asyncHandler(async (req, res) => {
  const existing = await db.byId(tenantId(req), COL.checks, req.params.id);
  notFoundIfUndefined(existing, 'QC check not found');
  const updated = await db.update(tenantId(req), COL.checks, req.params.id, req.body);
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'quality', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

router.get('/non-conformances', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = await db.all(tenantId(req), COL.ncs);
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
  const nc = await db.insert(tenantId(req), COL.ncs, {
    checkId, description, severity, correctiveAction: correctiveAction ?? '', status: status ?? 'open', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'quality', recordRef: nc.id, newState: nc, ip: req.ip });
  res.status(201).json(nc);
}));

router.put('/non-conformances/:id', asyncHandler(async (req, res) => {
  const existing = await db.byId(tenantId(req), COL.ncs, req.params.id);
  notFoundIfUndefined(existing, 'Non-conformance not found');
  const updated = await db.update(tenantId(req), COL.ncs, req.params.id, req.body);
  const a = actor(req);
  await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'quality', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));







async function init() {
  await db.seed(COL.plans, [
  { id: 'qcp_0001', tenantId: TID, name: 'Incoming Material Check', itemId: 'itm_0001', type: 'incoming', frequency: 'per-batch', criteria: 'Visual, dimensions, chemical composition', status: 'active', createdAt: '2026-06-01' },
  { id: 'qcp_0002', tenantId: TID, name: 'Final Product Inspection', itemId: 'itm_0002', type: 'final', frequency: 'per-batch', criteria: 'Functional test, packaging, label', status: 'active', createdAt: '2026-06-01' },
  { id: 'qcp_0003', tenantId: TID, name: 'In-Process QC', itemId: 'itm_0003', type: 'in_process', frequency: 'daily', criteria: 'Dimensional, surface finish', status: 'active', createdAt: '2026-06-15' },
  { id: 'qcp_0004', tenantId: TID, name: 'Outgoing Dispatch Check', itemId: 'itm_0004', type: 'final', frequency: 'per-batch', criteria: 'Packing, marking, quantity', status: 'active', createdAt: '2026-07-01' },
  { id: 'qcp_0005', tenantId: TID, name: 'Raw Material Sampling', itemId: 'itm_0005', type: 'incoming', frequency: 'per-batch', criteria: 'Hardness test, visual inspection', status: 'draft', createdAt: '2026-07-15' },
  { id: 'qcp_0006', tenantId: TID, name: 'Calibration Check', itemId: 'itm_0006', type: 'in_process', frequency: 'weekly', criteria: 'Gauge R&R, CMC certificate', status: 'active', createdAt: '2026-08-01' },
  { id: 'qcp_0007', tenantId: TID, name: 'Packaging Integrity', itemId: 'itm_0007', type: 'final', frequency: 'per-batch', criteria: 'Drop test, seal integrity', status: 'draft', createdAt: '2026-08-10' },
  { id: 'qcp_0008', tenantId: TID, name: 'Chemical Composition Check', itemId: 'itm_0008', type: 'incoming', frequency: 'per-batch', criteria: 'Spectro analysis', status: 'active', createdAt: '2026-08-15' },
]);
  await db.seed(COL.checks, [
  { id: 'qch_0001', tenantId: TID, planId: 'qcp_0001', batchId: 'BTH-2026-089', inspectorId: 'emp_003', date: '2026-08-15', result: 'passed', remarks: 'All parameters within limits', status: 'passed', createdAt: '2026-08-15' },
  { id: 'qch_0002', tenantId: TID, planId: 'qcp_0001', batchId: 'BTH-2026-090', inspectorId: 'emp_003', date: '2026-08-16', result: 'failed', remarks: 'Dimensional deviation +0.5mm', status: 'failed', createdAt: '2026-08-16' },
  { id: 'qch_0003', tenantId: TID, planId: 'qcp_0002', batchId: 'BTH-2026-091', inspectorId: 'emp_003', date: '2026-08-17', result: 'passed', remarks: 'Functionality OK', status: 'passed', createdAt: '2026-08-17' },
  { id: 'qch_0004', tenantId: TID, planId: 'qcp_0003', batchId: 'BTH-2026-092', inspectorId: 'emp_003', date: '2026-08-14', result: 'conditional', remarks: 'Surface finish borderline', status: 'conditional', createdAt: '2026-08-14' },
  { id: 'qch_0005', tenantId: TID, planId: 'qcp_0004', batchId: 'BTH-2026-093', inspectorId: 'emp_003', date: '2026-08-13', result: 'passed', remarks: 'Packaging verified', status: 'passed', createdAt: '2026-08-13' },
  { id: 'qch_0006', tenantId: TID, planId: 'qcp_0005', batchId: 'BTH-2026-094', inspectorId: 'emp_003', date: '2026-08-12', result: 'pending', remarks: 'Awaiting lab results', status: 'pending', createdAt: '2026-08-12' },
  { id: 'qch_0007', tenantId: TID, planId: 'qcp_0006', batchId: 'BTH-2026-095', inspectorId: 'emp_003', date: '2026-08-10', result: 'passed', remarks: 'Calibration within limits', status: 'passed', createdAt: '2026-08-10' },
  { id: 'qch_0008', tenantId: TID, planId: 'qcp_0008', batchId: 'BTH-2026-096', inspectorId: 'emp_003', date: '2026-08-08', result: 'passed', remarks: 'Chemical composition OK', status: 'passed', createdAt: '2026-08-08' },
  { id: 'qch_0009', tenantId: TID, planId: 'qcp_0001', batchId: 'BTH-2026-085', inspectorId: 'emp_003', date: '2026-07-25', result: 'passed', remarks: 'Visual check passed', status: 'passed', createdAt: '2026-07-25' },
  { id: 'qch_0010', tenantId: TID, planId: 'qcp_0003', batchId: 'BTH-2026-086', inspectorId: 'emp_003', date: '2026-07-20', result: 'failed', remarks: 'Crack detected on sample 3', status: 'failed', createdAt: '2026-07-20' },
  { id: 'qch_0011', tenantId: TID, planId: 'qcp_0002', batchId: 'BTH-2026-087', inspectorId: 'emp_003', date: '2026-07-15', result: 'passed', remarks: 'All tests passed', status: 'passed', createdAt: '2026-07-15' },
  { id: 'qch_0012', tenantId: TID, planId: 'qcp_0004', batchId: 'BTH-2026-088', inspectorId: 'emp_003', date: '2026-07-10', result: 'conditional', remarks: 'Minor label issue', status: 'conditional', createdAt: '2026-07-10' },
]);
  await db.seed(COL.ncs, [
  { id: 'qnc_0001', tenantId: TID, checkId: 'qch_0002', description: 'Dimensional deviation beyond tolerance', severity: 'major', correctiveAction: 'Rework required, hold batch', status: 'open', createdAt: '2026-08-16' },
  { id: 'qnc_0002', tenantId: TID, checkId: 'qch_0004', description: 'Surface finish not meeting spec', severity: 'minor', correctiveAction: 'Polish and re-inspect', status: 'investigating', createdAt: '2026-08-14' },
  { id: 'qnc_0003', tenantId: TID, checkId: 'qch_0010', description: 'Crack detected on sample 3', severity: 'critical', correctiveAction: 'Stop production, scrap batch', status: 'open', createdAt: '2026-07-20' },
  { id: 'qnc_0004', tenantId: TID, checkId: 'qch_0012', description: 'Minor label misalignment', severity: 'minor', correctiveAction: 'Reprint labels', status: 'resolved', createdAt: '2026-07-10' },
  { id: 'qnc_0005', tenantId: TID, checkId: 'qch_0006', description: 'Pending lab results for hardness test', severity: 'minor', correctiveAction: 'Hold batch till results', status: 'investigating', createdAt: '2026-08-12' },
  { id: 'qnc_0006', tenantId: TID, checkId: 'qch_0003', description: 'Packaging seal defect observed', severity: 'major', correctiveAction: 'Replace sealing equipment', status: 'open', createdAt: '2026-08-17' },
]);
}
init().catch(console.error);

export default router;
