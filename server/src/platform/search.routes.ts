import { Router } from 'express';
import { db } from '../core/db.js';
import { asyncHandler } from '../core/http.js';
import { requireAuth } from '../core/auth.js';

const router = Router();

/**
 * GET /api/search?q=... — global command-center search across modules.
 * Returns grouped hits (customers, vendors, invoices, employees, items).
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    if (!q) return res.json({ query: q, results: {} });
    const tid = req.user!.tenantId;
    const match = (v: string) => v?.toLowerCase().includes(q);

    const [customers, vendors, sales, purchases, employees, items, documents] = await Promise.all([
      db.all(tid, 'accounting_customers'),
      db.all(tid, 'accounting_vendors'),
      db.all(tid, 'accounting_sales_invoices'),
      db.all(tid, 'accounting_purchase_invoices'),
      db.all(tid, 'hrms_employees'),
      db.all(tid, 'manufacturing_items'),
      db.all(tid, 'dms_documents'),
    ]);

    res.json({
      query: q,
      results: {
        customers: customers.filter((c) => match(c.name) || match(c.gstin)).slice(0, 5).map((c) => ({ id: c.id, label: c.name, sub: c.gstin, module: 'accounting' })),
        vendors: vendors.filter((v) => match(v.name) || match(v.gstin)).slice(0, 5).map((v) => ({ id: v.id, label: v.name, sub: v.gstin, module: 'accounting' })),
        salesInvoices: sales.filter((i) => match(i.number) || match(i.customerName)).slice(0, 5).map((i) => ({ id: i.id, label: i.number, sub: `${i.customerName} · ₹${i.total}`, module: 'accounting' })),
        purchaseInvoices: purchases.filter((i) => match(i.number) || match(i.vendorName)).slice(0, 5).map((i) => ({ id: i.id, label: i.number, sub: `${i.vendorName} · ₹${i.total}`, module: 'accounting' })),
        employees: employees.filter((e) => match(e.name) || match(e.employeeCode)).slice(0, 5).map((e) => ({ id: e.id, label: e.name, sub: e.employeeCode, module: 'hrms' })),
        items: items.filter((it) => match(it.name) || match(it.sku) || match(it.hsn)).slice(0, 5).map((it) => ({ id: it.id, label: it.name, sub: `${it.sku} · ${it.hsn}`, module: 'manufacturing' })),
        documents: documents.filter((d) => match(d.name) || match(d.tags?.join(' '))).slice(0, 5).map((d) => ({ id: d.id, label: d.name, sub: d.category, module: 'dms' })),
      },
    });
  })
);

export default router;
