import * as React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
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
import LoginPage from '@/pages/auth/LoginPage';

function ModuleDashboardPage() {
  const { module } = useParams<{ module: string }>();
  return <ModuleDashboard module={module || 'sales'} />;
}
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
import AssetsPage from '@/pages/assets/AssetsPage';

const ROLE_ALLOWED_SECTIONS: Record<string, string[]> = {
  owner: [
    'Finance & Accounts',
    'Accounting',
    'Fixed Assets',
    'HRMS',
    'Inventory',
    'Operations',
    'Manufacturing',
    'Compliance',
    'Document Management',
    'Employee Self-Service',
    'Artificial Intelligence',
    'CRM',
    'Procurement',
    'Projects',
    'Quality',
    'Admin',
  ],
  admin: [
    'Finance & Accounts',
    'Accounting',
    'Fixed Assets',
    'HRMS',
    'Inventory',
    'Operations',
    'Manufacturing',
    'Compliance',
    'Document Management',
    'Employee Self-Service',
    'Artificial Intelligence',
    'CRM',
    'Procurement',
    'Projects',
    'Quality',
    'Admin',
  ],
  finance: [
    'Finance & Accounts',
    'Accounting',
    'Fixed Assets',
    'Procurement',
    'Compliance',
    'Document Management',
    'Employee Self-Service',
    'Artificial Intelligence',
    'CRM',
  ],
  accountant: [
    'Finance & Accounts',
    'Accounting',
    'Fixed Assets',
    'Procurement',
    'Compliance',
    'Document Management',
    'Employee Self-Service',
    'Artificial Intelligence',
  ],
  hr: [
    'HRMS',
    'Compliance',
    'Document Management',
    'Employee Self-Service',
    'Artificial Intelligence',
  ],
  manager: [
    'Inventory',
    'Manufacturing',
    'Procurement',
    'Quality',
    'Projects',
    'Operations',
    'CRM',
    'Document Management',
    'Employee Self-Service',
    'Artificial Intelligence',
  ],
  employee: [
    'Employee Self-Service',
    'Document Management',
    'Artificial Intelligence',
  ],
};

function useActiveNav(userRole?: string) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const NAV: NavSection[] = [
    {
      title: 'Finance & Accounts',
      items: [
        { label: 'Command Center', to: '/', active: isActive('/') },
        { label: 'Sales Dashboard', to: '/dashboard/sales', active: isActive('/dashboard/sales') },
        { label: 'Sales Invoices', to: '/invoices', active: isActive('/invoices') },
        { label: 'Purchase Expenses', to: '/expenses', active: isActive('/expenses') },
        { label: 'GST & Compliance', to: '/compliance', active: isActive('/compliance'), badge: <Badge tone="info">3</Badge> },
      ],
    },
    {
      title: 'Accounting',
      items: [
        { label: 'Finance Dashboard', to: '/dashboard/finance', active: isActive('/dashboard/finance') },
        { label: 'Fixed Assets', to: '/assets', active: isActive('/assets') },
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
        { label: 'HRMS Dashboard', to: '/dashboard/hrms', active: isActive('/dashboard/hrms') },
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
        { label: 'Inventory Dashboard', to: '/dashboard/inventory', active: isActive('/dashboard/inventory') },
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
        { label: 'Manufacturing Dashboard', to: '/dashboard/manufacturing', active: isActive('/dashboard/manufacturing') },
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
        { label: 'CRM Dashboard', to: '/dashboard/crm', active: isActive('/dashboard/crm') },
        { label: 'Customers', to: '/crm/customers', active: isActive('/crm/customers') },
        { label: 'Leads', to: '/crm/leads', active: isActive('/crm/leads') },
        { label: 'Quotes', to: '/crm/quotes', active: isActive('/crm/quotes') },
        { label: 'Sales Orders', to: '/crm/sales-orders', active: isActive('/crm/sales-orders') },
      ],
    },
    {
      title: 'Procurement',
      items: [
        { label: 'Procurement Dashboard', to: '/dashboard/procurement', active: isActive('/dashboard/procurement') },
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
      title: 'Fixed Assets',
      items: [
        { label: 'Asset Register', to: '/assets', active: isActive('/assets') },
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

  const roleKey = userRole || 'employee';
  const allowedTitles: string[] = ROLE_ALLOWED_SECTIONS[roleKey] ?? ROLE_ALLOWED_SECTIONS.employee;
  return NAV.filter((section) => allowedTitles.includes(section.title as string));
}

function ProtectedRoute({
  allowedRoles,
  userRole,
  children,
}: {
  allowedRoles: string[];
  userRole?: string;
  children: React.ReactNode;
}) {
  const isAllowed =
    userRole === 'owner' ||
    userRole === 'admin' ||
    (userRole && allowedRoles.includes(userRole));

  if (!isAllowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-3xl text-danger">
          🔒
        </div>
        <h2 className="font-display text-xl font-bold text-ink">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          Your role (<span className="font-semibold text-ink uppercase">{userRole || 'Guest'}</span>) does not have permission to view this module.
        </p>
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={() => window.location.href = '/'}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function DashboardScreen({ user }: { user: any }) {
  if (user?.role === 'owner' || user?.role === 'admin') {
    return <ModuleDashboardSlider />;
  }

  if (user?.role === 'finance' || user?.role === 'accountant') {
    return <ModuleDashboard module="finance" />;
  }

  if (user?.role === 'hr') {
    return <ModuleDashboard module="hrms" />;
  }

  if (user?.role === 'manager') {
    return <ModuleDashboard module="manufacturing" />;
  }

  if (user?.role === 'employee') {
    return <ESSHomePage />;
  }

  const userModule = user?.module || 'sales';
  return <ModuleDashboard module={userModule} />;
}

function App() {
  const [user, setUser] = React.useState<any>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const NAV = useActiveNav(user?.role);

  React.useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    api.me()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => {
        if (!cancelled) setStoredToken(null);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-sm font-medium text-ink-muted">Loading Nexora Operating System…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

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
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{greeting}</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">{user.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<DashboardScreen user={user} />} />
        <Route path="/dashboard" element={<DashboardScreen user={user} />} />
        <Route path="/dashboard/:module" element={<ModuleDashboardPage />} />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant', 'manager']} userRole={user?.role}>
              <SalesInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant', 'manager']} userRole={user?.role}>
              <PurchaseInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant', 'hr']} userRole={user?.role}>
              <ComplianceDeadlines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance/deadlines"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant', 'hr']} userRole={user?.role}>
              <ComplianceDeadlines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance/filings"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant', 'hr']} userRole={user?.role}>
              <ComplianceFilings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <InventoryStockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/stock"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <InventoryStockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/warehouses"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <InventoryWarehousesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/reports"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <InventoryReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hrms"
          element={
            <ProtectedRoute allowedRoles={['hr']} userRole={user?.role}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hrms/employees"
          element={
            <ProtectedRoute allowedRoles={['hr']} userRole={user?.role}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hrms/attendance"
          element={
            <ProtectedRoute allowedRoles={['hr']} userRole={user?.role}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hrms/leave"
          element={
            <ProtectedRoute allowedRoles={['hr']} userRole={user?.role}>
              <LeavePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hrms/payroll"
          element={
            <ProtectedRoute allowedRoles={['hr']} userRole={user?.role}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hrms/statutory"
          element={
            <ProtectedRoute allowedRoles={['hr']} userRole={user?.role}>
              <StatutoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/documents" element={<DMSDocumentsPage />} />
        <Route path="/dms/documents" element={<DMSDocumentsPage />} />
        <Route
          path="/manufacturing/items"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <ManufacturingItemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturing/stock"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <ManufacturingStockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturing/procurement"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <ManufacturingProcurementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturing/boms"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <ManufacturingBomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturing/production"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <ManufacturingProductionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturing/reports"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <ManufacturingReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/chart-of-accounts"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <ChartOfAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/journal-entries"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <JournalEntries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/sales-invoices"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <SalesInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/purchase-invoices"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <PurchaseInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/gst"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <GSTReturns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/bank-accounts"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <BankAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/reports"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <AccountingReports />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/crm/customers"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <CRMCustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/leads"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <CRMLeadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/quotes"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <CRMQuotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/sales-orders"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <CRMSalesOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procurement/vendors"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <ProcurementVendorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procurement/vendor-quotes"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <ProcurementVendorQuotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procurement/contracts"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <ProcurementContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procurement/grns"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance', 'accountant']} userRole={user?.role}>
              <ProcurementGRNsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/wbs"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <WBSItemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/time-entries"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <ProjectTimeEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/budgets"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <ProjectBudgetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/reports"
          element={
            <ProtectedRoute allowedRoles={['manager', 'finance']} userRole={user?.role}>
              <ProjectReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/inspection-plans"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <InspectionPlansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/checks"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <QCChecksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/non-conformances"
          element={
            <ProtectedRoute allowedRoles={['manager']} userRole={user?.role}>
              <NonConformancesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin', 'owner']} userRole={user?.role}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute allowedRoles={['admin', 'owner']} userRole={user?.role}>
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <ProtectedRoute allowedRoles={['finance', 'accountant']} userRole={user?.role}>
              <AssetsPage />
            </ProtectedRoute>
          }
        />
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
