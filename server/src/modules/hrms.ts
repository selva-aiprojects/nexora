import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, requireRole, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = {
  departments: 'hrms_departments',
  designations: 'hrms_designations',
  grades: 'hrms_grades',
  employees: 'hrms_employees',
  attendance: 'hrms_attendance',
  leaveTypes: 'hrms_leave_types',
  leaveBalances: 'hrms_leave_balances',
  leaveApps: 'hrms_leave_applications',
  payrollRuns: 'hrms_payroll_runs',
  payslips: 'hrms_payslips',
};

// ----------------------------- Seed data -----------------------------
db.seed(COL.departments, [
  { id: 'dep_001', tenantId: TID, name: 'Finance', code: 'FIN' },
  { id: 'dep_002', tenantId: TID, name: 'Human Resources', code: 'HR' },
  { id: 'dep_003', tenantId: TID, name: 'Manufacturing', code: 'MFG' },
]);
db.seed(COL.designations, [
  { id: 'des_001', tenantId: TID, title: 'Finance Manager', grade: 'M2' },
  { id: 'des_002', tenantId: TID, title: 'HR Executive', grade: 'E2' },
  { id: 'des_003', tenantId: TID, title: 'Production Supervisor', grade: 'M1' },
  { id: 'des_004', tenantId: TID, title: 'Shop Floor Operator', grade: 'E1' },
]);
db.seed(COL.grades, [
  { id: 'grd_E1', tenantId: TID, name: 'E1', minSalary: 180000, maxSalary: 300000 },
  { id: 'grd_E2', tenantId: TID, name: 'E2', minSalary: 300000, maxSalary: 500000 },
  { id: 'grd_M1', tenantId: TID, name: 'M1', minSalary: 500000, maxSalary: 800000 },
  { id: 'grd_M2', tenantId: TID, name: 'M2', minSalary: 800000, maxSalary: 1400000 },
]);
db.seed(COL.employees, [
  { id: 'emp_1001', tenantId: TID, employeeCode: 'EMP1001', name: 'Vikram Singh', email: 'vikram@acme.in', phone: '9876500001', departmentId: 'dep_003', designationId: 'des_004', grade: 'E1', dateOfJoining: '2024-03-01', status: 'active', managerId: 'emp_1003', salary: { basic: 22000, hra: 8800, allowances: 4000 } },
  { id: 'emp_1002', tenantId: TID, employeeCode: 'EMP1002', name: 'Sunita Rao', email: 'sunita@acme.in', phone: '9876500002', departmentId: 'dep_002', designationId: 'des_002', grade: 'E2', dateOfJoining: '2023-06-15', status: 'active', managerId: 'usr_hr', salary: { basic: 35000, hra: 14000, allowances: 6000 } },
  { id: 'emp_1003', tenantId: TID, employeeCode: 'EMP1003', name: 'Arjun Mehta', email: 'arjun@acme.in', phone: '9876500003', departmentId: 'dep_003', designationId: 'des_003', grade: 'M1', dateOfJoining: '2022-01-10', status: 'active', salary: { basic: 62000, hra: 24800, allowances: 12000 } },
  { id: 'emp_1004', tenantId: TID, employeeCode: 'EMP1004', name: 'Kavya Nair', email: 'kavya@acme.in', phone: '9876500004', departmentId: 'dep_001', designationId: 'des_001', grade: 'M2', dateOfJoining: '2021-09-01', status: 'active', salary: { basic: 95000, hra: 38000, allowances: 20000 } },
]);
db.seed(COL.attendance, [
  { id: 'att_001', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-18', checkIn: '09:02', checkOut: '18:05', status: 'present' },
  { id: 'att_002', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-18', checkIn: '10:15', checkOut: '18:30', status: 'late' },
  { id: 'att_003', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-19', checkIn: '08:58', checkOut: null, status: 'present' },
]);
db.seed(COL.leaveTypes, [
  { id: 'lv_cl', tenantId: TID, name: 'Casual Leave', annualQuota: 12 },
  { id: 'lv_sl', tenantId: TID, name: 'Sick Leave', annualQuota: 10 },
  { id: 'lv_pl', tenantId: TID, name: 'Privilege Leave', annualQuota: 18 },
]);
db.seed(COL.leaveBalances, [
  { id: 'lb_001', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_cl', balance: 9 },
  { id: 'lb_002', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_sl', balance: 7 },
  { id: 'lb_003', tenantId: TID, employeeId: 'emp_1002', leaveTypeId: 'lv_cl', balance: 10 },
]);
db.seed(COL.leaveApps, [
  { id: 'la_001', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_cl', from: '2026-08-25', to: '2026-08-26', days: 2, reason: 'Personal work', status: 'pending' },
]);
db.seed(COL.payrollRuns, [
  { id: 'pr_0001', tenantId: TID, periodStart: '2026-07-01', periodEnd: '2026-07-31', status: 'paid', employeeCount: 4, totalGross: 412000, totalDeductions: 58400, totalNet: 353600 },
]);

// ----------------------------- Routes -----------------------------
// Organization
router.get('/departments', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.departments))));
router.get('/designations', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.designations))));
router.get('/grades', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.grades))));

// Employees
router.get('/employees', requireAuth, asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = db.all(TID, COL.employees);
  if (req.query.status) rows = rows.filter((e) => e.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));
router.get('/employees/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(notFoundIfUndefined(db.byId(TID, COL.employees, req.params.id), 'Employee not found'));
}));
router.post('/employees', requireAuth, requireRole('hr', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'email', 'departmentId', 'designationId']);
  const row = db.insert(TID, COL.employees, { employeeCode: db.nextId('EMP', COL.employees), status: 'active', salary: { basic: 0, hra: 0, allowances: 0 }, ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'hrms', recordRef: row.employeeCode, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Attendance
router.get('/attendance', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.attendance).sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.employeeId) rows = rows.filter((r) => r.employeeId === req.query.employeeId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/attendance/check-in', requireAuth, asyncHandler(async (req, res) => {
  const employeeId = req.body.employeeId ?? req.user!.employeeId;
  if (!employeeId) throw ApiError.badRequest('employeeId required');
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.query(TID, COL.attendance, (a) => a.employeeId === employeeId && a.date === today)[0];
  if (existing) throw ApiError.conflict('Already checked in today');
  const row = db.insert(TID, COL.attendance, { employeeId, date: today, checkIn: new Date().toTimeString().slice(0, 5), checkOut: null, status: 'present', gps: req.body.gps });
  res.status(201).json(row);
}));
router.post('/attendance/check-out', requireAuth, asyncHandler(async (req, res) => {
  const employeeId = req.body.employeeId ?? req.user!.employeeId;
  const today = new Date().toISOString().slice(0, 10);
  const rec = db.query(TID, COL.attendance, (a) => a.employeeId === employeeId && a.date === today)[0];
  if (!rec) throw ApiError.notFound('No check-in found for today');
  const updated = db.update(TID, COL.attendance, rec.id, { checkOut: new Date().toTimeString().slice(0, 5) });
  res.json(updated);
}));

// Leave
router.get('/leave-types', requireAuth, asyncHandler(async (_req, res) => res.json(db.all(TID, COL.leaveTypes))));
router.get('/leave-balances/:employeeId', requireAuth, asyncHandler(async (req, res) => {
  res.json(db.query(TID, COL.leaveBalances, (b) => b.employeeId === req.params.employeeId));
}));
router.get('/leave-applications', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.leaveApps).sort((a, b) => b.from.localeCompare(a.from));
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/leave-applications', requireAuth, asyncHandler(async (req, res) => {
  requireBody(req.body, ['leaveTypeId', 'from', 'to', 'days']);
  const row = db.insert(TID, COL.leaveApps, { employeeId: req.user!.employeeId ?? req.body.employeeId, status: 'pending', reason: req.body.reason ?? '', ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'hrms', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.post('/leave-applications/:id/approve', requireAuth, requireRole('hr', 'manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const app = notFoundIfUndefined(db.byId(TID, COL.leaveApps, req.params.id), 'Leave application not found');
  const updated = db.update(TID, COL.leaveApps, app.id, { status: 'approved' });
  const bal = db.query(TID, COL.leaveBalances, (b) => b.employeeId === app.employeeId && b.leaveTypeId === app.leaveTypeId)[0];
  if (bal) db.update(TID, COL.leaveBalances, bal.id, { balance: Math.max(0, bal.balance - app.days) });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'approve', module: 'hrms', recordRef: app.id, oldState: { status: app.status }, newState: { status: 'approved' }, ip: req.ip });
  res.json(updated);
}));
router.post('/leave-applications/:id/reject', requireAuth, requireRole('hr', 'manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const app = notFoundIfUndefined(db.byId(TID, COL.leaveApps, req.params.id), 'Leave application not found');
  const updated = db.update(TID, COL.leaveApps, app.id, { status: 'rejected' });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'reject', module: 'hrms', recordRef: app.id, newState: { status: 'rejected' }, ip: req.ip });
  res.json(updated);
}));

// Payroll
function computePayslip(emp: any) {
  const gross = emp.salary.basic + emp.salary.hra + emp.salary.allowances;
  const pf = Math.round(emp.salary.basic * 0.12);
  const esic = Math.round(gross * 0.0075);
  const pt = gross > 25000 ? 200 : 0;
  const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;
  const deductions = pf + esic + pt + tds;
  return { gross, pf, esic, pt, tds, deductions, net: gross - deductions };
}
router.get('/payroll-runs', requireAuth, asyncHandler(async (_req, res) => {
  res.json(db.all(TID, COL.payrollRuns).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)));
}));
router.post('/payroll-runs', requireAuth, requireRole('hr', 'finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['periodStart', 'periodEnd']);
  const employees = db.all(TID, COL.employees).filter((e) => e.status === 'active');
  let totalGross = 0, totalDeductions = 0, totalNet = 0;
  const payslips = employees.map((emp) => {
    const p = computePayslip(emp);
    totalGross += p.gross; totalDeductions += p.deductions; totalNet += p.net;
    return db.insert(TID, COL.payslips, { id: db.nextId('PS', COL.payslips), payrollRunId: '', employeeId: emp.id, employeeName: emp.name, period: req.body.periodEnd, ...p });
  });
  const run = db.insert(TID, COL.payrollRuns, { periodStart: req.body.periodStart, periodEnd: req.body.periodEnd, status: 'draft', employeeCount: employees.length, totalGross, totalDeductions, totalNet });
  payslips.forEach((ps) => db.update(TID, COL.payslips, ps.id, { payrollRunId: run.id }));
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'hrms', recordRef: run.id, newState: { status: 'draft' }, ip: req.ip });
  res.status(201).json(run);
}));
router.get('/payroll-runs/:id/payslips', requireAuth, asyncHandler(async (req, res) => {
  res.json(db.query(TID, COL.payslips, (p) => p.payrollRunId === req.params.id));
}));
router.post('/payroll-runs/:id/approve', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const run = notFoundIfUndefined(db.byId(TID, COL.payrollRuns, req.params.id), 'Payroll run not found');
  const updated = db.update(TID, COL.payrollRuns, run.id, { status: 'approved' });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'approve', module: 'hrms', recordRef: run.id, newState: { status: 'approved' }, ip: req.ip });
  res.json(updated);
}));
router.get('/payslips/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(notFoundIfUndefined(db.byId(TID, COL.payslips, req.params.id), 'Payslip not found'));
}));

// Statutory summary (EPF / ESIC / PT / TDS)
router.get('/statutory', requireAuth, asyncHandler(async (_req, res) => {
  const employees = db.all(TID, COL.employees).filter((e) => e.status === 'active');
  const epf = employees.reduce((s, e) => s + Math.round(e.salary.basic * 0.12), 0);
  const esic = employees.reduce((s, e) => s + Math.round((e.salary.basic + e.salary.hra + e.salary.allowances) * 0.0075), 0);
  const tds = employees.reduce((s, e) => s + ((e.salary.basic + e.salary.hra + e.salary.allowances) > 50000 ? Math.round((e.salary.basic + e.salary.hra + e.salary.allowances) * 0.05) : 0), 0);
  res.json({ employeeCount: employees.length, epf, esic, tds, totalStatutory: epf + esic + tds });
}));

export default router;
