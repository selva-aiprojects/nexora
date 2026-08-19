import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';

// ESS reads/writes the same collections owned by HRMS — modules never query
// each other's tables directly in the PRD's model, but here the ESS surface
// is a thin, employee-scoped view over the People domain.
const EMP_COL = 'hrms_employees';
const ATT_COL = 'hrms_attendance';
const LEAVE_COL = 'hrms_leave_applications';
const PAY_COL = 'hrms_payslips';
const EXP_COL = 'ess_expenses';
const DOC_COL = 'dms_documents';

db.seed(EXP_COL, [
  { id: 'exp_001', tenantId: TID, employeeId: 'emp_1001', category: 'Travel', amount: 1850, date: '2026-08-12', status: 'submitted', description: 'Client visit Bengaluru' },
  { id: 'exp_002', tenantId: TID, employeeId: 'emp_1001', category: 'Meals', amount: 540, date: '2026-08-15', status: 'reimbursed', description: 'Team lunch' },
]);
db.seed(DOC_COL, [
  { id: 'doc_001', tenantId: TID, name: 'Offer Letter - Vikram Singh.pdf', category: 'employee', ownerId: 'emp_1001', folderId: 'fol_emp', tags: ['offer', 'confidential'], mimeType: 'application/pdf', size: 240000, createdAt: '2024-03-01', currentVersion: 1 },
]);

function empId(req: any): string {
  const id = req.user?.employeeId;
  if (!id) throw ApiError.forbidden('ESS is available to employees only');
  return id;
}

/** GET /api/ess/home — mobile ESS home summary for the current employee. */
router.get('/home', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  const today = new Date().toISOString().slice(0, 10);
  const employee = notFoundIfUndefined(db.byId(TID, EMP_COL, eid), 'Employee profile not found');
  const attendanceToday = db.query(TID, ATT_COL, (a) => a.employeeId === eid && a.date === today)[0] ?? null;
  const leaveBalances = db.query(TID, 'hrms_leave_balances', (b) => b.employeeId === eid);
  const payslips = db.query(TID, PAY_COL, (p) => p.employeeId === eid).sort((a, b) => b.period.localeCompare(a.period));
  const pendingLeave = db.query(TID, LEAVE_COL, (l) => l.employeeId === eid && l.status === 'pending').length;
  const pendingExpenses = db.query(TID, EXP_COL, (e) => e.employeeId === eid && e.status === 'submitted').length;
  const announcements = [
    { id: 'an_001', title: 'GST filing due this week', body: 'Finance team is preparing GSTR-3B for August.' },
    { id: 'an_002', title: 'Holiday on 15 Aug', body: 'Independence Day — office closed.' },
  ];
  res.json({
    employee: { name: employee.name, code: employee.employeeCode, department: employee.departmentId },
    attendanceStatus: attendanceToday ? { checkedIn: true, checkIn: attendanceToday.checkIn, status: attendanceToday.status } : { checkedIn: false },
    leaveBalances,
    latestPayslip: payslips[0] ?? null,
    pendingActions: { leave: pendingLeave, expenses: pendingExpenses },
    announcements,
  });
}));

// Attendance (mobile check-in/out)
router.post('/attendance/check-in', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  const today = new Date().toISOString().slice(0, 10);
  if (db.query(TID, ATT_COL, (a) => a.employeeId === eid && a.date === today)[0]) throw ApiError.conflict('Already checked in today');
  const row = db.insert(TID, ATT_COL, { employeeId: eid, date: today, checkIn: new Date().toTimeString().slice(0, 5), checkOut: null, status: 'present', gps: req.body?.gps });
  res.status(201).json(row);
}));
router.post('/attendance/check-out', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  const today = new Date().toISOString().slice(0, 10);
  const rec = db.query(TID, ATT_COL, (a) => a.employeeId === eid && a.date === today)[0];
  if (!rec) throw ApiError.notFound('No check-in found for today');
  res.json(db.update(TID, ATT_COL, rec.id, { checkOut: new Date().toTimeString().slice(0, 5) }));
}));

// Leave
router.get('/leave', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  const rows = db.query(TID, LEAVE_COL, (l) => l.employeeId === eid);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/leave', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  requireBody(req.body, ['leaveTypeId', 'from', 'to', 'days']);
  const row = db.insert(TID, LEAVE_COL, { employeeId: eid, status: 'pending', reason: req.body.reason ?? '', ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'ess', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Expenses
router.get('/expenses', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  let rows = db.query(TID, EXP_COL, (e) => e.employeeId === eid);
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/expenses', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  requireBody(req.body, ['category', 'amount', 'date']);
  const row = db.insert(TID, EXP_COL, { employeeId: eid, status: 'submitted', description: req.body.description ?? '', ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'ess', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Payslips & Documents (self-service)
router.get('/payslips', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  const rows = db.query(TID, PAY_COL, (p) => p.employeeId === eid).sort((a, b) => b.period.localeCompare(a.period));
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/documents', requireAuth, asyncHandler(async (req, res) => {
  const eid = empId(req);
  const rows = db.query(TID, DOC_COL, (d) => d.ownerId === eid || d.category === 'policy');
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

export default router;
