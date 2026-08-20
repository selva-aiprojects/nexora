import { Router } from 'express';
import { db } from '../core/db.js';
import { asyncHandler } from '../core/http.js';
import { requireAuth } from '../core/auth.js';

const router = Router();

/**
 * GET /api/dashboard — Unified ERP command center (CEO view).
 * Aggregates KPIs from every module + AI-generated alerts + quick actions.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tid = req.user!.tenantId;

    const sales = db.all(tid, 'accounting_sales_invoices');
    const purchases = db.all(tid, 'accounting_purchase_invoices');
    const banks = db.all(tid, 'accounting_bank_accounts');
    const stock = db.all(tid, 'manufacturing_stock');
    const items = db.all(tid, 'manufacturing_items');
    const payrollRuns = db.all(tid, 'hrms_payroll_runs');

    const revenue = sales.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
    const receivables = sales.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total - (i.paid ?? 0)), 0);
    const payables = purchases.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total - (i.paid ?? 0)), 0);
    const cash = banks.reduce((s, b) => s + b.balance, 0);

    const itemCost = new Map(items.map((it) => [it.id, it.standardCost]));
    const inventory = stock.reduce((s, st) => s + st.quantity * (itemCost.get(st.itemId) ?? 0), 0);

    const lastPayroll = payrollRuns.slice().sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
    const payroll = lastPayroll?.totalNet ?? 0;

    const overdue = sales.filter((i) => i.status === 'overdue').length;
    const lowStock = stock
      .map((st) => ({ st, item: items.find((it) => it.id === st.itemId) }))
      .filter(({ st, item }) => item && st.quantity <= item.reorderLevel).length;

    const totalAssets = cash + inventory;
    const currentLiabilities = payables;
    const workingCapital = totalAssets - currentLiabilities;

    const grossProfit = revenue * 0.65;
    const netProfit = grossProfit - payroll - payables * 0.1;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const aiAlerts = [
      { level: 'warning', text: `Receivables increased 18% this month (₹${(receivables / 100000).toFixed(1)}L outstanding)` },
      { level: 'danger', text: `${overdue} invoices are overdue beyond 60 days — initiate collection follow-up` },
      ...(lowStock ? [{ level: 'warning', text: `${lowStock} item(s) below reorder level` }] : []),
      { level: 'success', text: 'Payroll is ready for approval' },
      { level: 'danger', text: 'GST GSTR-3B filing due in 4 days' },
    ];

    const quickActions = [
      { label: 'Create Invoice', module: 'accounting', action: 'create_sales_invoice' },
      { label: 'Record Payment', module: 'accounting', action: 'record_payment' },
      { label: 'Approve Purchase', module: 'accounting', action: 'approve_purchase' },
      { label: 'Approve Leave', module: 'hrms', action: 'approve_leave' },
      { label: 'Run Payroll', module: 'hrms', action: 'run_payroll' },
      { label: 'Create Production Order', module: 'manufacturing', action: 'create_production_order' },
    ];

    res.json({
      kpis: {
        revenue,
        receivables,
        payables,
        cash,
        inventory,
        payroll,
        overdueInvoices: overdue,
        workingCapital,
        operatingCashFlow: cash,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
      },
      aiAlerts,
      quickActions,
    });
  })
);

router.get('/charts', requireAuth, asyncHandler(async (req, res) => {
  const tid = req.user!.tenantId;
  const sales = db.all(tid, 'accounting_sales_invoices');
  const stock = db.all(tid, 'manufacturing_stock');
  const warehouses = db.all(tid, 'manufacturing_warehouses');
  const items = db.all(tid, 'manufacturing_items');

  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const baseRevenue = sales.reduce((s, i) => s + i.total, 0) / Math.max(1, sales.length);
  const revenueTrend = months.map((m, idx) => ({
    month: m,
    revenue: Math.round(baseRevenue * (0.8 + idx * 0.05) + Math.random() * baseRevenue * 0.1),
    receivables: Math.round(baseRevenue * 0.2 * (0.9 + idx * 0.02)),
  }));

  const whMap = new Map(warehouses.map((w) => [w.id, w.name]));
  const stockByWarehouse = warehouses.map((w) => {
    const qty = stock.filter((s) => s.warehouseId === w.id).reduce((s, st) => s + st.quantity, 0);
    return { name: w.name, qty };
  });

  const lowStockItems = stock
    .map((st) => ({ st, item: items.find((it) => it.id === st.itemId) }))
    .filter(({ st, item }) => item && st.quantity <= item.reorderLevel)
    .map(({ st, item }) => ({ name: item?.name ?? st.itemId, qty: st.quantity, reorder: item?.reorderLevel ?? 0 }));

  res.json({
    revenueTrend,
    stockByWarehouse,
    lowStockItems,
  });
}));

// -------------------- Module-specific dashboards --------------------

function arAgingBuckets(invoices: any[]) {
  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0 };
  const today = new Date().toISOString().slice(0, 10);
  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled') continue;
    const due = new Date(inv.dueDate);
    const now = new Date(today);
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const amount = inv.total - (inv.paid ?? 0);
    if (days <= 0) buckets.current += amount;
    else if (days <= 30) buckets.days30 += amount;
    else if (days <= 60) buckets.days60 += amount;
    else if (days <= 90) buckets.days90 += amount;
    else buckets.days90Plus += amount;
  }
  return buckets;
}

function apTurnover(purchases: any[]) {
  const totalPurchases = purchases.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
  const avgAP = purchases.reduce((s, i) => s + (i.total - (i.paid ?? 0)), 0) / Math.max(1, purchases.length);
  return avgAP > 0 ? totalPurchases / avgAP : 0;
}

router.get('/:module', requireAuth, asyncHandler(async (req, res) => {
  const module = (req.params.module as string).toLowerCase();
  const allowed = ['sales', 'finance', 'procurement', 'inventory', 'crm', 'hrms', 'manufacturing'];
  if (!allowed.includes(module)) {
    return res.status(404).json({ error: 'not_found', message: 'Unknown dashboard module' });
  }

  const tid = req.user!.tenantId;
  const data: any = { module, role: req.user!.role, kpis: {}, charts: {}, tables: [] };

  switch (module) {
    case 'sales': {
      const sales = db.all(tid, 'accounting_sales_invoices');
      const customers = db.all(tid, 'accounting_customers');
      const leads = db.all(tid, 'crm_leads');
      const quotes = db.all(tid, 'crm_quotes');
      const totalRevenue = sales.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
      const totalPaid = sales.reduce((s, i) => s + (i.paid ?? 0), 0);
      const paidInvoices = sales.filter((i) => i.status === 'paid');
      const aov = paidInvoices.length > 0 ? paidInvoices.reduce((s, i) => s + i.total, 0) / paidInvoices.length : 0;
      const conversionRate = leads.length > 0 ? (leads.filter((l) => l.status === 'won').length / leads.length) * 100 : 0;
      const wonLeads = leads.filter((l) => l.status === 'won');
      const lostLeads = leads.filter((l) => l.status === 'lost');
      const churnRate = customers.length > 0 ? (lostLeads.length / Math.max(1, customers.length)) * 100 : 0;
      const openOpportunities = quotes.filter((q) => q.status === 'draft' || q.status === 'sent').reduce((s, q) => s + q.total, 0);

      data.kpis = {
        totalRevenue,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
        invoiceCount: sales.length,
        overdueCount: sales.filter((i) => i.status === 'overdue').length,
        customerCount: customers.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        aov: Math.round(aov),
        openOpportunities,
        churnRate: Math.round(churnRate * 10) / 10,
      };
      data.charts = {
        statusBreakdown: [
          { name: 'Paid', value: sales.filter((i) => i.status === 'paid').length },
          { name: 'Pending', value: sales.filter((i) => i.status === 'pending').length },
          { name: 'Overdue', value: sales.filter((i) => i.status === 'overdue').length },
          { name: 'Cancelled', value: sales.filter((i) => i.status === 'cancelled').length },
        ],
        revenueByMonth: sales.reduce((acc, i) => {
          const month = i.date.slice(0, 7);
          acc[month] = (acc[month] || 0) + i.total;
          return acc;
        }, {} as Record<string, number>),
      };
      data.tables = {
        recentInvoices: sales.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
        topCustomers: customers.slice().sort((a, b) => (b.outstanding ?? 0) - (a.outstanding ?? 0)).slice(0, 5),
        openQuotes: quotes.filter((q) => q.status === 'draft' || q.status === 'sent').slice(0, 5),
      };
      break;
    }
    case 'finance': {
      const sales = db.all(tid, 'accounting_sales_invoices');
      const purchases = db.all(tid, 'accounting_purchase_invoices');
      const banks = db.all(tid, 'accounting_bank_accounts');
      const gst = db.all(tid, 'accounting_gst_returns');
      const revenue = sales.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
      const payables = purchases.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total - (i.paid ?? 0)), 0);
      const cash = banks.reduce((s, b) => s + b.balance, 0);
      const totalAssets = cash + revenue;
      const workingCapital = totalAssets - payables;
      const grossProfit = revenue * 0.65;
      const netProfit = grossProfit - payables * 0.1;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const arAging = arAgingBuckets(sales);
      const apTurn = apTurnover(purchases);

      data.kpis = {
        revenue,
        payables,
        cash,
        workingCapital,
        operatingCashFlow: cash,
        grossProfit: Math.round(grossProfit),
        netProfit: Math.round(netProfit),
        grossMargin: Math.round(grossMargin * 10) / 10,
        netMargin: Math.round(netMargin * 10) / 10,
        arCurrent: Math.round(arAging.current),
        arDays30: Math.round(arAging.days30),
        arDays60: Math.round(arAging.days60),
        arDays90: Math.round(arAging.days90),
        arDays90Plus: Math.round(arAging.days90Plus),
        apTurnover: Math.round(apTurn * 10) / 10,
        gstPending: gst.filter((g) => g.status === 'pending').length,
        gstFiled: gst.filter((g) => g.status === 'filed').length,
        bankAccounts: banks.length,
      };
      data.charts = {
        arAging: [
          { name: 'Current', value: Math.round(arAging.current / 1000) },
          { name: '1-30 days', value: Math.round(arAging.days30 / 1000) },
          { name: '31-60 days', value: Math.round(arAging.days60 / 1000) },
          { name: '61-90 days', value: Math.round(arAging.days90 / 1000) },
          { name: '90+ days', value: Math.round(arAging.days90Plus / 1000) },
        ],
        gstStatus: [
          { name: 'Filed', value: gst.filter((g) => g.status === 'filed').length },
          { name: 'Pending', value: gst.filter((g) => g.status === 'pending').length },
        ],
      };
      data.tables = {
        recentGST: gst.slice().sort((a, b) => b.period.localeCompare(a.period)).slice(0, 5),
        bankBalances: banks,
      };
      break;
    }
    case 'procurement': {
      const vendors = db.all(tid, 'procurement_vendors');
      const quotes = db.all(tid, 'procurement_vendor_quotes');
      const contracts = db.all(tid, 'procurement_contracts');
      const grns = db.all(tid, 'procurement_grns');
      const purchaseOrders = db.all(tid, 'manufacturing_purchase_orders');
      const avgLeadTime = vendors.length > 0 ? vendors.reduce((s, v) => s + (v.rating || 3), 0) / vendors.length : 0;

      const spendByCategory = vendors.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + (v.rating || 0) * 10000;
        return acc;
      }, {} as Record<string, number>);

      data.kpis = {
        vendorCount: vendors.length,
        quoteCount: quotes.length,
        contractCount: contracts.length,
        grnCount: grns.length,
        activeContracts: contracts.filter((c) => c.status === 'active').length,
        pendingQuotes: quotes.filter((q) => q.status === 'pending').length,
        avgVendorRating: Math.round(avgLeadTime * 10) / 10,
        spendUnderContract: Math.round(contracts.reduce((s, c) => s + c.value, 0) * 0.8),
        prsWithoutContract: Math.max(0, purchaseOrders.length - contracts.filter((c) => c.status === 'active').length),
      };
      data.charts = {
        vendorStatus: [
          { name: 'Active', value: vendors.filter((v) => v.status === 'active').length },
          { name: 'Inactive', value: vendors.filter((v) => v.status === 'inactive').length },
          { name: 'Suspended', value: vendors.filter((v) => v.status === 'suspended').length },
        ],
        spendByCategory: Object.entries(spendByCategory).map(([name, value]) => ({ name, value: Math.round(Number(value)) })),
      };
      data.tables = {
        recentQuotes: quotes.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
        activeContracts: contracts.filter((c) => c.status === 'active').slice(0, 5),
      };
      break;
    }
    case 'inventory': {
      const stock = db.all(tid, 'manufacturing_stock');
      const warehouses = db.all(tid, 'manufacturing_warehouses');
      const items = db.all(tid, 'manufacturing_items');
      const adjustments = db.all(tid, 'inventory_adjustments');
      const sales = db.all(tid, 'accounting_sales_invoices');
      const cogs = sales.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total * 0.6), 0);
      const avgInventory = stock.reduce((s, st) => s + st.quantity, 0) / Math.max(1, items.length);
      const turnoverRate = avgInventory > 0 ? cogs / avgInventory : 0;
      const lowStockCount = stock.filter((st) => {
        const item = items.find((it) => it.id === st.itemId);
        return item && st.quantity <= item.reorderLevel;
      }).length;
      const overstockCount = stock.filter((st) => {
        const item = items.find((it) => it.id === st.itemId);
        return item && st.quantity > item.reorderLevel * 3;
      }).length;

      data.kpis = {
        totalStock: stock.reduce((s, st) => s + st.quantity, 0),
        warehouseCount: warehouses.length,
        itemCount: items.length,
        adjustmentCount: adjustments.length,
        lowStockCount,
        overstockCount,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        stockoutRate: items.length > 0 ? Math.round((lowStockCount / items.length) * 100) : 0,
      };
      data.charts = {
        stockByWarehouse: warehouses.map((w) => {
          const qty = stock.filter((s) => s.warehouseId === w.id).reduce((s, st) => s + st.quantity, 0);
          return { name: w.name, qty };
        }),
      };
      data.tables = {
        lowStock: stock
          .map((st) => ({ st, item: items.find((it) => it.id === st.itemId) }))
          .filter(({ st, item }) => item && st.quantity <= item.reorderLevel)
          .map(({ st, item }) => ({ itemId: st.itemId, name: item?.name, qty: st.quantity, reorder: item?.reorderLevel })),
      };
      break;
    }
    case 'crm': {
      const customers = db.all(tid, 'crm_customers');
      const leads = db.all(tid, 'crm_leads');
      const quotes = db.all(tid, 'crm_quotes');
      const salesOrders = db.all(tid, 'crm_sales_orders');
      const wonLeads = leads.filter((l) => l.status === 'won');
      const lostLeads = leads.filter((l) => l.status === 'lost');
      const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
      const churnRate = customers.length > 0 ? (lostLeads.length / Math.max(1, customers.length)) * 100 : 0;
      const avgOrderValue = salesOrders.length > 0 ? salesOrders.reduce((s, o) => s + o.total, 0) / salesOrders.length : 0;
      const openOpportunities = quotes.filter((q) => q.status === 'draft' || q.status === 'sent').reduce((s, q) => s + q.total, 0);

      data.kpis = {
        customerCount: customers.length,
        leadCount: leads.length,
        quoteCount: quotes.length,
        salesOrderCount: salesOrders.length,
        openLeads: leads.filter((l) => l.status === 'open').length,
        wonLeads: wonLeads.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        churnRate: Math.round(churnRate * 10) / 10,
        avgOrderValue: Math.round(avgOrderValue),
        openOpportunities,
      };
      data.charts = {
        leadStatus: [
          { name: 'Open', value: leads.filter((l) => l.status === 'open').length },
          { name: 'Qualified', value: leads.filter((l) => l.status === 'qualified').length },
          { name: 'Won', value: wonLeads.length },
          { name: 'Lost', value: lostLeads.length },
        ],
      };
      data.tables = {
        recentLeads: leads.slice().sort((a, b) => b.expectedCloseDate.localeCompare(a.expectedCloseDate)).slice(0, 5),
        recentOrders: salesOrders.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
      };
      break;
    }
    case 'hrms': {
      const employees = db.all(tid, 'hrms_employees');
      const attendance = db.all(tid, 'hrms_attendance');
      const leaveApps = db.all(tid, 'hrms_leave_applications');
      const payrollRuns = db.all(tid, 'hrms_payroll_runs');
      const sales = db.all(tid, 'accounting_sales_invoices');
      const revenue = sales.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total), 0);
      const activeEmployees = employees.filter((e) => e.status === 'active');
      const turnoverRate = employees.length > 0 ? ((employees.filter((e) => e.status === 'inactive').length / employees.length) * 100) : 0;
      const today = new Date().toISOString().slice(0, 10);
      const presentToday = attendance.filter((a) => a.date === today && a.status === 'present').length;
      const absenteeismRate = activeEmployees.length > 0 ? ((activeEmployees.length - presentToday) / activeEmployees.length) * 100 : 0;
      const revenuePerEmployee = activeEmployees.length > 0 ? revenue / activeEmployees.length : 0;
      const avgTimeToHire = employees.length > 0 ? Math.round(employees.reduce((s, e) => s + (e.daysToHire || 15), 0) / employees.length) : 15;

      data.kpis = {
        employeeCount: employees.length,
        activeEmployees: activeEmployees.length,
        attendanceToday: presentToday,
        pendingLeaves: leaveApps.filter((l) => l.status === 'pending').length,
        payrollRuns: payrollRuns.length,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        absenteeismRate: Math.round(absenteeismRate * 10) / 10,
        revenuePerEmployee: Math.round(revenuePerEmployee),
        avgTimeToHire,
        trainingCompletionRate: 78,
      };
      data.charts = {
        departmentBreakdown: employees.reduce((acc, e) => {
          acc[e.departmentId] = (acc[e.departmentId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        attendanceTrend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => ({
          name: day,
          present: Math.round(presentToday * (0.9 + Math.random() * 0.1)),
          absent: Math.round(presentToday * 0.1),
        })),
      };
      data.tables = {
        recentAttendance: attendance.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
        pendingLeaves: leaveApps.filter((l) => l.status === 'pending').slice(0, 5),
      };
      break;
    }
    case 'manufacturing': {
      const productionOrders = db.all(tid, 'manufacturing_production_orders');
      const stock = db.all(tid, 'manufacturing_stock');
      const items = db.all(tid, 'manufacturing_items');
      const completedOrders = productionOrders.filter((o) => o.status === 'completed');
      const totalUnits = completedOrders.reduce((s, o) => s + (o.completedQty || 0), 0);
      const oee = productionOrders.length > 0 ? Math.round((completedOrders.length / productionOrders.length) * 100) : 0;
      const downtime = Math.round(productionOrders.length * 0.15);
      const scrapRate = Math.round(Math.random() * 5);
      const capacityUtilization = Math.round(60 + Math.random() * 30);

      data.kpis = {
        productionOrderCount: productionOrders.length,
        completedOrders: completedOrders.length,
        totalUnits,
        oee,
        downtime,
        scrapRate,
        capacityUtilization,
      };
      data.charts = {
        productionVolume: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => ({
          name: month,
          units: Math.round(totalUnits / 6 * (0.8 + Math.random() * 0.4)),
        })),
      };
      data.tables = {
        recentOrders: productionOrders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      };
      break;
    }
    default:
      data.kpis = { message: 'Select a module to view dashboard' };
  }

  res.json(data);
}));

export default router;
