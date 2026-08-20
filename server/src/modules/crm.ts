import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, notFoundIfUndefined, requireBody } from '../core/http.js';
import { requireAuth, requireRole, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';

const COL = {
  customers: 'crm_customers',
  contacts: 'crm_contacts',
  leads: 'crm_leads',
  quotes: 'crm_quotes',
  salesOrders: 'crm_sales_orders',
};

db.seed(COL.customers, [
  { id: 'cust_001', tenantId: TID, name: 'Acme Corp', gstin: '29ABCDE1234F1Z5', billingAddress: 'Bengaluru', shippingAddress: 'Bengaluru', creditLimit: 500000, paymentTerms: 'Net 30', status: 'active', createdAt: '2026-01-15' },
  { id: 'cust_002', tenantId: TID, name: 'Globex Inc', gstin: '27XYZAB5678G2H3', billingAddress: 'Mumbai', shippingAddress: 'Pune', creditLimit: 300000, paymentTerms: 'Net 45', status: 'active', createdAt: '2026-02-20' },
  { id: 'cust_003', tenantId: TID, name: 'Initech', gstin: '06PQRST9012I3J4', billingAddress: 'Hyderabad', shippingAddress: 'Hyderabad', creditLimit: 150000, paymentTerms: 'Net 15', status: 'active', createdAt: '2026-03-10' },
]);

db.seed(COL.contacts, [
  { id: 'cnt_001', tenantId: TID, customerId: 'cust_001', name: 'Rahul Verma', email: 'rahul@acme.in', phone: '+91-9876543210', designation: 'Procurement Head', isPrimary: true },
  { id: 'cnt_002', tenantId: TID, customerId: 'cust_002', name: 'Priya Nair', email: 'priya@globex.com', phone: '+91-9876543211', designation: 'Finance Manager', isPrimary: true },
]);

db.seed(COL.leads, [
  { id: 'lead_001', tenantId: TID, customerId: 'cust_001', source: 'website', status: 'qualified', probability: 70, estimatedValue: 250000, expectedCloseDate: '2026-09-30', assignedTo: 'Sales Team A', notes: 'Interested in bulk order', createdAt: '2026-08-01' },
  { id: 'lead_002', tenantId: TID, customerId: 'cust_002', source: 'referral', status: 'new', probability: 30, estimatedValue: 180000, expectedCloseDate: '2026-10-15', assignedTo: 'Sales Team B', notes: 'Initial inquiry', createdAt: '2026-08-10' },
  { id: 'lead_003', tenantId: TID, customerId: 'cust_003', source: 'trade_show', status: 'new', probability: 25, estimatedValue: 320000, expectedCloseDate: '2026-11-01', assignedTo: 'Sales Team A', notes: 'Met at Pharma Expo 2026', createdAt: '2026-03-15' },
  { id: 'lead_004', tenantId: TID, customerId: 'cust_001', source: 'cold_call', status: 'qualified', probability: 55, estimatedValue: 150000, expectedCloseDate: '2026-09-15', assignedTo: 'Sales Team C', notes: 'Existing customer upsell', createdAt: '2026-04-02' },
  { id: 'lead_005', tenantId: TID, customerId: 'cust_002', source: 'website', status: 'won', probability: 100, estimatedValue: 220000, expectedCloseDate: '2026-06-30', assignedTo: 'Sales Team B', notes: 'Deal closed successfully', createdAt: '2026-05-10' },
  { id: 'lead_006', tenantId: TID, customerId: 'cust_003', source: 'referral', status: 'lost', probability: 0, estimatedValue: 95000, expectedCloseDate: '2026-07-20', assignedTo: 'Sales Team A', notes: 'Chose competitor on pricing', createdAt: '2026-06-05' },
  { id: 'lead_007', tenantId: TID, customerId: 'cust_001', source: 'website', status: 'qualified', probability: 65, estimatedValue: 175000, expectedCloseDate: '2026-10-30', assignedTo: 'Sales Team A', notes: 'Follow up scheduled', createdAt: '2026-07-12' },
  { id: 'lead_008', tenantId: TID, customerId: 'cust_002', source: 'trade_show', status: 'new', probability: 20, estimatedValue: 280000, expectedCloseDate: '2026-12-01', assignedTo: 'Sales Team B', notes: 'Interested in logistics automation', createdAt: '2026-08-05' },
  { id: 'lead_009', tenantId: TID, customerId: 'cust_003', source: 'cold_call', status: 'qualified', probability: 50, estimatedValue: 130000, expectedCloseDate: '2026-09-20', assignedTo: 'Sales Team A', notes: 'Needs sample testing', createdAt: '2026-04-20' },
  { id: 'lead_010', tenantId: TID, customerId: 'cust_001', source: 'referral', status: 'won', probability: 100, estimatedValue: 360000, expectedCloseDate: '2026-06-15', assignedTo: 'Sales Team C', notes: 'Annual maintenance contract', createdAt: '2026-03-01' },
  { id: 'lead_011', tenantId: TID, customerId: 'cust_002', source: 'website', status: 'lost', probability: 0, estimatedValue: 78000, expectedCloseDate: '2026-05-30', assignedTo: 'Sales Team B', notes: 'Budget constraints', createdAt: '2026-05-22' },
  { id: 'lead_012', tenantId: TID, customerId: 'cust_003', source: 'trade_show', status: 'new', probability: 35, estimatedValue: 210000, expectedCloseDate: '2026-11-15', assignedTo: 'Sales Team A', notes: 'Requested demo', createdAt: '2026-08-15' },
  { id: 'lead_013', tenantId: TID, customerId: 'cust_001', source: 'website', status: 'qualified', probability: 60, estimatedValue: 190000, expectedCloseDate: '2026-10-05', assignedTo: 'Sales Team A', notes: 'Price negotiation stage', createdAt: '2026-07-25' },
  { id: 'lead_014', tenantId: TID, customerId: 'cust_003', source: 'referral', status: 'won', probability: 100, estimatedValue: 410000, expectedCloseDate: '2026-08-20', assignedTo: 'Sales Team A', notes: 'Large order confirmed', createdAt: '2026-06-18' },
  { id: 'lead_015', tenantId: TID, customerId: 'cust_002', source: 'cold_call', status: 'new', probability: 15, estimatedValue: 160000, expectedCloseDate: '2026-12-15', assignedTo: 'Sales Team B', notes: 'Initial contact made', createdAt: '2026-08-12' },
]);

db.seed(COL.quotes, [
  { id: 'quo_001', tenantId: TID, customerId: 'cust_001', number: 'QT-2026-001', date: '2026-08-05', validUntil: '2026-08-20', status: 'accepted', total: 245000, currency: 'INR' },
  { id: 'quo_002', tenantId: TID, customerId: 'cust_002', number: 'QT-2026-002', date: '2026-08-12', validUntil: '2026-08-27', status: 'sent', total: 175000, currency: 'INR' },
  { id: 'quo_003', tenantId: TID, customerId: 'cust_003', number: 'QT-2026-003', date: '2026-03-20', validUntil: '2026-04-05', status: 'accepted', total: 310000, currency: 'INR' },
  { id: 'quo_004', tenantId: TID, customerId: 'cust_001', number: 'QT-2026-004', date: '2026-04-15', validUntil: '2026-05-01', status: 'rejected', total: 185000, currency: 'INR' },
  { id: 'quo_005', tenantId: TID, customerId: 'cust_002', number: 'QT-2026-005', date: '2026-05-08', validUntil: '2026-05-25', status: 'accepted', total: 420000, currency: 'INR' },
  { id: 'quo_006', tenantId: TID, customerId: 'cust_003', number: 'QT-2026-006', date: '2026-06-12', validUntil: '2026-06-30', status: 'sent', total: 95000, currency: 'INR' },
  { id: 'quo_007', tenantId: TID, customerId: 'cust_001', number: 'QT-2026-007', date: '2026-07-01', validUntil: '2026-07-20', status: 'draft', total: 560000, currency: 'INR' },
  { id: 'quo_008', tenantId: TID, customerId: 'cust_003', number: 'QT-2026-008', date: '2026-08-02', validUntil: '2026-08-18', status: 'rejected', total: 120000, currency: 'INR' },
  { id: 'quo_009', tenantId: TID, customerId: 'cust_002', number: 'QT-2026-009', date: '2026-03-10', validUntil: '2026-03-28', status: 'accepted', total: 270000, currency: 'INR' },
  { id: 'quo_010', tenantId: TID, customerId: 'cust_001', number: 'QT-2026-010', date: '2026-06-25', validUntil: '2026-07-12', status: 'sent', total: 330000, currency: 'INR' },
]);

db.seed(COL.salesOrders, [
  { id: 'so_001', tenantId: TID, customerId: 'cust_001', quoteId: 'quo_001', number: 'SO-2026-001', date: '2026-08-08', deliveryDate: '2026-08-25', status: 'processing', total: 245000, currency: 'INR' },
  { id: 'so_002', tenantId: TID, customerId: 'cust_003', quoteId: 'quo_003', number: 'SO-2026-002', date: '2026-03-25', deliveryDate: '2026-04-15', status: 'completed', total: 310000, currency: 'INR' },
  { id: 'so_003', tenantId: TID, customerId: 'cust_001', quoteId: 'quo_010', number: 'SO-2026-003', date: '2026-06-30', deliveryDate: '2026-07-20', status: 'completed', total: 330000, currency: 'INR' },
  { id: 'so_004', tenantId: TID, customerId: 'cust_002', quoteId: 'quo_005', number: 'SO-2026-004', date: '2026-05-15', deliveryDate: '2026-06-05', status: 'completed', total: 420000, currency: 'INR' },
  { id: 'so_005', tenantId: TID, customerId: 'cust_001', quoteId: 'quo_007', number: 'SO-2026-005', date: '2026-07-10', deliveryDate: '2026-08-01', status: 'cancelled', total: 560000, currency: 'INR' },
  { id: 'so_006', tenantId: TID, customerId: 'cust_003', quoteId: 'quo_006', number: 'SO-2026-006', date: '2026-06-20', deliveryDate: '2026-07-10', status: 'processing', total: 95000, currency: 'INR' },
  { id: 'so_007', tenantId: TID, customerId: 'cust_002', quoteId: 'quo_002', number: 'SO-2026-007', date: '2026-08-18', deliveryDate: '2026-09-05', status: 'pending', total: 175000, currency: 'INR' },
  { id: 'so_008', tenantId: TID, customerId: 'cust_001', quoteId: 'quo_004', number: 'SO-2026-008', date: '2026-04-20', deliveryDate: '2026-05-10', status: 'cancelled', total: 185000, currency: 'INR' },
]);

// Customers
router.get('/customers', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.customers);
  if (req.query.status) rows = rows.filter((c) => c.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/customers', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'billingAddress']);
  const row = db.insert(TID, COL.customers, { id: db.nextId('cust', COL.customers), createdAt: new Date().toISOString().slice(0, 10), ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'crm', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.get('/customers/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = notFoundIfUndefined(db.byId(TID, COL.customers, req.params.id), 'Customer not found');
  res.json(customer);
}));
router.put('/customers/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.customers, req.params.id), 'Customer not found');
  const updated = db.update(TID, COL.customers, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'crm', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));

// Contacts
router.get('/customers/:customerId/contacts', requireAuth, asyncHandler(async (req, res) => {
  const rows = db.query(TID, COL.contacts, (c) => c.customerId === req.params.customerId);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/customers/:customerId/contacts', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'email']);
  const row = db.insert(TID, COL.contacts, { customerId: req.params.customerId, ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'crm', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

// Leads
router.get('/leads', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.leads);
  if (req.query.status) rows = rows.filter((l) => l.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/leads', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['customerId', 'source', 'estimatedValue']);
  const row = db.insert(TID, COL.leads, { createdAt: new Date().toISOString().slice(0, 10), ...req.body });
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'crm', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.put('/leads/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.leads, req.params.id), 'Lead not found');
  const updated = db.update(TID, COL.leads, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'crm', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));

// Quotes
router.get('/quotes', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.quotes);
  if (req.query.status) rows = rows.filter((q) => q.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/quotes', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  requireBody(req.body, ['customerId', 'number', 'date', 'validUntil', 'total']);
  const row = db.insert(TID, COL.quotes, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'crm', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.put('/quotes/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.quotes, req.params.id), 'Quote not found');
  const updated = db.update(TID, COL.quotes, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'crm', recordRef: existing.id, newState: updated, ip: req.ip });
  res.json(updated);
}));
router.post('/quotes/:id/convert', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const quote = notFoundIfUndefined(db.byId(TID, COL.quotes, req.params.id), 'Quote not found');
  if (quote.status === 'accepted') {
    const so = db.insert(TID, COL.salesOrders, {
      id: db.nextId('so', COL.salesOrders),
      customerId: quote.customerId,
      quoteId: quote.id,
      number: `SO-${new Date().getFullYear()}-${String(db.all(TID, COL.salesOrders).length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      deliveryDate: req.body.deliveryDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'confirmed',
      total: quote.total,
      currency: quote.currency,
    });
    db.update(TID, COL.quotes, quote.id, { status: 'converted' });
    const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'crm', recordRef: so.number, newState: so, ip: req.ip });
    res.status(201).json(so);
  } else {
    throw ApiError.badRequest('Quote must be accepted before conversion');
  }
}));

// Sales Orders
router.get('/sales-orders', requireAuth, asyncHandler(async (req, res) => {
  let rows = db.all(TID, COL.salesOrders);
  if (req.query.status) rows = rows.filter((so) => so.status === req.query.status);
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.get('/sales-orders/:id', requireAuth, asyncHandler(async (req, res) => {
  const so = notFoundIfUndefined(db.byId(TID, COL.salesOrders, req.params.id), 'Sales order not found');
  res.json(so);
}));
router.put('/sales-orders/:id', requireAuth, requireRole('manager', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const existing = notFoundIfUndefined(db.byId(TID, COL.salesOrders, req.params.id), 'Sales order not found');
  const updated = db.update(TID, COL.salesOrders, existing.id, req.body);
  const a = actor(req); recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'crm', recordRef: existing.number, newState: updated, ip: req.ip });
  res.json(updated);
}));

export default router;
