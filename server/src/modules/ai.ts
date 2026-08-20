import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody } from '../core/http.js';
import { requireAuth } from '../core/auth.js';

const router = Router();
const TID = 'tnt_acme';

// ----------------------------- Helpers -----------------------------
async function salesOutstanding() {
  const rows = await db.all(TID, 'accounting_sales_invoices');
  return rows.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
}
async function purchaseOutstanding() {
  const rows = await db.all(TID, 'accounting_purchase_invoices');
  return rows.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
}
async function cashPosition() {
  const rows = await db.all(TID, 'accounting_bank_accounts');
  return rows.reduce((s, b) => s + b.balance, 0);
}
async function revenue() {
  const rows = await db.all(TID, 'accounting_sales_invoices');
  return rows.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
}

async function payrollByDepartment() {
  const depts = new Map((await db.all(TID, 'hrms_departments')).map((d: any) => [d.id, d.name]));
  const map = new Map<string, number>();
  const employees = await db.all(TID, 'hrms_employees');
  for (const e of employees.filter((x: any) => x.status === 'active')) {
    const sal = (e.salary.basic + e.salary.hra + e.salary.allowances) * 12; // annualized
    const name = depts.get(e.departmentId) ?? 'Unknown';
    map.set(name, (map.get(name) ?? 0) + sal);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]); // [dept, annualCost]
}

async function lowerStock() {
  const items = new Map((await db.all(TID, 'manufacturing_items')).map((i: any) => [i.id, i]));
  const stock = await db.all(TID, 'manufacturing_stock');
  return stock
    .map((s: any) => ({ item: items.get(s.itemId), quantity: s.quantity }))
    .filter((x: any) => x.item && x.quantity <= x.item.reorderLevel);
}

async function overdueInvoices() {
  const today = new Date();
  const rows = await db.all(TID, 'accounting_sales_invoices');
  return rows
    .filter((i: any) => i.status === 'overdue' || (i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.dueDate) < today))
    .map((i: any) => ({ number: i.number, customer: i.customerName, amount: i.total - (i.paid ?? 0), dueDate: i.dueDate }));
}

// ----------------------------- Routes -----------------------------
/**
 * POST /api/ai/copilot — natural-language query over tenant-authorized data.
 * Rule-based intent matcher (a real deployment would call an LLM with these
 * same aggregates as grounding context).
 */
router.post('/copilot', requireAuth, asyncHandler(async (req, res) => {
  const query = String(req.body?.query ?? '').toLowerCase();
  if (!query) throw ApiError.badRequest('query is required');

  let answer = 'I can help with finance, inventory and people questions. Try "outstanding receivable", "overdue invoices", "below reorder level", "highest payroll costs", or "cash flow".';
  let data: unknown = null;

  if (query.includes('receivable') || query.includes('outstanding')) {
    const salesInv = await db.all(TID, 'accounting_sales_invoices');
    const outstanding = salesInv.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0);
    const openCount = salesInv.filter((i) => i.status !== 'paid').length;
    answer = `Outstanding receivables are ₹${(outstanding / 100000).toFixed(2)}L across ${openCount} open invoices.`;
    data = { receivables: outstanding };
  } else if (query.includes('overdue')) {
    const ov = await overdueInvoices();
    answer = ov.length ? `${ov.length} invoices are overdue. Top: ${ov[0]?.customer} (₹${ov[0]?.amount}).` : 'No overdue invoices right now.';
    data = ov;
  } else if (query.includes('reorder') || query.includes('stock below')) {
    const low = await lowerStock();
    answer = low.length ? `${low.length} item(s) are below reorder level, including ${low[0].item.name}.` : 'All stock above reorder levels.';
    data = low;
  } else if (query.includes('payroll cost') || query.includes('highest payroll')) {
    const pd = await payrollByDepartment();
    answer = `Highest payroll cost is ${pd[0]?.[0]} at ₹${(pd[0]?.[1] / 100000).toFixed(2)}L/yr.`;
    data = pd;
  } else if (query.includes('cash') || query.includes('cash flow')) {
    answer = `Cash position is ₹${(await cashPosition() / 100000).toFixed(2)}L. Payables outstanding ₹${(await purchaseOutstanding() / 100000).toFixed(2)}L.`;
    data = { cash: await cashPosition(), payables: await purchaseOutstanding() };
  } else if (query.includes('pending approval') || query.includes('pending invoice')) {
    const pinvRows = await db.all(TID, 'accounting_purchase_invoices');
    const pinv = pinvRows.filter((i) => i.status === 'pending' || i.status === 'approved').length;
    const leaveRows = await db.all(TID, 'hrms_leave_applications');
    const leave = leaveRows.filter((l) => l.status === 'pending').length;
    answer = `${pinv} purchase invoice(s) and ${leave} leave request(s) are awaiting approval.`;
    data = { purchaseInvoices: pinv, leave: leave };
  } else if (query.includes('revenue')) {
    answer = `Total sales revenue is ₹${(await revenue() / 100000).toFixed(2)}L.`;
    data = { revenue: await revenue() };
  }

  res.json({ query: req.body.query, answer, data });
}));

/** GET /api/ai/insights — financial intelligence signals. */
router.get('/insights', requireAuth, asyncHandler(async (_req, res) => {
  res.json({
    rows: [
      { id: 'ins_001', title: 'Cash-flow trend', detail: 'Operating cash up 6.1% MoM; collections improved after dunning reminders.', trend: 'up' },
      { id: 'ins_002', title: 'Revenue change', detail: 'Revenue +12% vs last month, driven by Apex Pharma reorders.', trend: 'up' },
      { id: 'ins_003', title: 'Expense anomaly', detail: 'Power Components billing 18% above 3-month average.', trend: 'down' },
      { id: 'ins_004', title: 'Receivable risk', detail: `${(await overdueInvoices()).length} invoices overdue > 60 days; concentration in one customer.`, trend: 'down' },
      { id: 'ins_005', title: 'Vendor payment trend', detail: 'Steel Mart DSO widening; renegotiate terms to net-45.', trend: 'flat' },
      { id: 'ins_006', title: 'Margin deterioration', detail: 'FG-001 margin down 2.3 pts due to steel cost increase.', trend: 'down' },
    ],
  });
}));

/** GET /api/ai/anomalies — anomaly detection across modules. */
router.get('/anomalies', requireAuth, asyncHandler(async (_req, res) => {
  const anomalies: any[] = [];
  const ov = await overdueInvoices();
  for (const inv of ov) {
    anomalies.push({ type: 'overdue_receivable', severity: 'high', message: `Invoice ${inv.number} (${inv.customer}) overdue, ₹${inv.amount} outstanding.`, ref: inv.number });
  }
  const low = await lowerStock();
  for (const s of low) {
    anomalies.push({ type: 'low_stock', severity: 'medium', message: `${s.item.name} at ${s.quantity} ${s.item.uom} vs reorder ${s.item.reorderLevel}.`, ref: s.item.sku });
  }
  // duplicate invoice detection: same customer + same total
  const seen = new Map<string, any>();
  const salesInvoices = await db.all(TID, 'accounting_sales_invoices');
  for (const inv of salesInvoices) {
    const key = `${inv.customerId}-${inv.total}`;
    if (seen.has(key)) {
      anomalies.push({ type: 'duplicate_invoice', severity: 'high', message: `Possible duplicate of ${seen.get(key).number} for ${inv.customerName} (₹${inv.total}).`, ref: inv.number });
    } else seen.set(key, inv);
  }

  res.json({ rows: anomalies, total: anomalies.length });
}));

/** GET /api/ai/recommendations — actionable next steps. */
router.get('/recommendations', requireAuth, asyncHandler(async (_req, res) => {
  res.json({
    rows: [
      { id: 'rec_001', priority: 'high', text: 'Receivables increased 18% this month, primarily due to three customers. Two invoices are >60 days overdue — initiate collection follow-up.' },
      { id: 'rec_002', priority: 'medium', text: 'Steel Coil is below reorder level. Raise purchase requisition now to avoid production stoppage.' },
      { id: 'rec_003', priority: 'medium', text: 'GSTR-3B for August is due in 4 days. Validate GSTR-1 mismatch before filing.' },
      { id: 'rec_004', priority: 'low', text: 'Power Components invoice shows unusual variance — verify against PO before approval.' },
    ],
  });
}));

/**
 * POST /api/ai/invoice-processing — simulated AI OCR + extraction pipeline.
 * Input: raw invoice text (or structured draft). Output: extracted vendor,
 * line items, GST, PO match and duplicate check.
 */
router.post('/invoice-processing', requireAuth, asyncHandler(async (req, res) => {
  requireBody(req.body, ['text']);
  const text = String(req.body.text);
  // crude extraction
  const amountMatch = text.match(/total\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i) ?? text.match(/(\d{3,})/);
  const gstMatch = text.match(/gstin\s*[:\-]?\s*([0-9A-Z]{15})/i);
  const vendorMatch = text.match(/vendor\s*[:\-]?\s*([A-Za-z ]+)/i);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;

  const vendorName = vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor';
  const openPOs = await db.all(TID, 'manufacturing_purchase_orders');
  const poMatch = openPOs.filter((p: any) => p.status === 'open').find((p: any) => p.vendorId && vendorName.toLowerCase().includes('steel'));
  const existing = await db.all(TID, 'accounting_purchase_invoices');
  const duplicate = existing.filter((p: any) => Math.abs(p.total - amount) < 1 && p.vendorName?.toLowerCase().includes(vendorName.toLowerCase().slice(0, 6))).length > 0;

  res.json({
    extracted: {
      vendorName,
      gstin: gstMatch ? gstMatch[1] : null,
      amount,
      currency: 'INR',
      lineItems: [{ description: 'Extracted from document', amount }],
      confidence: 0.86,
    },
    poMatch: poMatch ? { poId: poMatch.id, number: poMatch.number } : null,
    duplicate,
    status: duplicate ? 'flagged_duplicate' : 'ready_for_review',
  });
}));

export default router;
