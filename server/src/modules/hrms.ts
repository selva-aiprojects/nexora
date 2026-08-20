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
  training: 'hrms_training',
};



// ----------------------------- Seed data -----------------------------












// ----------------------------- Routes -----------------------------
// Organization
router.get('/departments', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.departments))));
router.get('/designations', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.designations))));
router.get('/grades', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.grades))));

// Employees
router.get('/employees', requireAuth, asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = await db.all(TID, COL.employees);
  if (req.query.status) rows = rows.filter((e) => e.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));
router.get('/employees/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(notFoundIfUndefined(await db.byId(TID, COL.employees, req.params.id), 'Employee not found'));
}));
router.post('/employees', requireAuth, requireRole('hr', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'email', 'departmentId', 'designationId']);
  const row = await db.insert(TID, COL.employees, { employeeCode: await db.nextId('EMP', COL.employees), status: 'active', salary: { basic: 0, hra: 0, allowances: 0 }, ...req.body });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'hrms', recordRef: row.employeeCode, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Attendance
router.get('/attendance', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.attendance);
  const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.employeeId) rows = rows.filter((r) => r.employeeId === req.query.employeeId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/attendance/check-in', requireAuth, asyncHandler(async (req, res) => {
  const employeeId = req.body.employeeId ?? req.user!.employeeId;
  if (!employeeId) throw ApiError.badRequest('employeeId required');
  const today = new Date().toISOString().slice(0, 10);
  const existing = (await db.query(TID, COL.attendance, (a) => a.employeeId === employeeId && a.date === today))[0];
  if (existing) throw ApiError.conflict('Already checked in today');
  const row = await db.insert(TID, COL.attendance, { employeeId, date: today, checkIn: new Date().toTimeString().slice(0, 5), checkOut: null, status: 'present', gps: req.body.gps });
  res.status(201).json(row);
}));
router.post('/attendance/check-out', requireAuth, asyncHandler(async (req, res) => {
  const employeeId = req.body.employeeId ?? req.user!.employeeId;
  const today = new Date().toISOString().slice(0, 10);
  const rec = (await db.query(TID, COL.attendance, (a) => a.employeeId === employeeId && a.date === today))[0];
  if (!rec) throw ApiError.notFound('No check-in found for today');
  const updated = await db.update(TID, COL.attendance, rec.id, { checkOut: new Date().toTimeString().slice(0, 5) });
  res.json(updated);
}));

// Leave
router.get('/leave-types', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.leaveTypes))));
router.get('/leave-balances/:employeeId', requireAuth, asyncHandler(async (req, res) => {
  res.json(await db.query(TID, COL.leaveBalances, (b) => b.employeeId === req.params.employeeId));
}));
router.get('/leave-applications', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.leaveApps);
  const sorted = rows.sort((a, b) => b.from.localeCompare(a.from));
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/leave-applications', requireAuth, asyncHandler(async (req, res) => {
  requireBody(req.body, ['leaveTypeId', 'from', 'to', 'days']);
  const row = await db.insert(TID, COL.leaveApps, { employeeId: req.user!.employeeId ?? req.body.employeeId, status: 'pending', reason: req.body.reason ?? '', ...req.body });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'hrms', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.post('/leave-applications/:id/approve', requireAuth, requireRole('hr', 'manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const app = notFoundIfUndefined(await db.byId(TID, COL.leaveApps, req.params.id), 'Leave application not found');
  const updated = await db.update(TID, COL.leaveApps, app.id, { status: 'approved' });
  const balRows = await db.query(TID, COL.leaveBalances, (b) => b.employeeId === app.employeeId && b.leaveTypeId === app.leaveTypeId);
  const bal = balRows[0];
  if (bal) await db.update(TID, COL.leaveBalances, bal.id, { balance: Math.max(0, bal.balance - app.days) });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'approve', module: 'hrms', recordRef: app.id, oldState: { status: app.status }, newState: { status: 'approved' }, ip: req.ip });
  res.json(updated);
}));
router.post('/leave-applications/:id/reject', requireAuth, requireRole('hr', 'manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const app = notFoundIfUndefined(await db.byId(TID, COL.leaveApps, req.params.id), 'Leave application not found');
  const updated = await db.update(TID, COL.leaveApps, app.id, { status: 'rejected' });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'reject', module: 'hrms', recordRef: app.id, newState: { status: 'rejected' }, ip: req.ip });
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
  const rows = await db.all(TID, COL.payrollRuns);
  res.json(rows.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)));
}));
router.post('/payroll-runs', requireAuth, requireRole('hr', 'finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['periodStart', 'periodEnd']);
  const employees = await db.all(TID, COL.employees);
  const activeEmployees = employees.filter((e) => e.status === 'active');
  let totalGross = 0, totalDeductions = 0, totalNet = 0;
  const payslips: any[] = [];
  for (const emp of activeEmployees) {
    const p = computePayslip(emp);
    totalGross += p.gross; totalDeductions += p.deductions; totalNet += p.net;
    const ps = await db.insert(TID, COL.payslips, { id: await db.nextId('PS', COL.payslips), payrollRunId: '', employeeId: emp.id, employeeName: emp.name, period: req.body.periodEnd, ...p });
    payslips.push(ps);
  }
  const run = await db.insert(TID, COL.payrollRuns, { periodStart: req.body.periodStart, periodEnd: req.body.periodEnd, status: 'draft', employeeCount: employees.length, totalGross, totalDeductions, totalNet });
  for (const ps of payslips) {
    await db.update(TID, COL.payslips, ps.id, { payrollRunId: run.id });
  }
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'hrms', recordRef: run.id, newState: { status: 'draft' }, ip: req.ip });
  res.status(201).json(run);
}));
router.get('/payroll-runs/:id/payslips', requireAuth, asyncHandler(async (req, res) => {
  res.json(await db.query(TID, COL.payslips, (p) => p.payrollRunId === req.params.id));
}));
router.post('/payroll-runs/:id/approve', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const run = notFoundIfUndefined(await db.byId(TID, COL.payrollRuns, req.params.id), 'Payroll run not found');
  const updated = await db.update(TID, COL.payrollRuns, run.id, { status: 'approved' });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'approve', module: 'hrms', recordRef: run.id, newState: { status: 'approved' }, ip: req.ip });
  res.json(updated);
}));
router.get('/payslips/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(notFoundIfUndefined(await db.byId(TID, COL.payslips, req.params.id), 'Payslip not found'));
}));

// Statutory summary (EPF / ESIC / PT / TDS)
router.get('/statutory', requireAuth, asyncHandler(async (_req, res) => {
  const employees = await db.all(TID, COL.employees);
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const epf = activeEmployees.reduce((s, e) => s + Math.round(e.salary.basic * 0.12), 0);
  const esic = employees.reduce((s, e) => s + Math.round((e.salary.basic + e.salary.hra + e.salary.allowances) * 0.0075), 0);
  const tds = employees.reduce((s, e) => s + ((e.salary.basic + e.salary.hra + e.salary.allowances) > 50000 ? Math.round((e.salary.basic + e.salary.hra + e.salary.allowances) * 0.05) : 0), 0);
  res.json({ employeeCount: employees.length, epf, esic, tds, totalStatutory: epf + esic + tds });
}));

async function init() {
  await db.seed(COL.departments, [
  { id: 'dep_001', tenantId: TID, name: 'Finance', code: 'FIN' },
  { id: 'dep_002', tenantId: TID, name: 'Human Resources', code: 'HR' },
  { id: 'dep_003', tenantId: TID, name: 'Manufacturing', code: 'MFG' },
]);
  await db.seed(COL.designations, [
  { id: 'des_001', tenantId: TID, title: 'Finance Manager', grade: 'M2' },
  { id: 'des_002', tenantId: TID, title: 'HR Executive', grade: 'E2' },
  { id: 'des_003', tenantId: TID, title: 'Production Supervisor', grade: 'M1' },
  { id: 'des_004', tenantId: TID, title: 'Shop Floor Operator', grade: 'E1' },
]);
  await db.seed(COL.grades, [
  { id: 'grd_E1', tenantId: TID, name: 'E1', minSalary: 180000, maxSalary: 300000 },
  { id: 'grd_E2', tenantId: TID, name: 'E2', minSalary: 300000, maxSalary: 500000 },
  { id: 'grd_M1', tenantId: TID, name: 'M1', minSalary: 500000, maxSalary: 800000 },
  { id: 'grd_M2', tenantId: TID, name: 'M2', minSalary: 800000, maxSalary: 1400000 },
]);
  await db.seed(COL.employees, [
  { id: 'emp_1001', tenantId: TID, employeeCode: 'EMP1001', name: 'Vikram Singh', email: 'vikram@acme.in', phone: '9876500001', departmentId: 'dep_003', designationId: 'des_004', grade: 'E1', dateOfJoining: '2024-03-01', status: 'active', managerId: 'emp_1003', salary: { basic: 22000, hra: 8800, allowances: 4000 } },
  { id: 'emp_1002', tenantId: TID, employeeCode: 'EMP1002', name: 'Sunita Rao', email: 'sunita@acme.in', phone: '9876500002', departmentId: 'dep_002', designationId: 'des_002', grade: 'E2', dateOfJoining: '2023-06-15', status: 'active', managerId: 'usr_hr', salary: { basic: 35000, hra: 14000, allowances: 6000 } },
  { id: 'emp_1003', tenantId: TID, employeeCode: 'EMP1003', name: 'Arjun Mehta', email: 'arjun@acme.in', phone: '9876500003', departmentId: 'dep_003', designationId: 'des_003', grade: 'M1', dateOfJoining: '2022-01-10', status: 'active', managerId: 'usr_hr', salary: { basic: 62000, hra: 24800, allowances: 12000 } },
  { id: 'emp_1004', tenantId: TID, employeeCode: 'EMP1004', name: 'Kavya Nair', email: 'kavya@acme.in', phone: '9876500004', departmentId: 'dep_001', designationId: 'des_001', grade: 'M2', dateOfJoining: '2021-09-01', status: 'active', managerId: 'usr_hr', salary: { basic: 95000, hra: 38000, allowances: 20000 } },
  { id: 'emp_1005', tenantId: TID, employeeCode: 'EMP1005', name: 'Rahul Verma', email: 'rahul@acme.in', phone: '9876500005', departmentId: 'dep_001', designationId: 'des_001', grade: 'M2', dateOfJoining: '2020-02-15', status: 'active', managerId: 'usr_hr', salary: { basic: 90000, hra: 36000, allowances: 18000 } },
  { id: 'emp_1006', tenantId: TID, employeeCode: 'EMP1006', name: 'Priya Nair', email: 'priya.nair@acme.in', phone: '9876500006', departmentId: 'dep_003', designationId: 'des_003', grade: 'M1', dateOfJoining: '2022-06-20', status: 'active', managerId: 'emp_1003', salary: { basic: 60000, hra: 24000, allowances: 11000 } },
  { id: 'emp_1007', tenantId: TID, employeeCode: 'EMP1007', name: 'Deepak Kumar', email: 'deepak@acme.in', phone: '9876500007', departmentId: 'dep_003', designationId: 'des_004', grade: 'E1', dateOfJoining: '2025-01-05', status: 'active', managerId: 'emp_1003', salary: { basic: 21000, hra: 8400, allowances: 3500 } },
  { id: 'emp_1008', tenantId: TID, employeeCode: 'EMP1008', name: 'Anita Joshi', email: 'anita@acme.in', phone: '9876500008', departmentId: 'dep_002', designationId: 'des_002', grade: 'E2', dateOfJoining: '2023-11-10', status: 'active', managerId: 'emp_1004', salary: { basic: 34000, hra: 13600, allowances: 5500 } },
  { id: 'emp_1009', tenantId: TID, employeeCode: 'EMP1009', name: 'Suresh Patel', email: 'suresh@acme.in', phone: '9876500009', departmentId: 'dep_003', designationId: 'des_004', grade: 'E1', dateOfJoining: '2024-08-15', status: 'inactive', managerId: 'emp_1006', salary: { basic: 20000, hra: 8000, allowances: 3000 } },
  { id: 'emp_1010', tenantId: TID, employeeCode: 'EMP1010', name: 'Meera Reddy', email: 'meera@acme.in', phone: '9876500010', departmentId: 'dep_001', designationId: 'des_002', grade: 'E2', dateOfJoining: '2024-04-01', status: 'inactive', managerId: 'emp_1005', salary: { basic: 32000, hra: 12800, allowances: 5000 } },
]);
  await db.seed(COL.attendance, [
  { id: 'att_001', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-18', checkIn: '09:02', checkOut: '18:05', status: 'present' },
  { id: 'att_002', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-18', checkIn: '10:15', checkOut: '18:30', status: 'late' },
  { id: 'att_003', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-19', checkIn: '08:58', checkOut: null, status: 'present' },
  { id: 'att_004', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-19', checkIn: '08:45', checkOut: '18:00', status: 'present' },
  { id: 'att_005', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-19', checkIn: '09:00', checkOut: '18:10', status: 'present' },
  { id: 'att_006', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-19', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_007', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-19', checkIn: '08:50', checkOut: '18:05', status: 'present' },
  { id: 'att_008', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-19', checkIn: '09:05', checkOut: '18:20', status: 'present' },
  { id: 'att_009', tenantId: TID, employeeId: 'emp_1008', date: '2026-08-19', checkIn: '10:00', checkOut: '18:30', status: 'late' },
  { id: 'att_010', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-17', checkIn: '08:55', checkOut: '18:00', status: 'present' },
  { id: 'att_011', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-17', checkIn: '09:30', checkOut: '18:15', status: 'late' },
  { id: 'att_012', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-17', checkIn: '08:40', checkOut: '17:55', status: 'present' },
  { id: 'att_013', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-17', checkIn: '09:00', checkOut: null, status: 'present' },
  { id: 'att_014', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-17', checkIn: '08:50', checkOut: '18:10', status: 'present' },
  { id: 'att_015', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-17', checkIn: '09:05', checkOut: '18:20', status: 'present' },
  { id: 'att_016', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-17', checkIn: '08:45', checkOut: '18:00', status: 'present' },
  { id: 'att_017', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-16', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_018', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-16', checkIn: '09:15', checkOut: '18:20', status: 'present' },
  { id: 'att_019', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-16', checkIn: '08:55', checkOut: '18:00', status: 'present' },
  { id: 'att_020', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-16', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_021', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-16', checkIn: '08:45', checkOut: '17:50', status: 'present' },
  { id: 'att_022', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-16', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_023', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-16', checkIn: '09:20', checkOut: '18:25', status: 'late' },
  { id: 'att_024', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-15', checkIn: '08:58', checkOut: '18:02', status: 'present' },
  { id: 'att_025', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-15', checkIn: '09:05', checkOut: '18:10', status: 'present' },
  { id: 'att_026', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-15', checkIn: '08:50', checkOut: '17:55', status: 'present' },
  { id: 'att_027', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-15', checkIn: '09:00', checkOut: '18:00', status: 'present' },
  { id: 'att_028', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-15', checkIn: '08:45', checkOut: '18:05', status: 'present' },
  { id: 'att_029', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-15', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_030', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-15', checkIn: '09:00', checkOut: '18:10', status: 'present' },
  { id: 'att_031', tenantId: TID, employeeId: 'emp_1008', date: '2026-08-15', checkIn: '10:30', checkOut: '18:30', status: 'absent' },
  { id: 'att_032', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-14', checkIn: '08:55', checkOut: '18:00', status: 'present' },
  { id: 'att_033', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-14', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_034', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-14', checkIn: '08:45', checkOut: '17:50', status: 'present' },
  { id: 'att_035', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-14', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_036', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-14', checkIn: '08:50', checkOut: '18:10', status: 'present' },
  { id: 'att_037', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-14', checkIn: '09:05', checkOut: '18:20', status: 'present' },
  { id: 'att_038', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-14', checkIn: '09:15', checkOut: '18:25', status: 'present' },
  { id: 'att_039', tenantId: TID, employeeId: 'emp_1008', date: '2026-08-14', checkIn: '10:00', checkOut: '18:30', status: 'late' },
  { id: 'att_040', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-13', checkIn: '08:52', checkOut: '18:05', status: 'present' },
  { id: 'att_041', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-13', checkIn: '09:00', checkOut: '18:10', status: 'present' },
  { id: 'att_042', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-13', checkIn: '08:45', checkOut: '17:55', status: 'present' },
  { id: 'att_043', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-13', checkIn: '09:05', checkOut: '18:15', status: 'present' },
  { id: 'att_044', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-13', checkIn: '08:50', checkOut: '18:00', status: 'present' },
  { id: 'att_045', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-13', checkIn: '09:10', checkOut: '18:20', status: 'present' },
  { id: 'att_046', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-13', checkIn: '08:55', checkOut: '18:05', status: 'present' },
  { id: 'att_047', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-12', checkIn: '08:50', checkOut: '18:00', status: 'present' },
  { id: 'att_048', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-12', checkIn: '09:15', checkOut: '18:20', status: 'late' },
  { id: 'att_049', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-12', checkIn: '08:42', checkOut: '17:50', status: 'present' },
  { id: 'att_050', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-12', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_051', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-12', checkIn: '08:48', checkOut: '18:10', status: 'present' },
  { id: 'att_052', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-12', checkIn: '09:05', checkOut: '18:15', status: 'present' },
  { id: 'att_053', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-12', checkIn: '09:00', checkOut: '18:00', status: 'present' },
  { id: 'att_054', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-11', checkIn: '08:55', checkOut: '18:05', status: 'present' },
  { id: 'att_055', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-11', checkIn: '09:20', checkOut: '18:25', status: 'late' },
  { id: 'att_056', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-11', checkIn: '08:45', checkOut: '17:55', status: 'present' },
  { id: 'att_057', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-11', checkIn: '09:00', checkOut: '18:00', status: 'present' },
  { id: 'att_058', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-11', checkIn: '08:50', checkOut: '18:05', status: 'present' },
  { id: 'att_059', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-11', checkIn: '09:05', checkOut: '18:10', status: 'present' },
  { id: 'att_060', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-11', checkIn: '08:55', checkOut: '18:00', status: 'present' },
  { id: 'att_061', tenantId: TID, employeeId: 'emp_1008', date: '2026-08-11', checkIn: '09:10', checkOut: '18:20', status: 'present' },
  { id: 'att_062', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-10', checkIn: '08:58', checkOut: '18:02', status: 'present' },
  { id: 'att_063', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-10', checkIn: '09:05', checkOut: '18:10', status: 'present' },
  { id: 'att_064', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-10', checkIn: '08:50', checkOut: '17:55', status: 'present' },
  { id: 'att_065', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-10', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_066', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-10', checkIn: '08:45', checkOut: '18:00', status: 'present' },
  { id: 'att_067', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-10', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_068', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-10', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_069', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-09', checkIn: '08:52', checkOut: '18:00', status: 'present' },
  { id: 'att_070', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-09', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_071', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-09', checkIn: '08:45', checkOut: '17:50', status: 'present' },
  { id: 'att_072', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-09', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_073', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-09', checkIn: '08:50', checkOut: '18:10', status: 'present' },
  { id: 'att_074', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-09', checkIn: '09:05', checkOut: '18:20', status: 'present' },
  { id: 'att_075', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-09', checkIn: '09:15', checkOut: '18:25', status: 'present' },
  { id: 'att_076', tenantId: TID, employeeId: 'emp_1008', date: '2026-08-09', checkIn: '10:00', checkOut: '18:30', status: 'late' },
  { id: 'att_077', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-08', checkIn: '08:55', checkOut: '18:02', status: 'present' },
  { id: 'att_078', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-08', checkIn: '09:05', checkOut: '18:10', status: 'present' },
  { id: 'att_079', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-08', checkIn: '08:50', checkOut: '17:55', status: 'present' },
  { id: 'att_080', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-08', checkIn: '09:00', checkOut: '18:00', status: 'present' },
  { id: 'att_081', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-08', checkIn: '08:45', checkOut: '18:05', status: 'present' },
  { id: 'att_082', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-08', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { id: 'att_083', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-08', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_084', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-07', checkIn: '08:50', checkOut: '18:00', status: 'present' },
  { id: 'att_085', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-07', checkIn: '09:15', checkOut: '18:20', status: 'late' },
  { id: 'att_086', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-07', checkIn: '08:42', checkOut: '17:50', status: 'present' },
  { id: 'att_087', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-07', checkIn: '09:00', checkOut: '18:05', status: 'present' },
  { id: 'att_088', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-07', checkIn: '08:48', checkOut: '18:10', status: 'present' },
  { id: 'att_089', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-07', checkIn: '09:05', checkOut: '18:15', status: 'present' },
  { id: 'att_090', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-07', checkIn: '09:00', checkOut: '18:00', status: 'present' },
  { id: 'att_091', tenantId: TID, employeeId: 'emp_1008', date: '2026-08-07', checkIn: '10:30', checkOut: '18:30', status: 'absent' },
  { id: 'att_092', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-06', checkIn: '08:55', checkOut: '18:05', status: 'present' },
  { id: 'att_093', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-06', checkIn: '09:00', checkOut: '18:10', status: 'present' },
  { id: 'att_094', tenantId: TID, employeeId: 'emp_1003', date: '2026-08-06', checkIn: '08:45', checkOut: '17:55', status: 'present' },
  { id: 'att_095', tenantId: TID, employeeId: 'emp_1004', date: '2026-08-06', checkIn: '09:05', checkOut: '18:15', status: 'present' },
  { id: 'att_096', tenantId: TID, employeeId: 'emp_1005', date: '2026-08-06', checkIn: '08:50', checkOut: '18:00', status: 'present' },
  { id: 'att_097', tenantId: TID, employeeId: 'emp_1006', date: '2026-08-06', checkIn: '09:10', checkOut: '18:20', status: 'present' },
  { id: 'att_098', tenantId: TID, employeeId: 'emp_1007', date: '2026-08-06', checkIn: '08:55', checkOut: '18:05', status: 'present' },
  { id: 'att_099', tenantId: TID, employeeId: 'emp_1001', date: '2026-08-05', checkIn: '08:52', checkOut: '18:00', status: 'present' },
  { id: 'att_100', tenantId: TID, employeeId: 'emp_1002', date: '2026-08-05', checkIn: '09:05', checkOut: '18:10', status: 'present' },
]);
  await db.seed(COL.leaveTypes, [
  { id: 'lv_cl', tenantId: TID, name: 'Casual Leave', annualQuota: 12 },
  { id: 'lv_sl', tenantId: TID, name: 'Sick Leave', annualQuota: 10 },
  { id: 'lv_pl', tenantId: TID, name: 'Privilege Leave', annualQuota: 18 },
]);
  await db.seed(COL.leaveBalances, [
  { id: 'lb_001', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_cl', balance: 9 },
  { id: 'lb_002', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_sl', balance: 7 },
  { id: 'lb_003', tenantId: TID, employeeId: 'emp_1002', leaveTypeId: 'lv_cl', balance: 10 },
]);
  await db.seed(COL.leaveApps, [
  { id: 'la_001', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_cl', from: '2026-08-25', to: '2026-08-26', days: 2, reason: 'Personal work', status: 'pending' },
  { id: 'la_002', tenantId: TID, employeeId: 'emp_1002', leaveTypeId: 'lv_sl', from: '2026-08-20', to: '2026-08-21', days: 2, reason: 'Fever and cold', status: 'approved' },
  { id: 'la_003', tenantId: TID, employeeId: 'emp_1003', leaveTypeId: 'lv_pl', from: '2026-09-01', to: '2026-09-05', days: 5, reason: 'Family function', status: 'approved' },
  { id: 'la_004', tenantId: TID, employeeId: 'emp_1004', leaveTypeId: 'lv_cl', from: '2026-08-28', to: '2026-08-29', days: 2, reason: 'Weekend trip', status: 'pending' },
  { id: 'la_005', tenantId: TID, employeeId: 'emp_1006', leaveTypeId: 'lv_sl', from: '2026-08-22', to: '2026-08-23', days: 2, reason: 'Health checkup', status: 'approved' },
  { id: 'la_006', tenantId: TID, employeeId: 'emp_1005', leaveTypeId: 'lv_pl', from: '2026-07-15', to: '2026-07-17', days: 3, reason: 'Vacation', status: 'approved' },
  { id: 'la_007', tenantId: TID, employeeId: 'emp_1007', leaveTypeId: 'lv_cl', from: '2026-08-30', to: '2026-08-31', days: 2, reason: 'Personal work', status: 'rejected' },
  { id: 'la_008', tenantId: TID, employeeId: 'emp_1001', leaveTypeId: 'lv_pl', from: '2026-07-10', to: '2026-07-12', days: 3, reason: 'Festival', status: 'approved' },
]);
  await db.seed(COL.payrollRuns, [
  { id: 'pr_0001', tenantId: TID, periodStart: '2026-07-01', periodEnd: '2026-07-31', status: 'paid', employeeCount: 4, totalGross: 412000, totalDeductions: 58400, totalNet: 353600 },
]);
  await db.seed(COL.training, [
  { id: 'trn_001', tenantId: TID, employeeId: 'emp_1001', name: 'Advanced CNC Operation', provider: 'SkillPro India', startDate: '2026-03-01', endDate: '2026-03-15', completionPct: 100, status: 'completed', certificate: 'CERT-CNC-2026-001' },
  { id: 'trn_002', tenantId: TID, employeeId: 'emp_1003', name: 'Supervisory Skills', provider: 'MGI HR Solutions', startDate: '2026-04-10', endDate: '2026-04-20', completionPct: 100, status: 'completed', certificate: 'CERT-SUP-2026-002' },
  { id: 'trn_003', tenantId: TID, employeeId: 'emp_1004', name: 'Financial Reporting Standards', provider: 'ICAI', startDate: '2026-05-05', endDate: '2026-05-15', completionPct: 100, status: 'completed', certificate: null },
  { id: 'trn_004', tenantId: TID, employeeId: 'emp_1002', name: 'HR Analytics Workshop', provider: 'PeopleStrong', startDate: '2026-06-12', endDate: '2026-06-14', completionPct: 100, status: 'completed', certificate: 'CERT-HRA-2026-003' },
  { id: 'trn_005', tenantId: TID, employeeId: 'emp_1006', name: 'Lean Manufacturing', provider: 'QAI Global', startDate: '2026-07-01', endDate: '2026-07-10', completionPct: 80, status: 'in-progress', certificate: null },
  { id: 'trn_006', tenantId: TID, employeeId: 'emp_1007', name: 'Safety and Hazard Management', provider: 'SafetyFirst', startDate: '2026-07-20', endDate: '2026-07-25', completionPct: 100, status: 'completed', certificate: 'CERT-SAF-2026-004' },
  { id: 'trn_007', tenantId: TID, employeeId: 'emp_1008', name: 'Payroll Compliance Update', provider: 'MGI HR Solutions', startDate: '2026-08-01', endDate: '2026-08-05', completionPct: 100, status: 'completed', certificate: null },
  { id: 'trn_008', tenantId: TID, employeeId: 'emp_1001', name: 'Industrial IoT Basics', provider: 'TechBridge', startDate: '2026-08-15', endDate: '2026-08-30', completionPct: 40, status: 'in-progress', certificate: null },
]);
}
init().catch(console.error);

export default router;
