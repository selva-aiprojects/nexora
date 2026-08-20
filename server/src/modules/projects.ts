import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = {
  projects: 'project_projects',
  wbs: 'project_wbs',
  timeEntries: 'project_time_entries',
  budgets: 'project_budgets',
};

const statuses = ['draft', 'active', 'on-hold', 'completed', 'cancelled'];
const priorities = ['low', 'medium', 'high', 'critical'];

router.use(requireAuth);

router.get('/projects', asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  const status = req.query.status as string | undefined;
  let rows = db.all(tenantId(req), COL.projects);
  if (status) rows = rows.filter((r: any) => r.status === status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));

router.get('/projects/:id', asyncHandler(async (req, res) => {
  const project = db.byId(tenantId(req), COL.projects, req.params.id);
  res.json(notFoundIfUndefined(project, 'Project not found'));
}));

router.post('/projects', asyncHandler(async (req, res) => {
  const { name, code, description, status, startDate, endDate, budget, managerId } = req.body;
  requireBody(req.body, ['name', 'code', 'startDate', 'endDate']);
  const project = db.insert(tenantId(req), COL.projects, {
    name, code, description: description ?? '', status: status ?? 'draft', startDate, endDate, budget: Number(budget) || 0, managerId: managerId ?? '', createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'projects', recordRef: project.id, newState: project, ip: req.ip });
  res.status(201).json(project);
}));

router.put('/projects/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.projects, req.params.id);
  notFoundIfUndefined(existing, 'Project not found');
  const updated = db.update(tenantId(req), COL.projects, req.params.id, {
    ...req.body,
    budget: req.body.budget !== undefined ? Number(req.body.budget) : existing.budget,
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'projects', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

router.delete('/projects/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.projects, req.params.id);
  notFoundIfUndefined(existing, 'Project not found');
  db.remove(tenantId(req), COL.projects, req.params.id);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'delete', module: 'projects', recordRef: req.params.id, oldState: existing, ip: req.ip });
  res.status(204).send();
}));

router.get('/wbs', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  let rows = db.all(tenantId(req), COL.wbs);
  if (projectId) rows = rows.filter((r: any) => r.projectId === projectId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

router.post('/wbs', asyncHandler(async (req, res) => {
  const { projectId, name, description, parentId, startDate, endDate, budget, status } = req.body;
  requireBody(req.body, ['projectId', 'name', 'startDate', 'endDate']);
  const wbs = db.insert(tenantId(req), COL.wbs, {
    projectId, name, description: description ?? '', parentId: parentId ?? null, startDate, endDate, budget: Number(budget) || 0, status: status ?? 'pending',
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'projects', recordRef: wbs.id, newState: wbs, ip: req.ip });
  res.status(201).json(wbs);
}));

router.put('/wbs/:id', asyncHandler(async (req, res) => {
  const existing = db.byId(tenantId(req), COL.wbs, req.params.id);
  notFoundIfUndefined(existing, 'WBS item not found');
  const updated = db.update(tenantId(req), COL.wbs, req.params.id, req.body);
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'projects', recordRef: updated.id, oldState: existing, newState: updated, ip: req.ip });
  res.json(updated);
}));

router.get('/time-entries', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  let rows = db.all(tenantId(req), COL.timeEntries);
  if (projectId) rows = rows.filter((r: any) => r.projectId === projectId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

router.post('/time-entries', asyncHandler(async (req, res) => {
  const { projectId, wbsId, employeeId, date, hours, description, billable } = req.body;
  requireBody(req.body, ['projectId', 'employeeId', 'date', 'hours']);
  const entry = db.insert(tenantId(req), COL.timeEntries, {
    projectId, wbsId: wbsId ?? null, employeeId, date, hours: Number(hours), description: description ?? '', billable: billable ?? true, createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'projects', recordRef: entry.id, newState: entry, ip: req.ip });
  res.status(201).json(entry);
}));

router.get('/budgets', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  let rows = db.all(tenantId(req), COL.budgets);
  if (projectId) rows = rows.filter((r: any) => r.projectId === projectId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

router.post('/budgets', asyncHandler(async (req, res) => {
  const { projectId, category, amount, period } = req.body;
  requireBody(req.body, ['projectId', 'category', 'amount', 'period']);
  const budget = db.insert(tenantId(req), COL.budgets, {
    projectId, category, amount: Number(amount), spent: 0, period, createdAt: new Date().toISOString(),
  });
  const a = actor(req);
  recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'projects', recordRef: budget.id, newState: budget, ip: req.ip });
  res.status(201).json(budget);
}));

router.get('/reports/project-pl', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  const projects = projectId ? db.query(tenantId(req), COL.projects, (r: any) => r.id === projectId) : db.all(tenantId(req), COL.projects);
  const report = projects.map((p: any) => {
    const wbs = db.query(tenantId(req), COL.wbs, (r: any) => r.projectId === p.id);
    const entries = db.query(tenantId(req), COL.timeEntries, (r: any) => r.projectId === p.id);
    const revenue = p.budget ?? 0;
    const cost = entries.reduce((s: number, e: any) => s + (e.hours * 1500), 0);
    return { projectId: p.id, name: p.name, revenue, cost, profit: revenue - cost, wbsCount: wbs.length, timeEntries: entries.length };
  });
  res.json({ rows: report, total: report.length, page: 1, pageSize: report.length });
}));

db.seed(COL.projects, [
  { id: 'prj_0001', tenantId: TID, name: 'ERP Implementation', code: 'PRJ-001', description: 'Full ERP rollout for manufacturing unit', status: 'active', startDate: '2026-06-01', endDate: '2026-12-31', budget: 2500000, managerId: 'emp_001', createdAt: '2026-06-01' },
  { id: 'prj_0002', tenantId: TID, name: 'Warehouse Automation', code: 'PRJ-002', description: 'Automate warehouse operations', status: 'on-hold', startDate: '2026-07-15', endDate: '2027-01-15', budget: 1800000, managerId: 'emp_002', createdAt: '2026-07-15' },
  { id: 'prj_0003', tenantId: TID, name: 'New Product Launch', code: 'PRJ-003', description: 'Launch of industrial pump V2', status: 'active', startDate: '2026-04-01', endDate: '2026-10-31', budget: 3200000, managerId: 'emp_003', createdAt: '2026-04-01' },
  { id: 'prj_0004', tenantId: TID, name: 'Compliance Upgrade', code: 'PRJ-004', description: 'ISO 9001 certification process', status: 'completed', startDate: '2026-03-01', endDate: '2026-06-30', budget: 800000, managerId: 'emp_004', createdAt: '2026-03-01' },
  { id: 'prj_0005', tenantId: TID, name: 'Digital Marketing Campaign', code: 'PRJ-005', description: 'Q3 marketing push for new products', status: 'active', startDate: '2026-08-01', endDate: '2026-11-30', budget: 1200000, managerId: 'emp_005', createdAt: '2026-08-01' },
  { id: 'prj_0006', tenantId: TID, name: 'Vendor Portal Development', code: 'PRJ-006', description: 'Self-service vendor portal', status: 'draft', startDate: '2026-09-01', endDate: '2027-02-28', budget: 1500000, managerId: 'emp_006', createdAt: '2026-08-15' },
]);

db.seed(COL.wbs, [
  { id: 'wbs_0001', tenantId: TID, projectId: 'prj_0001', name: 'Requirements', description: 'Gather requirements', parentId: null, startDate: '2026-06-01', endDate: '2026-07-31', budget: 300000, status: 'completed' },
  { id: 'wbs_0002', tenantId: TID, projectId: 'prj_0001', name: 'Development', description: 'Core development', parentId: null, startDate: '2026-08-01', endDate: '2026-10-31', budget: 1200000, status: 'active' },
  { id: 'wbs_0003', tenantId: TID, projectId: 'prj_0001', name: 'Testing', description: 'UAT and bug fixes', parentId: null, startDate: '2026-11-01', endDate: '2026-12-15', budget: 400000, status: 'pending' },
  { id: 'wbs_0004', tenantId: TID, projectId: 'prj_0001', name: 'Deployment', description: 'Production rollout', parentId: null, startDate: '2026-12-16', endDate: '2026-12-31', budget: 150000, status: 'pending' },
  { id: 'wbs_0005', tenantId: TID, projectId: 'prj_0002', name: 'Feasibility Study', description: 'Technical assessment', parentId: null, startDate: '2026-07-15', endDate: '2026-08-15', budget: 200000, status: 'completed' },
  { id: 'wbs_0006', tenantId: TID, projectId: 'prj_0002', name: 'Procurement', description: 'Hardware procurement', parentId: null, startDate: '2026-08-16', endDate: '2026-09-30', budget: 600000, status: 'active' },
  { id: 'wbs_0007', tenantId: TID, projectId: 'prj_0003', name: 'Design Phase', description: 'Engineering design', parentId: null, startDate: '2026-04-01', endDate: '2026-05-31', budget: 500000, status: 'completed' },
  { id: 'wbs_0008', tenantId: TID, projectId: 'prj_0003', name: 'Prototyping', description: 'Build prototypes', parentId: null, startDate: '2026-06-01', endDate: '2026-08-15', budget: 800000, status: 'active' },
  { id: 'wbs_0009', tenantId: TID, projectId: 'prj_0003', name: 'Testing', description: 'Performance testing', parentId: null, startDate: '2026-08-16', endDate: '2026-10-15', budget: 600000, status: 'pending' },
  { id: 'wbs_0010', tenantId: TID, projectId: 'prj_0003', name: 'Launch', description: 'Go-to-market', parentId: null, startDate: '2026-10-16', endDate: '2026-10-31', budget: 400000, status: 'pending' },
  { id: 'wbs_0011', tenantId: TID, projectId: 'prj_0004', name: 'Gap Analysis', description: 'Identify gaps', parentId: null, startDate: '2026-03-01', endDate: '2026-04-15', budget: 150000, status: 'completed' },
  { id: 'wbs_0012', tenantId: TID, projectId: 'prj_0004', name: 'Documentation', description: 'QMS documentation', parentId: null, startDate: '2026-04-16', endDate: '2026-05-31', budget: 250000, status: 'completed' },
  { id: 'wbs_0013', tenantId: TID, projectId: 'prj_0005', name: 'Campaign Design', description: 'Creative assets', parentId: null, startDate: '2026-08-01', endDate: '2026-09-15', budget: 400000, status: 'active' },
  { id: 'wbs_0014', tenantId: TID, projectId: 'prj_0005', name: 'Media Buying', description: 'Ad spend management', parentId: null, startDate: '2026-09-01', endDate: '2026-11-30', budget: 600000, status: 'pending' },
  { id: 'wbs_0015', tenantId: TID, projectId: 'prj_0006', name: 'Requirement Gathering', description: 'Stakeholder interviews', parentId: null, startDate: '2026-09-01', endDate: '2026-09-30', budget: 200000, status: 'pending' },
]);

db.seed(COL.timeEntries, [
  { id: 'te_0001', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0002', employeeId: 'emp_001', date: '2026-08-15', hours: 8, description: 'Frontend development', billable: true, createdAt: '2026-08-15' },
  { id: 'te_0002', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0002', employeeId: 'emp_002', date: '2026-08-15', hours: 6, description: 'Backend API', billable: true, createdAt: '2026-08-15' },
  { id: 'te_0003', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0001', employeeId: 'emp_003', date: '2026-07-10', hours: 8, description: 'Requirements documentation', billable: true, createdAt: '2026-07-10' },
  { id: 'te_0004', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0002', employeeId: 'emp_004', date: '2026-08-16', hours: 7, description: 'Integration testing', billable: true, createdAt: '2026-08-16' },
  { id: 'te_0005', tenantId: TID, projectId: 'prj_0003', wbsId: 'wbs_0008', employeeId: 'emp_001', date: '2026-08-14', hours: 9, description: 'Prototype assembly', billable: true, createdAt: '2026-08-14' },
  { id: 'te_0006', tenantId: TID, projectId: 'prj_0003', wbsId: 'wbs_0008', employeeId: 'emp_003', date: '2026-08-14', hours: 8, description: 'Testing iterations', billable: true, createdAt: '2026-08-14' },
  { id: 'te_0007', tenantId: TID, projectId: 'prj_0002', wbsId: 'wbs_0006', employeeId: 'emp_002', date: '2026-08-12', hours: 7, description: 'Vendor evaluation', billable: true, createdAt: '2026-08-12' },
  { id: 'te_0008', tenantId: TID, projectId: 'prj_0002', wbsId: 'wbs_0005', employeeId: 'emp_004', date: '2026-07-20', hours: 6, description: 'Feasibility report', billable: true, createdAt: '2026-07-20' },
  { id: 'te_0009', tenantId: TID, projectId: 'prj_0004', wbsId: 'wbs_0011', employeeId: 'emp_005', date: '2026-04-15', hours: 8, description: 'Gap analysis workshop', billable: true, createdAt: '2026-04-15' },
  { id: 'te_0010', tenantId: TID, projectId: 'prj_0004', wbsId: 'wbs_0012', employeeId: 'emp_006', date: '2026-05-10', hours: 7, description: 'Document drafting', billable: true, createdAt: '2026-05-10' },
  { id: 'te_0011', tenantId: TID, projectId: 'prj_0005', wbsId: 'wbs_0013', employeeId: 'emp_002', date: '2026-08-10', hours: 6, description: 'Campaign strategy', billable: true, createdAt: '2026-08-10' },
  { id: 'te_0012', tenantId: TID, projectId: 'prj_0005', wbsId: 'wbs_0013', employeeId: 'emp_005', date: '2026-08-11', hours: 8, description: 'Creative design', billable: true, createdAt: '2026-08-11' },
  { id: 'te_0013', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0002', employeeId: 'emp_006', date: '2026-08-17', hours: 5, description: 'Unit testing', billable: true, createdAt: '2026-08-17' },
  { id: 'te_0014', tenantId: TID, projectId: 'prj_0003', wbsId: 'wbs_0007', employeeId: 'emp_001', date: '2026-06-15', hours: 8, description: 'CAD design', billable: true, createdAt: '2026-06-15' },
  { id: 'te_0015', tenantId: TID, projectId: 'prj_0003', wbsId: 'wbs_0007', employeeId: 'emp_003', date: '2026-06-20', hours: 7, description: 'Simulation testing', billable: true, createdAt: '2026-06-20' },
  { id: 'te_0016', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0003', employeeId: 'emp_004', date: '2026-11-05', hours: 8, description: 'UAT planning', billable: true, createdAt: '2026-11-05' },
  { id: 'te_0017', tenantId: TID, projectId: 'prj_0002', wbsId: 'wbs_0006', employeeId: 'emp_001', date: '2026-08-20', hours: 7, description: 'Site survey', billable: true, createdAt: '2026-08-20' },
  { id: 'te_0018', tenantId: TID, projectId: 'prj_0006', wbsId: 'wbs_0015', employeeId: 'emp_002', date: '2026-08-22', hours: 6, description: 'Requirements interview', billable: true, createdAt: '2026-08-22' },
  { id: 'te_0019', tenantId: TID, projectId: 'prj_0001', wbsId: 'wbs_0002', employeeId: 'emp_005', date: '2026-08-18', hours: 8, description: 'API development', billable: true, createdAt: '2026-08-18' },
  { id: 'te_0020', tenantId: TID, projectId: 'prj_0005', wbsId: 'wbs_0014', employeeId: 'emp_006', date: '2026-09-05', hours: 7, description: 'Media planning', billable: true, createdAt: '2026-09-05' },
]);

db.seed(COL.budgets, [
  { id: 'bud_0001', tenantId: TID, projectId: 'prj_0001', category: 'Development', amount: 1200000, spent: 450000, period: '2026-Q3', createdAt: '2026-06-01' },
  { id: 'bud_0002', tenantId: TID, projectId: 'prj_0001', category: 'Infrastructure', amount: 500000, spent: 120000, period: '2026-Q3', createdAt: '2026-06-01' },
  { id: 'bud_0003', tenantId: TID, projectId: 'prj_0001', category: 'Training', amount: 200000, spent: 85000, period: '2026-Q3', createdAt: '2026-06-01' },
  { id: 'bud_0004', tenantId: TID, projectId: 'prj_0002', category: 'Hardware', amount: 800000, spent: 320000, period: '2026-Q3', createdAt: '2026-07-15' },
  { id: 'bud_0005', tenantId: TID, projectId: 'prj_0002', category: 'Software', amount: 500000, spent: 180000, period: '2026-Q3', createdAt: '2026-07-15' },
  { id: 'bud_0006', tenantId: TID, projectId: 'prj_0003', category: 'Prototyping', amount: 800000, spent: 560000, period: '2026-Q3', createdAt: '2026-04-01' },
  { id: 'bud_0007', tenantId: TID, projectId: 'prj_0003', category: 'Testing', amount: 600000, spent: 210000, period: '2026-Q3', createdAt: '2026-04-01' },
  { id: 'bud_0008', tenantId: TID, projectId: 'prj_0004', category: 'Consulting', amount: 400000, spent: 400000, period: '2026-Q2', createdAt: '2026-03-01' },
  { id: 'bud_0009', tenantId: TID, projectId: 'prj_0005', category: 'Media', amount: 700000, spent: 280000, period: '2026-Q3', createdAt: '2026-08-01' },
  { id: 'bud_0010', tenantId: TID, projectId: 'prj_0005', category: 'Creative', amount: 500000, spent: 320000, period: '2026-Q3', createdAt: '2026-08-01' },
]);

export default router;
