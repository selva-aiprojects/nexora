import * as React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import {
  AppShell,
  Badge,
  Button,
  ThemeToggle,
  ToastProvider,
  type NavSection,
} from '@/components';
import { api, getStoredToken, setStoredToken } from '@/lib/api';
import { ThemeProvider } from '@/lib/theme';

import ModuleDashboardSlider from '@/pages/dashboard/ModuleDashboardSlider';
import ModuleDashboard from '@/pages/dashboard/ModuleDashboard';
import ChartOfAccounts from '@/pages/accounting/ChartOfAccounts';
import JournalEntries from '@/pages/accounting/JournalEntries';
import SalesInvoices from '@/pages/accounting/SalesInvoices';
import PurchaseInvoices from '@/pages/accounting/PurchaseInvoices';
import GSTReturns from '@/pages/accounting/GSTReturns';
import BankAccounts from '@/pages/accounting/BankAccounts';
import AccountingReports from '@/pages/accounting/Reports';
import ManufacturingItemsPage from '@/pages/manufacturing/Items';
import ManufacturingStockPage from '@/pages/manufacturing/Stock';
import ManufacturingProcurementPage from '@/pages/manufacturing/Procurement';
import ManufacturingBomsPage from '@/pages/manufacturing/BOMs';
import ManufacturingProductionPage from '@/pages/manufacturing/Production';
import ManufacturingReportsPage from '@/pages/manufacturing/Reports';
import InventoryStockPage from '@/pages/inventory/Stock';
import InventoryWarehousesPage from '@/pages/inventory/Warehouses';
import InventoryReportsPage from '@/pages/inventory/Reports';
import EmployeesPage from '@/pages/hrms/Employees';
import AttendancePage from '@/pages/hrms/Attendance';
import LeavePage from '@/pages/hrms/Leave';
import PayrollPage from '@/pages/hrms/Payroll';
import StatutoryPage from '@/pages/hrms/Statutory';

import ComplianceDeadlines from '@/pages/compliance/Deadlines';
import ComplianceFilings from '@/pages/compliance/Filings';
import DMSDocumentsPage from '@/pages/dms/Documents';
import ESSHomePage from '@/pages/ess/Home';
import ESSAttendancePage from '@/pages/ess/Attendance';
import ESSLeavePage from '@/pages/ess/Leave';
import ESSExpensesPage from '@/pages/ess/Expenses';
import ESSPayslipsPage from '@/pages/ess/Payslips';
import AICopilotPage from '@/pages/ai/Copilot';
import AIInsightsPage from '@/pages/ai/Insights';
import AIAnomaliesPage from '@/pages/ai/Anomalies';
import AIRecommendationsPage from '@/pages/ai/Recommendations';
import AIInvoiceProcessingPage from '@/pages/ai/InvoiceProcessing';
import CRMCustomersPage from '@/pages/crm/Customers';
import CRMLeadsPage from '@/pages/crm/Leads';
import CRMQuotesPage from '@/pages/crm/Quotes';
import CRMSalesOrdersPage from '@/pages/crm/SalesOrders';
import ProcurementVendorsPage from '@/pages/procurement/Vendors';
import ProcurementVendorQuotesPage from '@/pages/procurement/VendorQuotes';
import ProcurementContractsPage from '@/pages/procurement/Contracts';
import ProcurementGRNsPage from '@/pages/procurement/GRNs';
import ProjectsPage from '@/pages/projects/Projects';
import WBSItemsPage from '@/pages/projects/WBS';
import ProjectTimeEntriesPage from '@/pages/projects/TimeEntries';
import ProjectBudgetsPage from '@/pages/projects/Budgets';
import ProjectReportsPage from '@/pages/projects/Reports';
import InspectionPlansPage from '@/pages/quality/InspectionPlans';
import QCChecksPage from '@/pages/quality/Checks';
import NonConformancesPage from '@/pages/quality/NonConformances';
import UsersPage from '@/pages/admin/Users';
import RolesPage from '@/pages/admin/Roles';

function useActiveNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const NAV: NavSection[] = [
    {
      title: 'Finance & Accounts',
      items: [
        { label: 'Dashboard', to: '/', active: isActive('/') },
        { label: 'Sales Invoices', to: '/invoices', active: isActive('/invoices') },
        { label: 'Purchase Expenses', to: '/expenses', active: isActive('/expenses') },
        { label: 'GST & Compliance', to: '/compliance', active: isActive('/compliance'), badge: <Badge tone="info">3</Badge> },
      ],
    },
    {
      title: 'Accounting',
      items: [
        { label: 'Chart of accounts', to: '/accounting/chart-of-accounts', active: isActive('/accounting/chart-of-accounts') },
        { label: 'Journal entries', to: '/accounting/journal-entries', active: isActive('/accounting/journal-entries') },
        { label: 'Sales invoices', to: '/accounting/sales-invoices', active: isActive('/accounting/sales-invoices') },
        { label: 'Purchase invoices', to: '/accounting/purchase-invoices', active: isActive('/accounting/purchase-invoices') },
        { label: 'GST returns', to: '/accounting/gst', active: isActive('/accounting/gst') },
        { label: 'Bank accounts', to: '/accounting/bank-accounts', active: isActive('/accounting/bank-accounts') },
        { label: 'Reports', to: '/accounting/reports', active: isActive('/accounting/reports') },
      ],
    },
    {
      title: 'HRMS',
      items: [
        { label: 'Employees', to: '/hrms/employees', active: isActive('/hrms/employees') },
        { label: 'Attendance', to: '/hrms/attendance', active: isActive('/hrms/attendance') },
        { label: 'Leave', to: '/hrms/leave', active: isActive('/hrms/leave') },
        { label: 'Payroll', to: '/hrms/payroll', active: isActive('/hrms/payroll') },
        { label: 'Statutory', to: '/hrms/statutory', active: isActive('/hrms/statutory') },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Stock', to: '/inventory/stock', active: isActive('/inventory/stock') },
        { label: 'Warehouses', to: '/inventory/warehouses', active: isActive('/inventory/warehouses') },
        { label: 'Reports', to: '/inventory/reports', active: isActive('/inventory/reports') },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Documents', to: '/documents', active: isActive('/documents') },
      ],
    },
    {
      title: 'Manufacturing',
      items: [
        { label: 'Items', to: '/manufacturing/items', active: isActive('/manufacturing/items') },
        { label: 'Stock', to: '/manufacturing/stock', active: isActive('/manufacturing/stock') },
        { label: 'Procurement', to: '/manufacturing/procurement', active: isActive('/manufacturing/procurement') },
        { label: 'Bills of Material', to: '/manufacturing/boms', active: isActive('/manufacturing/boms') },
        { label: 'Production', to: '/manufacturing/production', active: isActive('/manufacturing/production') },
        { label: 'Reports', to: '/manufacturing/reports', active: isActive('/manufacturing/reports') },
      ],
    },
    {
      title: 'Compliance',
      items: [
        { label: 'Deadlines', to: '/compliance/deadlines', active: isActive('/compliance/deadlines') },
        { label: 'Filings', to: '/compliance/filings', active: isActive('/compliance/filings') },
      ],
    },
    {
      title: 'Document Management',
      items: [
        { label: 'Documents', to: '/dms/documents', active: isActive('/dms/documents') },
      ],
    },
    {
      title: 'Employee Self-Service',
      items: [
        { label: 'Home', to: '/ess/home', active: isActive('/ess/home') },
        { label: 'Attendance', to: '/ess/attendance', active: isActive('/ess/attendance') },
        { label: 'Leave', to: '/ess/leave', active: isActive('/ess/leave') },
        { label: 'Expenses', to: '/ess/expenses', active: isActive('/ess/expenses') },
        { label: 'Payslips', to: '/ess/payslips', active: isActive('/ess/payslips') },
      ],
    },
    {
      title: 'Artificial Intelligence',
      items: [
        { label: 'Copilot', to: '/ai/copilot', active: isActive('/ai/copilot') },
        { label: 'Insights', to: '/ai/insights', active: isActive('/ai/insights') },
        { label: 'Anomalies', to: '/ai/anomalies', active: isActive('/ai/anomalies') },
        { label: 'Recommendations', to: '/ai/recommendations', active: isActive('/ai/recommendations') },
        { label: 'Invoice Processing', to: '/ai/invoice-processing', active: isActive('/ai/invoice-processing') },
      ],
    },
    {
      title: 'CRM',
      items: [
        { label: 'Customers', to: '/crm/customers', active: isActive('/crm/customers') },
        { label: 'Leads', to: '/crm/leads', active: isActive('/crm/leads') },
        { label: 'Quotes', to: '/crm/quotes', active: isActive('/crm/quotes') },
        { label: 'Sales Orders', to: '/crm/sales-orders', active: isActive('/crm/sales-orders') },
      ],
    },
    {
      title: 'Procurement',
      items: [
        { label: 'Vendors', to: '/procurement/vendors', active: isActive('/procurement/vendors') },
        { label: 'Vendor Quotes', to: '/procurement/vendor-quotes', active: isActive('/procurement/vendor-quotes') },
        { label: 'Contracts', to: '/procurement/contracts', active: isActive('/procurement/contracts') },
        { label: 'Goods Receipts', to: '/procurement/grns', active: isActive('/procurement/grns') },
      ],
    },
    {
      title: 'Projects',
      items: [
        { label: 'Projects', to: '/projects', active: isActive('/projects') },
        { label: 'Work Breakdown', to: '/projects/wbs', active: isActive('/projects/wbs') },
        { label: 'Time Entries', to: '/projects/time-entries', active: isActive('/projects/time-entries') },
        { label: 'Budgets', to: '/projects/budgets', active: isActive('/projects/budgets') },
        { label: 'Reports', to: '/projects/reports', active: isActive('/projects/reports') },
      ],
    },
    {
      title: 'Quality',
      items: [
        { label: 'Inspection Plans', to: '/quality/inspection-plans', active: isActive('/quality/inspection-plans') },
        { label: 'QC Checks', to: '/quality/checks', active: isActive('/quality/checks') },
        { label: 'Non-Conformances', to: '/quality/non-conformances', active: isActive('/quality/non-conformances') },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Users', to: '/admin/users', active: isActive('/admin/users') },
        { label: 'Roles & Permissions', to: '/admin/roles', active: isActive('/admin/roles') },
      ],
    },
  ];
  return NAV;
}

function DashboardScreen({ user }: { user: any }) {
  const [token, setToken] = React.useState<string | null>(getStoredToken());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          const res = await api.login('owner@acme.in', 'demo1234');
          if (cancelled) return;
          setToken(res.token);
          setStoredToken(res.token);
        } else {
          await api.me();
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message ?? 'Failed to load data');
        setToken(null);
        setStoredToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-sm text-ink-muted">Loading Nexora…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="space-y-3 text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button size="sm" onClick={() => { setToken(null); setStoredToken(null); }}>
            Retry login
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role === 'owner') {
    return <ModuleDashboardSlider />;
  }

  const userModule = user?.module || 'sales';
  return <ModuleDashboard module={userModule} />;
}

function App() {
  const NAV = useActiveNav();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    api.me().then((u) => { if (!cancelled) setUser(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const greeting = user?.name
    ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}`
    : 'Welcome';

  return (
    <AppShell
      header={
        <div className="flex flex-col items-center gap-2 p-2">
          <img src="/logo.png" alt="Nexora" className="h-10 w-auto" />
          <img src="/Tagline.png" alt="Run Your Business. Intelligently." className="max-h-12 w-auto px-1 object-contain" />
        </div>
      }
      sections={NAV}
      topBar={
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-ink-muted">{greeting}</div>
          <ThemeToggle />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<DashboardScreen user={user} />} />
        <Route path="/invoices" element={<SalesInvoices />} />
        <Route path="/expenses" element={<PurchaseInvoices />} />
        <Route path="/compliance" element={<ComplianceDeadlines />} />
        <Route path="/compliance/deadlines" element={<ComplianceDeadlines />} />
        <Route path="/compliance/filings" element={<ComplianceFilings />} />
        <Route path="/inventory" element={<InventoryStockPage />} />
        <Route path="/inventory/stock" element={<InventoryStockPage />} />
        <Route path="/inventory/warehouses" element={<InventoryWarehousesPage />} />
        <Route path="/inventory/reports" element={<InventoryReportsPage />} />
        <Route path="/hrms" element={<EmployeesPage />} />
        <Route path="/hrms/employees" element={<EmployeesPage />} />
        <Route path="/hrms/attendance" element={<AttendancePage />} />
        <Route path="/hrms/leave" element={<LeavePage />} />
        <Route path="/hrms/payroll" element={<PayrollPage />} />
        <Route path="/hrms/statutory" element={<StatutoryPage />} />
        <Route path="/documents" element={<DMSDocumentsPage />} />
        <Route path="/dms/documents" element={<DMSDocumentsPage />} />
        <Route path="/manufacturing/items" element={<ManufacturingItemsPage />} />
        <Route path="/manufacturing/stock" element={<ManufacturingStockPage />} />
        <Route path="/manufacturing/procurement" element={<ManufacturingProcurementPage />} />
        <Route path="/manufacturing/boms" element={<ManufacturingBomsPage />} />
        <Route path="/manufacturing/production" element={<ManufacturingProductionPage />} />
        <Route path="/manufacturing/reports" element={<ManufacturingReportsPage />} />
        <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="/accounting/journal-entries" element={<JournalEntries />} />
        <Route path="/accounting/sales-invoices" element={<SalesInvoices />} />
        <Route path="/accounting/purchase-invoices" element={<PurchaseInvoices />} />
        <Route path="/accounting/gst" element={<GSTReturns />} />
        <Route path="/accounting/bank-accounts" element={<BankAccounts />} />
        <Route path="/accounting/reports" element={<AccountingReports />} />
        <Route path="/ess/home" element={<ESSHomePage />} />
        <Route path="/ess/attendance" element={<ESSAttendancePage />} />
        <Route path="/ess/leave" element={<ESSLeavePage />} />
        <Route path="/ess/expenses" element={<ESSExpensesPage />} />
        <Route path="/ess/payslips" element={<ESSPayslipsPage />} />
        <Route path="/ai/copilot" element={<AICopilotPage />} />
        <Route path="/ai/insights" element={<AIInsightsPage />} />
        <Route path="/ai/anomalies" element={<AIAnomaliesPage />} />
        <Route path="/ai/recommendations" element={<AIRecommendationsPage />} />
        <Route path="/ai/invoice-processing" element={<AIInvoiceProcessingPage />} />
        <Route path="/crm/customers" element={<CRMCustomersPage />} />
        <Route path="/crm/leads" element={<CRMLeadsPage />} />
        <Route path="/crm/quotes" element={<CRMQuotesPage />} />
        <Route path="/crm/sales-orders" element={<CRMSalesOrdersPage />} />
        <Route path="/procurement/vendors" element={<ProcurementVendorsPage />} />
        <Route path="/procurement/vendor-quotes" element={<ProcurementVendorQuotesPage />} />
        <Route path="/procurement/contracts" element={<ProcurementContractsPage />} />
        <Route path="/procurement/grns" element={<ProcurementGRNsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/wbs" element={<WBSItemsPage />} />
        <Route path="/projects/time-entries" element={<ProjectTimeEntriesPage />} />
        <Route path="/projects/budgets" element={<ProjectBudgetsPage />} />
        <Route path="/projects/reports" element={<ProjectReportsPage />} />
        <Route path="/quality/inspection-plans" element={<InspectionPlansPage />} />
        <Route path="/quality/checks" element={<QCChecksPage />} />
        <Route path="/quality/non-conformances" element={<NonConformancesPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/roles" element={<RolesPage />} />
      </Routes>
    </AppShell>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
