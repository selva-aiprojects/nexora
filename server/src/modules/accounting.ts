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
  budgets: 'accounting_budgets',
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
  salesInvoice('INV-2296', 'cus_001', 'Sharma Traders', '2026-03-15', '2026-04-15', 'paid', [{ item: 'Valve Assembly', qty: 10, rate: 4500, amount: 45000, gstRate: 18 }], 53100),
  salesInvoice('INV-2297', 'cus_002', 'Patel Logistics', '2026-03-28', '2026-04-28', 'paid', [{ item: 'Packaging Box', qty: 200, rate: 180, amount: 36000, gstRate: 12 }], 40320),
  salesInvoice('INV-2298', 'cus_003', 'Apex Pharma', '2026-04-10', '2026-05-10', 'paid', [{ item: 'Lab Consumables', qty: 6, rate: 27500, amount: 165000, gstRate: 12 }], 184800),
  salesInvoice('INV-2299', 'cus_001', 'Sharma Traders', '2026-04-22', '2026-05-22', 'overdue', [{ item: 'Control Panel', qty: 3, rate: 38000, amount: 114000, gstRate: 18 }], 0),
  salesInvoice('INV-2300', 'cus_002', 'Patel Logistics', '2026-05-05', '2026-06-05', 'paid', [{ item: 'Logistics Kit', qty: 8, rate: 10200, amount: 81600, gstRate: 18 }], 96288),
  salesInvoice('INV-2301', 'cus_003', 'Apex Pharma', '2026-05-18', '2026-06-18', 'paid', [{ item: 'Testing Kit', qty: 4, rate: 15000, amount: 60000, gstRate: 18 }], 70800),
  salesInvoice('INV-2302', 'cus_001', 'Sharma Traders', '2026-06-02', '2026-07-02', 'overdue', [{ item: 'Copper Wire', qty: 50, rate: 195, amount: 9750, gstRate: 18 }], 0),
  salesInvoice('INV-2303', 'cus_002', 'Patel Logistics', '2026-06-15', '2026-07-15', 'paid', [{ item: 'Steel Coil', qty: 20, rate: 4400, amount: 88000, gstRate: 18 }], 103840),
  salesInvoice('INV-2304', 'cus_003', 'Apex Pharma', '2026-06-28', '2026-07-28', 'paid', [{ item: 'Pharma Vials', qty: 500, rate: 420, amount: 210000, gstRate: 12 }], 235200),
  salesInvoice('INV-2305', 'cus_001', 'Sharma Traders', '2026-07-20', '2026-08-20', 'pending', [{ item: 'Motor Assembly', qty: 5, rate: 3400, amount: 17000, gstRate: 18 }], 0),
  salesInvoice('INV-2306', 'cus_002', 'Patel Logistics', '2026-08-10', '2026-09-10', 'pending', [{ item: 'Packaging Material', qty: 100, rate: 250, amount: 25000, gstRate: 12 }], 0),
  salesInvoice('INV-2307', 'cus_003', 'Apex Pharma', '2026-08-15', '2026-09-15', 'cancelled', [{ item: 'Lab Equipment', qty: 2, rate: 85000, amount: 170000, gstRate: 18 }], 0),
  salesInvoice('INV-2308', 'cus_001', 'Sharma Traders', '2026-07-01', '2026-08-01', 'paid', [{ item: 'Industrial Pump', qty: 1, rate: 10500, amount: 10500, gstRate: 18 }], 12390),
  salesInvoice('INV-2309', 'cus_003', 'Apex Pharma', '2026-03-08', '2026-04-08', 'paid', [{ item: 'Safety Gears', qty: 50, rate: 850, amount: 42500, gstRate: 18 }], 50150),
  salesInvoice('INV-2310', 'cus_001', 'Sharma Traders', '2026-05-12', '2026-06-12', 'paid', [{ item: 'Bearing Set', qty: 20, rate: 1200, amount: 24000, gstRate: 18 }], 28320),
  salesInvoice('INV-2311', 'cus_002', 'Patel Logistics', '2026-04-18', '2026-05-18', 'overdue', [{ item: 'Forklift Tyres', qty: 8, rate: 6500, amount: 52000, gstRate: 18 }], 0),
].map((inv, i) => ({ ...inv, id: `sin_${String(i + 1).padStart(4, '0')}` }));

const purchaseSeed = [
  { id: 'pin_0001', tenantId: TID, number: 'PUR-1042', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-07-20', dueDate: '2026-08-20', status: 'pending', lineItems: [{ item: 'Steel Coil', qty: 10, rate: 42000, amount: 420000, gstRate: 18 }], subtotal: 420000, gstTotal: 75600, total: 495600, paid: 75600 },
  { id: 'pin_0002', tenantId: TID, number: 'PUR-1043', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-08-02', dueDate: '2026-09-02', status: 'approved', lineItems: [{ item: 'Control Panel', qty: 3, rate: 59500, amount: 178500, gstRate: 18 }], subtotal: 178500, gstTotal: 32130, total: 210630, paid: 0 },
  { id: 'pin_0003', tenantId: TID, number: 'PUR-1038', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-03-10', dueDate: '2026-04-10', status: 'paid', lineItems: [{ item: 'Steel Coil', qty: 15, rate: 41000, amount: 615000, gstRate: 18 }], subtotal: 615000, gstTotal: 110700, total: 725700, paid: 725700 },
  { id: 'pin_0004', tenantId: TID, number: 'PUR-1039', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-04-05', dueDate: '2026-05-05', status: 'paid', lineItems: [{ item: 'Electrical Cables', qty: 100, rate: 950, amount: 95000, gstRate: 18 }], subtotal: 95000, gstTotal: 17100, total: 112100, paid: 112100 },
  { id: 'pin_0005', tenantId: TID, number: 'PUR-1040', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-05-18', dueDate: '2026-06-18', status: 'paid', lineItems: [{ item: 'Raw Steel Sheets', qty: 50, rate: 2800, amount: 140000, gstRate: 18 }], subtotal: 140000, gstTotal: 25200, total: 165200, paid: 165200 },
  { id: 'pin_0006', tenantId: TID, number: 'PUR-1041', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-06-22', dueDate: '2026-07-22', status: 'overdue', lineItems: [{ item: 'Switch Gears', qty: 8, rate: 12500, amount: 100000, gstRate: 18 }], subtotal: 100000, gstTotal: 18000, total: 118000, paid: 0 },
  { id: 'pin_0007', tenantId: TID, number: 'PUR-1044', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-08-10', dueDate: '2026-09-10', status: 'pending', lineItems: [{ item: 'Industrial Pumps', qty: 5, rate: 24000, amount: 120000, gstRate: 18 }], subtotal: 120000, gstTotal: 21600, total: 141600, paid: 0 },
  { id: 'pin_0008', tenantId: TID, number: 'PUR-1045', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-08-15', dueDate: '2026-09-15', status: 'cancelled', lineItems: [{ item: 'Motor Winding', qty: 12, rate: 4500, amount: 54000, gstRate: 18 }], subtotal: 54000, gstTotal: 9720, total: 63720, paid: 0 },
  { id: 'pin_0009', tenantId: TID, number: 'PUR-1046', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-07-05', dueDate: '2026-08-05', status: 'paid', lineItems: [{ item: 'Welding Rods', qty: 200, rate: 280, amount: 56000, gstRate: 18 }], subtotal: 56000, gstTotal: 10080, total: 66080, paid: 66080 },
  { id: 'pin_0010', tenantId: TID, number: 'PUR-1047', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-06-10', dueDate: '2026-07-10', status: 'paid', lineItems: [{ item: 'Capacitors', qty: 50, rate: 1800, amount: 90000, gstRate: 18 }], subtotal: 90000, gstTotal: 16200, total: 106200, paid: 106200 },
  { id: 'pin_0011', tenantId: TID, number: 'PUR-1048', vendorId: 'ven_001', vendorName: 'Steel Mart Pvt Ltd', date: '2026-05-02', dueDate: '2026-06-02', status: 'paid', lineItems: [{ item: 'Fasteners Set', qty: 500, rate: 95, amount: 47500, gstRate: 18 }], subtotal: 47500, gstTotal: 8550, total: 56050, paid: 56050 },
  { id: 'pin_0012', tenantId: TID, number: 'PUR-1049', vendorId: 'ven_002', vendorName: 'Power Components', date: '2026-04-15', dueDate: '2026-05-15', status: 'paid', lineItems: [{ item: 'Relays', qty: 30, rate: 2200, amount: 66000, gstRate: 18 }], subtotal: 66000, gstTotal: 11880, total: 77880, paid: 77880 },
].map((p) => p);

const banks = [
  { id: 'bnk_001', tenantId: TID, name: 'HDFC Current', ifsc: 'HDFC0001234', balance: 8400000 },
  { id: 'bnk_002', tenantId: TID, name: 'SBI Cash', ifsc: 'SBIN0005678', balance: 250000 },
];

const gstSeed = [
  { id: 'gst_001', tenantId: TID, type: 'GSTR-1', period: '2026-07', status: 'filed', totalTax: 184320, filedOn: '2026-08-11' },
  { id: 'gst_002', tenantId: TID, type: 'GSTR-3B', period: '2026-07', status: 'filed', totalTax: 184320, filedOn: '2026-08-11' },
  { id: 'gst_003', tenantId: TID, type: 'GSTR-3B', period: '2026-08', status: 'pending', totalTax: 142000, filedOn: null },
  { id: 'gst_004', tenantId: TID, type: 'GSTR-1', period: '2026-03', status: 'filed', totalTax: 145800, filedOn: '2026-04-10' },
  { id: 'gst_005', tenantId: TID, type: 'GSTR-3B', period: '2026-03', status: 'filed', totalTax: 145800, filedOn: '2026-04-10' },
  { id: 'gst_006', tenantId: TID, type: 'GSTR-1', period: '2026-04', status: 'filed', totalTax: 162500, filedOn: '2026-05-11' },
  { id: 'gst_007', tenantId: TID, type: 'GSTR-3B', period: '2026-04', status: 'filed', totalTax: 162500, filedOn: '2026-05-11' },
  { id: 'gst_008', tenantId: TID, type: 'GSTR-1', period: '2026-05', status: 'filed', totalTax: 178900, filedOn: '2026-06-11' },
  { id: 'gst_009', tenantId: TID, type: 'GSTR-3B', period: '2026-05', status: 'filed', totalTax: 178900, filedOn: '2026-06-11' },
  { id: 'gst_010', tenantId: TID, type: 'GSTR-1', period: '2026-06', status: 'filed', totalTax: 195600, filedOn: '2026-07-11' },
  { id: 'gst_011', tenantId: TID, type: 'GSTR-3B', period: '2026-06', status: 'filed', totalTax: 195600, filedOn: '2026-07-11' },
  { id: 'gst_012', tenantId: TID, type: 'GSTR-1', period: '2026-08', status: 'pending', totalTax: 168400, filedOn: null },
];

const budgetSeed = [
  { id: 'bud_acct_001', tenantId: TID, department: 'Manufacturing', month: '2026-04', revenueBudget: 4500000, expenseBudget: 3200000 },
  { id: 'bud_acct_002', tenantId: TID, department: 'Manufacturing', month: '2026-05', revenueBudget: 4600000, expenseBudget: 3250000 },
  { id: 'bud_acct_003', tenantId: TID, department: 'Manufacturing', month: '2026-06', revenueBudget: 4800000, expenseBudget: 3400000 },
  { id: 'bud_acct_004', tenantId: TID, department: 'Manufacturing', month: '2026-07', revenueBudget: 4700000, expenseBudget: 3350000 },
  { id: 'bud_acct_005', tenantId: TID, department: 'Manufacturing', month: '2026-08', revenueBudget: 4900000, expenseBudget: 3500000 },
  { id: 'bud_acct_006', tenantId: TID, department: 'Sales', month: '2026-04', revenueBudget: 2800000, expenseBudget: 1200000 },
  { id: 'bud_acct_007', tenantId: TID, department: 'Sales', month: '2026-05', revenueBudget: 2900000, expenseBudget: 1250000 },
  { id: 'bud_acct_008', tenantId: TID, department: 'Sales', month: '2026-06', revenueBudget: 3000000, expenseBudget: 1300000 },
  { id: 'bud_acct_009', tenantId: TID, department: 'Sales', month: '2026-07', revenueBudget: 3100000, expenseBudget: 1350000 },
  { id: 'bud_acct_010', tenantId: TID, department: 'Sales', month: '2026-08', revenueBudget: 3200000, expenseBudget: 1400000 },
  { id: 'bud_acct_011', tenantId: TID, department: 'HR', month: '2026-04', revenueBudget: 0, expenseBudget: 450000 },
  { id: 'bud_acct_012', tenantId: TID, department: 'HR', month: '2026-05', revenueBudget: 0, expenseBudget: 460000 },
  { id: 'bud_acct_013', tenantId: TID, department: 'HR', month: '2026-06', revenueBudget: 0, expenseBudget: 470000 },
  { id: 'bud_acct_014', tenantId: TID, department: 'HR', month: '2026-07', revenueBudget: 0, expenseBudget: 480000 },
  { id: 'bud_acct_015', tenantId: TID, department: 'HR', month: '2026-08', revenueBudget: 0, expenseBudget: 490000 },
];










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
  let rows = await db.all(TID, COL.accounts);
  if (req.query.type) rows = rows.filter((a) => a.type === req.query.type);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/accounts', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['code', 'name', 'type']);
  const row = await db.insert(TID, COL.accounts, { ...req.body, isGroup: false, opening: req.body.opening ?? 0 });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'accounting', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Journal entries
router.get('/journal-entries', requireAuth, asyncHandler(async (req, res) => {
  const rows = await db.all(TID, COL.journals);
  const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
  res.json(listResult(sorted, sorted.length, 1, sorted.length));
}));
router.post('/journal-entries', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['date', 'narration', 'entries']);
  const row = await db.insert(TID, COL.journals, { ...req.body, number: await db.nextId('JE', COL.journals), status: 'draft' });
  res.status(201).json(row);
}));
router.post('/journal-entries/:id/post', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const updated = await db.update(TID, COL.journals, req.params.id, { status: 'posted' });
  notFoundIfUndefined(updated, 'Journal entry not found');
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'post', module: 'accounting', recordRef: updated.id, newState: { status: 'posted' }, ip: req.ip });
  res.json(updated);
}));

// Customers & Vendors
router.get('/customers', requireAuth, asyncHandler(async (req, res) => {
  const rows = await db.all(TID, COL.customers);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/vendors', requireAuth, asyncHandler(async (req, res) => {
  const rows = await db.all(TID, COL.vendors);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));

// Sales invoices
router.get('/sales-invoices', requireAuth, asyncHandler(async (req, res) => {
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);
  let rows = await db.all(TID, COL.sales);
  const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(rows.slice(start, start + pageSize), total, page, pageSize));
}));
router.post('/sales-invoices', requireAuth, requireRole('finance', 'accountant', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['customerId', 'date', 'dueDate', 'lineItems']);
  const customer = await db.byId(TID, COL.customers, req.body.customerId);
  notFoundIfUndefined(customer, 'Customer not found');
  const currency = req.body.currency || 'INR';
  const exchangeRate = Number(req.body.exchangeRate) || 1.0;
  const subtotal = req.body.lineItems.reduce((s: number, l: any) => s + l.amount, 0);
  const gstTotal = req.body.lineItems.reduce((s: number, l: any) => s + (l.amount * (l.gstRate ?? 0)) / 100, 0);
  const total = Math.round(subtotal + gstTotal);
  const baseCurrencyTotal = Math.round(total * exchangeRate);

  const row = await db.insert(TID, COL.sales, {
    number: await db.nextId('INV', COL.sales),
    customerName: customer.name,
    status: 'pending',
    currency,
    exchangeRate,
    subtotal,
    gstTotal: Math.round(gstTotal),
    total,
    baseCurrencyTotal,
    paid: 0,
    ...req.body,
  });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'accounting', recordRef: row.number, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.post('/sales-invoices/:id/receipts', requireAuth, requireRole('finance', 'accountant', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const inv = notFoundIfUndefined(await db.byId(TID, COL.sales, req.params.id), 'Invoice not found');
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest('amount must be positive');

  const settlementRate = Number(req.body.settlementRate) || inv.exchangeRate || 1.0;
  const invoiceRate = Number(inv.exchangeRate) || 1.0;
  let fxGainLoss = 0;
  if (inv.currency && inv.currency !== 'INR') {
    fxGainLoss = Math.round((settlementRate - invoiceRate) * amount * 100) / 100;
  }

  const receipt = {
    id: await db.nextId('rcpt', COL.receipts),
    salesInvoiceId: inv.id,
    date: req.body.date ?? new Date().toISOString().slice(0, 10),
    amount,
    currency: inv.currency || 'INR',
    settlementRate,
    fxGainLoss,
  };
  await db.insert(TID, COL.receipts, receipt);

  const paid = (inv.paid ?? 0) + amount;
  const status = paid >= inv.total ? 'paid' : inv.status;
  const totalFxGainLoss = ((inv.totalFxGainLoss ?? 0) + fxGainLoss);
  const updated = await db.update(TID, COL.sales, inv.id, { paid, status, totalFxGainLoss });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'accounting', recordRef: inv.number, newState: { paid, fxGainLoss }, ip: req.ip });
  res.json({ invoice: updated, receipt, fxGainLoss });
}));

// Purchase invoices
router.get('/purchase-invoices', requireAuth, asyncHandler(async (req, res) => {
  const rows = await db.all(TID, COL.purchases);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/purchase-invoices/:id/approve', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const inv = notFoundIfUndefined(await db.byId(TID, COL.purchases, req.params.id), 'Invoice not found');
  const updated = await db.update(TID, COL.purchases, inv.id, { status: 'approved' });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'approve', module: 'accounting', recordRef: inv.number, oldState: { status: inv.status }, newState: { status: 'approved' }, ip: req.ip });
  res.json(updated);
}));
router.post('/purchase-invoices/:id/payments', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const inv = notFoundIfUndefined(await db.byId(TID, COL.purchases, req.params.id), 'Invoice not found');
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest('amount must be positive');

  const settlementRate = Number(req.body.settlementRate) || inv.exchangeRate || 1.0;
  const invoiceRate = Number(inv.exchangeRate) || 1.0;
  let fxGainLoss = 0;
  if (inv.currency && inv.currency !== 'INR') {
    // For payable: if exchange rate decreases, we pay less INR (Gain); if it increases, we pay more INR (Loss)
    fxGainLoss = Math.round((invoiceRate - settlementRate) * amount * 100) / 100;
  }

  const payment = {
    id: await db.nextId('pay', COL.payments),
    purchaseInvoiceId: inv.id,
    date: req.body.date ?? new Date().toISOString().slice(0, 10),
    amount,
    currency: inv.currency || 'INR',
    settlementRate,
    fxGainLoss,
  };
  await db.insert(TID, COL.payments, payment);

  const paid = (inv.paid ?? 0) + amount;
  const totalFxGainLoss = ((inv.totalFxGainLoss ?? 0) + fxGainLoss);
  const updated = await db.update(TID, COL.purchases, inv.id, { paid, status: paid >= inv.total ? 'paid' : inv.status, totalFxGainLoss });
  res.json({ invoice: updated, payment, fxGainLoss });
}));

// Banking
router.get('/bank-accounts', requireAuth, asyncHandler(async (req, res) => {
  res.json(await db.all(TID, COL.banks));
}));

// GST
router.get('/gst/returns', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.gst);
  if (req.query.type) rows = rows.filter((g) => g.type === req.query.type);
  if (req.query.status) rows = rows.filter((g) => g.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/gst/returns/:id/file', requireAuth, requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const ret = notFoundIfUndefined(await db.byId(TID, COL.gst, req.params.id), 'Return not found');
  const updated = await db.update(TID, COL.gst, ret.id, { status: 'filed', filedOn: new Date().toISOString().slice(0, 10) });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'accounting', recordRef: ret.id, newState: { status: 'filed' }, ip: req.ip });
  res.json(updated);
}));

// Reports
router.get('/reports/receivables-aging', requireAuth, asyncHandler(async (req, res) => {
  res.json(agingBuckets(await db.all(TID, COL.sales), 'receivable'));
}));
router.get('/reports/payables-aging', requireAuth, asyncHandler(async (req, res) => {
  res.json(agingBuckets(await db.all(TID, COL.purchases), 'payable'));
}));
router.get('/reports/trial-balance', requireAuth, asyncHandler(async (req, res) => {
  const accountsList = await db.all(TID, COL.accounts);
  const rows = accountsList.map((a) => ({ code: a.code, name: a.name, type: a.type, opening: a.opening, debit: 0, credit: 0, closing: a.opening }));
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  res.json({ rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit });
}));
router.get('/reports/profit-loss', requireAuth, asyncHandler(async (req, res) => {
  const revenueRows = await db.all(TID, COL.sales);
  const purchaseRows = await db.all(TID, COL.purchases);
  const gstRows = await db.all(TID, COL.gst);
  const revenue = revenueRows.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
  const purchases = purchaseRows.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
  const gst = gstRows.filter((g) => g.status === 'filed').reduce((s, g) => s + g.totalTax, 0);
  const netProfit = revenue - purchases - gst;
  res.json({
    revenue, purchases, gstPaid: gst, operatingExpense: purchases + gst,
    netProfit, marginPct: revenue ? +((netProfit / revenue) * 100).toFixed(1) : 0,
  });
}));
router.get('/reports/balance-sheet', requireAuth, asyncHandler(async (req, res) => {
  const banks = await db.all(TID, COL.banks);
  const sales = await db.all(TID, COL.sales);
  const purchases = await db.all(TID, COL.purchases);
  const cash = banks.reduce((s, b) => s + b.balance, 0);
  const debtors = sales.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const inventory = 12200000;
  const creditors = purchases.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
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
  const sales = await db.all(TID, COL.sales);
  const purchases = await db.all(TID, COL.purchases);
  const banks = await db.all(TID, COL.banks);
  const receivables = sales.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const payables = purchases.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
  const cash = banks.reduce((s, b) => s + b.balance, 0);
  const overdue = sales.filter((i) => i.status === 'overdue').length;
  res.json({ revenue: sales.reduce((s, i) => s + i.total, 0), receivables, payables, cash, overdueInvoices: overdue });
}));

async function init() {
  await db.seed(COL.accounts, accounts);
  await db.seed(COL.customers, customers);
  await db.seed(COL.vendors, vendors);
  await db.seed(COL.sales, salesSeed);
  await db.seed(COL.purchases, purchaseSeed);
  await db.seed(COL.banks, banks);
  await db.seed(COL.gst, gstSeed);
  await db.seed(COL.budgets, budgetSeed);
}
init().catch(console.error);

export default router;
