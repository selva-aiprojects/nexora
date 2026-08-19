import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, parseQueryInt, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, requireRole, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = {
  accounts: 'accounting_accounts',
  journals: 'accounting_journal_entries',
  customers: 'accounting_customers',
  vendors: 'accounting_vendors',
  sales: 'accounting_sales_invoices',
  purchases: 'accounting_purchase_invoices',
  receipts: 'accounting_receipts',
  payments: 'accounting_payments',
  banks: 'accounting_bank_accounts',
  gst: 'accounting_gst_returns',
};

// ----------------------------- Seed data -----------------------------
const accounts = [
  { id: 'acc_1001', tenantId: TID, code: '1001', name: 'Cash in Hand', type: 'Asset', isGroup: false, opening: 250000 },
  { id: 'acc_1002', tenantId: TID, code: '1002', name: 'Bank – Current', type: 'Asset', isGroup: false, opening: 8400000 },
  { id: 'acc_1100', tenantId: TID, code: '1100', name: 'Sundry Debtors', type: 'Asset', isGroup: false, opening: 3100000 },
  { id: 'acc_1200', tenantId: TID, code: '1200', name: 'Inventory', type: 'Asset', isGroup: false, opening: 12200000 },
  { id: 'acc_2001', tenantId: TID, code: '2001', name: 'Sundry Creditors', type: 'Liability', isGroup: false, opening: 2400000 },
  { id: 'acc_2002', tenantId: TID, code: '2002', name: 'GST Payable', type: 'Liability', isGroup: false, opening: 0 },
  { id: 'acc_3001', tenantId: TID, code: '3001', name: 'Owner’s Equity', type: 'Equity', isGroup: false, opening: 20000000 },
  { id: 'acc_4001', tenantId: TID, code: '4001', name: 'Sales Revenue', type: 'Revenue', isGroup: false, opening: 0 },
  { id: 'acc_5001', tenantId: TID, code: '5001', name: 'Purchases', type: 'Expense', isGroup: false, opening: 0 },
  { id: 'acc_5002', tenantId: TID, code: '5002', name: 'Salaries', type: 'Expense', isGroup: false, opening: 0 },
];

const customers = [
  { id: 'cus_001', tenantId: TID, name: 'Sharma Traders', gstin: '27AAACS1234A1Z2', email: 'ap@sharmatraders.com', creditLimit: 500000, outstanding: 384000 },
  { id: 'cus_002', tenantId: TID, name: 'Patel Logistics', gstin: '24AABCP5678B1Z9', email: 'ops@patellog.com', creditLimit: 300000, outstanding: 54000 },
  { id: 'cus_003', tenantId: TID, name: 'Apex Pharma', gstin: '27AAAAP9999C1Z5', email: 'fin@apexpharma.in', creditLimit: 1000000, outstanding: 0 },
];

const vendors = [
  { id: 'ven_001', tenantId: TID, name: 'Steel Mart Pvt Ltd', gstin: '29AAACS7777D1Z3', email: 'billing@steelmart.in', outstanding: 420000 },
  { id: 'ven_002', tenantId: TID, name: 'Power Components', gstin: '29AABCP2222E1Z8', email: 'accounts@powercomp.in', outstanding: 198750 },
];

function salesInvoice(number: string, customerId: string, customerName: string, date: string, dueDate: string, status: string, lineItems: any[], paid = 0) {
  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
  const gstTotal = lineItems.reduce((s, l) => s + (l.amount * l.gstRate) / 100, 0);
  const total = Math.round(subtotal + gstTotal);
  return { id: '', tenantId: TID, number, customerId, customerName, date, dueDate, status, lineItems, subtotal, gstTotal: Math.round(gstTotal), total, paid };
}

const salesSeed = [
  salesInvoice('INV-2291', 'cus_001', 'Sharma Traders', '2026-07-12', '2026-08-12', 'overdue', [{ item: 'Industrial Pump', qty: 2, rate: 60000, amount: 120000, gstRate: 18 }], 0),
  salesInvoice('INV-2292', 'cus_002', 'Patel Logistics', '2026-08-01', '2026-09-01', 'pending', [{ item: 'Logistics Kit', qty: 5, rate: 10800, amount: 54000, gstRate: 18 }], 0),
  salesInvoice('INV-2293', 'cus_003', 'Apex Pharma', '2026-07-05', '2026-08-05', 'paid', [{ item: 'Lab Consumables', qty: 12, rate: 26000, amount: 312000, gstRate: 12 }], 349440),
  salesInvoice('INV-2295', 'cus_003', 'Apex Pharma', '2026-08-08', '2026-09-08', 'paid', [{ item: 'Lab Consumables', qty: 8, rate: 24844, amount: 198752, gstRate: 12 }], 222602),
].map((inv, i) => ({ ...inv, id: `sin_${String(i + 1).padStart(4, '0')}` }));

const purchaseSeed = [
  { id: 'pin_0001', tenantId: TID, number: 'PUR-1042', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-07-20', dueDate: '2026-08-20', status: 'pending', lineItems: [{ item: 'Steel Coil', qty: 10, rate: 42000, amount: 420000, gstRate: 18 }], subtotal: 420000, gstTotal: 75600, total: 495600, paid: 75600 },
  { id: 'pin_0002', tenantId: TID, number: 'PUR-1043', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-08-02', dueDate: '2026-09-02', status: 'approved', lineItems: [{ item: 'Control Panel', qty: 3, rate: 59500, amount: 178500, gstRate: 18 }], subtotal: 178500, gstTotal: 32130, total: 210630, paid: 0 },
].map((p) => p);

const banks = [
  { id: 'bnk_001', tenantId: TID, name: 'HDFC Current', ifsc: 'HDFC0001234', balance: 8400000 },
  { id: 'bnk_002', tenantId: TID, name: 'SBI Cash', ifsc: 'SBIN0005678', balance: 250000 },
];

const gstSeed = [
  { id: 'gst_001', tenantId: TID, type: 'GSTR-1', period: '2026-07', status: 'filed', totalTax: 184320, filedOn: '2026-08-11' },
  { id: 'gst_002', tenantId: TID, type: 'GSTR-3B', period: '2026-07', status: 'filed', totalTax: 184320, filedOn: '2026-08-11' },
  { id: 'gst_003', tenantId: TID, type: 'GSTR-3B', period: '2026-08', status: 'pending', totalTax: 142000, filedOn: null },
];

db.seed(COL.accounts, accounts);
db.seed(COL.customers, customers);
db.seed(COL.vendors, vendors);
db.seed(COL.sales, salesSeed);
db.seed(COL.purchases, purchaseSeed);
db.seed(COL.banks, banks);
db.seed(COL.gst, gstSeed);

// ----------------------------- Helpers -----------------------------
function agingBuckets(invoices: any[], kind: 'receivable' | 'payable') {
  const today = new Date('2026-08-19');
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const inv of invoices) {
    const outstanding = inv.total - (inv.paid ?? 0);
    if (outstanding <= 0 || inv.status === 'cancelled') continue;
    const due = new Date(inv.dueDate);
    const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
    if (days <= 0) buckets['0-30'] += outstanding;
    else if (days <= 30) buckets['0-30'] += outstanding;
    else if (days <= 60) buckets['31-60'] += outstanding;
    else if (days <= 90) buckets['61-90'] += outstanding;
    else buckets['90+'] += outstanding;
  }
  return buckets;
}

// ----------------------------- Routes -----------------------------
// Chart of Accounts
router.get('/accounts', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.accounts);
  if (req.query.type) rows = rows.filter((a) => a.type === req.query.type);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/accounts', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['code', 'name', 'type']);
  const row = db.insert(TID, COL.accounts, { ...req.body, isGroup: false, opening: req.body.opening ?? 0 });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'accounting', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Journal entries
router.get('/journal-entries', requireAuth, asyncHandler(async (req, res) => {
  const rows = db.all(TID, COL.journals).sort((a, b) => b.date.localeCompare(a.date));
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/journal-entries', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['date', 'narration', 'entries']);
  const row = db.insert(TID, COL.journals, { ...req.body, number: db.nextId('JE', COL.journals), status: 'draft' });
  res.status(201).json(row);
}));
router.post('/journal-entries/:id/post', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const updated = db.update(TID, COL.journals, req.params.id, { status: 'posted' });
  notFoundIfUndefined(updated, 'Journal entry not found');
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'post', module: 'accounting', recordRef: updated.id, newState: { status: 'posted' }, ip: req.ip });
  res.json(updated);
}));

// Customers & Vendors
router.get('/customers', requireAuth, asyncHandler(async (req, res) => {
  const rows = db.all(TID, COL.customers);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/vendors', requireAuth, asyncHandler(async (req, res) => {
  const rows = db.all(TID, COL.vendors);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

// Sales invoices
router.get('/sales-invoices', requireAuth, asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = db.all(TID, COL.sales).sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));
router.post('/sales-invoices', requireAuth, requireRole('finance', 'accountant', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['customerId', 'date', 'dueDate', 'lineItems']);
  const customer = db.byId(TID, COL.customers, req.body.customerId);
  notFoundIfUndefined(customer, 'Customer not found');
  const subtotal = req.body.lineItems.reduce((s: number, l: any) => s + l.amount, 0);
  const gstTotal = req.body.lineItems.reduce((s: number, l: any) => s + (l.amount * (l.gstRate ?? 0)) / 100, 0);
  const row = db.insert(TID, COL.sales, {
    number: db.nextId('INV', COL.sales),
    customerName: customer.name,
    status: 'pending',
    subtotal, gstTotal: Math.round(gstTotal), total: Math.round(subtotal + gstTotal), paid: 0,
    ...req.body,
  });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'accounting', recordRef: row.number, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.post('/sales-invoices/:id/receipts', requireAuth, requireRole('finance', 'accountant', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const inv = notFoundIfUndefined(db.byId(TID, COL.sales, req.params.id), 'Invoice not found');
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest('amount must be positive');
  db.insert(TID, COL.receipts, { id: db.nextId('rcpt', COL.receipts), salesInvoiceId: inv.id, date: req.body.date ?? new Date().toISOString().slice(0, 10), amount });
  const paid = (inv.paid ?? 0) + amount;
  const status = paid >= inv.total ? 'paid' : inv.status;
  const updated = db.update(TID, COL.sales, inv.id, { paid, status });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'accounting', recordRef: inv.number, newState: { paid }, ip: req.ip });
  res.json(updated);
}));

// Purchase invoices
router.get('/purchase-invoices', requireAuth, asyncHandler(async (req, res) => {
  const rows = db.all(TID, COL.purchases);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/purchase-invoices/:id/approve', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const inv = notFoundIfUndefined(db.byId(TID, COL.purchases, req.params.id), 'Invoice not found');
  const updated = db.update(TID, COL.purchases, inv.id, { status: 'approved' });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'approve', module: 'accounting', recordRef: inv.number, oldState: { status: inv.status }, newState: { status: 'approved' }, ip: req.ip });
  res.json(updated);
}));
router.post('/purchase-invoices/:id/payments', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const inv = notFoundIfUndefined(db.byId(TID, COL.purchases, req.params.id), 'Invoice not found');
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest('amount must be positive');
  db.insert(TID, COL.payments, { id: db.nextId('pay', COL.payments), purchaseInvoiceId: inv.id, date: req.body.date ?? new Date().toISOString().slice(0, 10), amount });
  const paid = (inv.paid ?? 0) + amount;
  const updated = db.update(TID, COL.purchases, inv.id, { paid, status: paid >= inv.total ? 'paid' : inv.status });
  res.json(updated);
}));

// Banking
router.get('/bank-accounts', requireAuth, asyncHandler(async (req, res) => {
  res.json(db.all(TID, COL.banks));
}));

// GST
router.get('/gst/returns', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.gst);
  if (req.query.type) rows = rows.filter((g) => g.type === req.query.type);
  if (req.query.status) rows = rows.filter((g) => g.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/gst/returns/:id/file', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const ret = notFoundIfUndefined(db.byId(TID, COL.gst, req.params.id), 'Return not found');
  const updated = db.update(TID, COL.gst, ret.id, { status: 'filed', filedOn: new Date().toISOString().slice(0, 10) });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'accounting', recordRef: ret.id, newState: { status: 'filed' }, ip: req.ip });
  res.json(updated);
}));

// Reports
router.get('/reports/receivables-aging', requireAuth, asyncHandler(async (req, res) => {
  res.json(agingBuckets(db.all(TID, COL.sales), 'receivable'));
}));
router.get('/reports/payables-aging', requireAuth, asyncHandler(async (req, res) => {
  res.json(agingBuckets(db.all(TID, COL.purchases), 'payable'));
}));
router.get('/reports/trial-balance', requireAuth, asyncHandler(async (req, res) => {
  const accountsList = db.all(TID, COL.accounts);
  const rows = accountsList.map((a) => ({ code: a.code, name: a.name, type: a.type, opening: a.opening, debit: 0, credit: 0, closing: a.opening }));
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  res.json({ rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit });
}));
router.get('/reports/profit-loss', requireAuth, asyncHandler(async (req, res) => {
  const revenue = db.all(TID, COL.sales).reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
  const purchases = db.all(TID, COL.purchases).reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
  const gst = db.all(TID, COL.gst).filter((g) => g.status === 'filed').reduce((s, g) => s + g.totalTax, 0);
  const netProfit = revenue - purchases - gst;
  res.json({
    revenue, purchases, gstPaid: gst, operatingExpense: purchases + gst,
    netProfit, marginPct: revenue ? +((netProfit / revenue) * 100).toFixed(1) : 0,
  });
}));
router.get('/reports/balance-sheet', requireAuth, asyncHandler(async (req, res) => {
  const cash = db.all(TID, COL.banks).reduce((s, b) => s + b.balance, 0);
  const debtors = db.all(TID, COL.sales).reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const inventory = 12200000;
  const creditors = db.all(TID, COL.purchases).reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const equity = 20000000;
  const assets = cash + debtors + inventory;
  const liabilities = creditors + equity;
  res.json({
    assets: { cash, debtors, inventory, total: assets },
    liabilities: { creditors, equity, total: liabilities },
    balanced: assets === liabilities,
  });
}));

// Dashboard KPIs for the finance module
router.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const sales = db.all(TID, COL.sales);
  const purchases = db.all(TID, COL.purchases);
  const receivables = sales.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const payables = purchases.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const cash = db.all(TID, COL.banks).reduce((s, b) => s + b.balance, 0);
  const overdue = sales.filter((i) => i.status === 'overdue').length;
  res.json({ revenue: sales.reduce((s, i) => s + i.total, 0), receivables, payables, cash, overdueInvoices: overdue });
}));

export default router;
