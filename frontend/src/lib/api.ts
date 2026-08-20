const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function getToken(): string | null {
  try {
    return localStorage.getItem('nx_token');
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  if (token) localStorage.setItem('nx_token', token);
  else localStorage.removeItem('nx_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface DashboardKpis {
  revenue: number;
  receivables: number;
  payables: number;
  cash: number;
  inventory: number;
  payroll: number;
  overdueInvoices: number;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  aiAlerts: { level: string; text: string }[];
  quickActions: { label: string; module: string; action: string }[];
}

export interface SalesInvoice {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  status: string;
  lineItems: any[];
  subtotal: number;
  gstTotal: number;
  total: number;
  paid: number;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  channel: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  rows: Notification[];
  total: number;
  unread: number;
}

export interface SearchResult {
  query: string;
  results: {
    customers?: { id: string; label: string; sub: string; module: string }[];
    vendors?: { id: string; label: string; sub: string; module: string }[];
    salesInvoices?: { id: string; label: string; sub: string; module: string }[];
    purchaseInvoices?: { id: string; label: string; sub: string; module: string }[];
    employees?: { id: string; label: string; sub: string; module: string }[];
    items?: { id: string; label: string; sub: string; module: string }[];
    documents?: { id: string; label: string; sub: string; module: string }[];
  };
}

export interface PurchaseInvoice {
  id: string;
  tenantId: string;
  number: string;
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate: string;
  status: string;
  lineItems: any[];
  subtotal: number;
  gstTotal: number;
  total: number;
  paid: number;
}

export interface ComplianceDeadline {
  id: string;
  obligationId: string;
  dueDate: string;
  ownerId: string;
  status: string;
  daysUntilDue: number;
  alertLevel: string;
}

export interface ComplianceFiling {
  id: string;
  obligationId: string;
  period: string;
  status: string;
  filedOn: string | null;
}

export interface ManufacturingStock {
  id: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  batch: string | null;
  serial: string | null;
}

export interface ManufacturingItem {
  id: string;
  sku: string;
  name: string;
  hsn: string;
  type: string;
  uom: string;
  standardCost: number;
  reorderLevel: number;
}

export interface HRMSDepartment {
  id: string;
  tenantId: string;
  name: string;
  code: string;
}

export interface HRMSDesignation {
  id: string;
  tenantId: string;
  title: string;
  grade: string;
}

export interface HRMSGrade {
  id: string;
  tenantId: string;
  name: string;
  minSalary: number;
  maxSalary: number;
}

export interface ManufacturingWarehouse {
  id: string;
  tenantId: string;
  name: string;
  location: string;
}

export interface ManufacturingStockTransfer {
  id: string;
  tenantId: string;
  number: string;
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  qty: number;
  date: string;
  status: string;
}

export interface ManufacturingPurchaseRequisition {
  id: string;
  tenantId: string;
  number: string;
  itemId: string;
  qty: number;
  requiredBy: string;
  status: string;
}

export interface ManufacturingPurchaseOrder {
  id: string;
  tenantId: string;
  number: string;
  vendorId: string;
  itemId: string;
  qty: number;
  rate: number;
  status: string;
}

export interface ManufacturingGoodsReceipt {
  id: string;
  tenantId: string;
  poId: string;
  qty: number;
  date: string;
}

export interface ManufacturingBomComponent {
  itemId: string;
  qty: number;
}

export interface ManufacturingBom {
  id: string;
  tenantId: string;
  name: string;
  finishedItemId: string;
  components: ManufacturingBomComponent[];
}

export interface ManufacturingProductionOrder {
  id: string;
  tenantId: string;
  number: string;
  bomId: string;
  finishedItemId: string;
  qty: number;
  status: string;
  stage: string;
}

export interface ManufacturingStockLedgerEntry {
  id: string;
  tenantId: string;
  itemId: string;
  date: string;
  type: string;
  qty: number;
  balance: number;
  reference: string;
}

export interface ManufacturingValuationRow {
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  value: number;
}

export interface ManufacturingValuationResponse {
  rows: ManufacturingValuationRow[];
  totalValue: number;
}

export interface ManufacturingShortageItem {
  bomId: string;
  bomName: string;
  itemId: string;
  itemName: string | null;
  requiredPerUnit: number;
  available: number;
  short: number;
}

export interface ManufacturingShortageResponse {
  shortages: ManufacturingShortageItem[];
}

export interface CreateManufacturingItem {
  sku: string;
  name: string;
  hsn?: string;
  type: string;
  uom: string;
  standardCost?: number;
  reorderLevel?: number;
}

export interface CreateManufacturingStockTransfer {
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  qty: number;
}

export interface CreateManufacturingPurchaseRequisition {
  itemId: string;
  qty: number;
  requiredBy: string;
}

export interface CreateManufacturingGoodsReceipt {
  poId: string;
  qty: number;
}

export interface CreateManufacturingBom {
  name: string;
  finishedItemId: string;
  components: ManufacturingBomComponent[];
}

export interface CreateManufacturingProductionOrder {
  bomId: string;
  finishedItemId: string;
  qty: number;
}

export interface HRMSEmployee {
  id: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  designationId: string;
  grade: string;
  dateOfJoining: string;
  status: string;
  salary: { basic: number; hra: number; allowances: number };
}

export interface CreateHRMSEmployeeInput {
  name: string;
  email: string;
  phone?: string;
  departmentId: string;
  designationId: string;
  grade?: string;
  dateOfJoining?: string;
  salary?: { basic: number; hra: number; allowances: number };
}

export interface HRMSAttendance {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

export interface HRMSLeaveType {
  id: string;
  tenantId: string;
  name: string;
  annualQuota: number;
}

export interface HRMSLeaveBalance {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  balance: number;
}

export interface HRMSLeaveApplication {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: string;
}

export interface HRMSPayrollRun {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

export interface HRMSPayslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  gross: number;
  pf: number;
  esic: number;
  pt: number;
  tds: number;
  deductions: number;
  net: number;
}

export interface HRMSStatutory {
  employeeCount: number;
  epf: number;
  esic: number;
  tds: number;
  totalStatutory: number;
}

export interface DMSDocument {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  folderId: string;
  ownerId: string;
  tags: string[];
  mimeType: string;
  size: number;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: string;
  isGroup: boolean;
  opening: number;
}

export interface JournalEntryLine {
  accountId: string;
  accountCode?: string;
  accountName?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  number: string;
  date: string;
  narration: string;
  status: string;
  entries: JournalEntryLine[];
}

export interface GSTReturn {
  id: string;
  tenantId: string;
  type: string;
  period: string;
  status: string;
  totalTax: number;
  filedOn: string | null;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  name: string;
  ifsc: string;
  balance: number;
}

export interface AgingBuckets {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface ProfitLoss {
  revenue: number;
  purchases: number;
  gstPaid: number;
  operatingExpense: number;
  netProfit: number;
  marginPct: number;
}

export interface BalanceSheet {
  assets: { cash: number; debtors: number; inventory: number; total: number };
  liabilities: { creditors: number; equity: number; total: number };
  balanced: boolean;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  gstin: string;
  email: string;
  creditLimit: number;
  outstanding: number;
}

export const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;

export interface ComplianceCategory {
  id: string;
  tenantId: string;
  name: string;
  type: string;
}

export interface ComplianceObligation {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  frequency: string;
  authority: string;
}

export interface ComplianceDeadline {
  id: string;
  obligationId: string;
  dueDate: string;
  ownerId: string;
  status: string;
  daysUntilDue: number;
  alertLevel: string;
}

export interface ComplianceFiling {
  id: string;
  obligationId: string;
  period: string;
  status: string;
  filedOn: string | null;
}

export interface ComplianceEvidence {
  id: string;
  tenantId: string;
  filingId: string;
  fileName: string;
  uploadedOn: string;
}

export interface DMSFolder {
  id: string;
  tenantId: string;
  name: string;
  parentId: string | null;
}

export interface CreateDMSDocument {
  name: string;
  category: string;
  folderId: string;
  tags?: string[];
  mimeType?: string;
  size?: number;
}

export interface DMSDocumentVersion {
  id: string;
  tenantId: string;
  documentId: string;
  version: number;
  uploadedOn: string;
  note: string;
}

export interface DMSShare {
  id: string;
  tenantId: string;
  documentId: string;
  sharedWith: string;
  expiresOn: string | null;
}

export interface ESSHome {
  employee: { name: string; code: string; department: string };
  attendanceStatus: { checkedIn: boolean; checkIn: string | null; status: string };
  leaveBalances: any[];
  latestPayslip: any | null;
  pendingActions: { leave: number; expenses: number };
  announcements: { id: string; title: string; body: string }[];
}

export interface ESSExpense {
  id: string;
  tenantId: string;
  employeeId: string;
  category: string;
  amount: number;
  date: string;
  status: string;
  description: string;
}

export interface ESSCreateExpense {
  category: string;
  amount: number;
  date: string;
  description?: string;
}

export interface AICopilotResponse {
  query: string;
  answer: string;
  data: unknown;
}

export interface AIInsight {
  id: string;
  title: string;
  detail: string;
  trend: string;
}

export interface AIAnomaly {
  id: string;
  type: string;
  severity: string;
  message: string;
  ref: string;
}

export interface AIRecommendation {
  id: string;
  priority: string;
  text: string;
}

export interface AIInvoiceProcessingResponse {
  extracted: {
    vendorName: string;
    gstin: string | null;
    amount: number;
    currency: string;
    lineItems: { description: string; amount: number }[];
    confidence: number;
  };
  poMatch: { poId: string; number: string } | null;
  duplicate: boolean;
  status: string;
}

export interface PurchaseInvoice {
  id: string;
  tenantId: string;
  number: string;
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate: string;
  status: string;
  lineItems: any[];
  subtotal: number;
  gstTotal: number;
  total: number;
  paid: number;
}

export interface SalesInvoice {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  status: string;
  lineItems: any[];
  subtotal: number;
  gstTotal: number;
  total: number;
  paid: number;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  channel: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  rows: Notification[];
  total: number;
  unread: number;
}

export interface SearchResult {
  query: string;
  results: {
    customers?: { id: string; label: string; sub: string; module: string }[];
    vendors?: { id: string; label: string; sub: string; module: string }[];
    salesInvoices?: { id: string; label: string; sub: string; module: string }[];
    purchaseInvoices?: { id: string; label: string; sub: string; module: string }[];
    employees?: { id: string; label: string; sub: string; module: string }[];
    items?: { id: string; label: string; sub: string; module: string }[];
    documents?: { id: string; label: string; sub: string; module: string }[];
  };
}

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface DashboardKpis {
  revenue: number;
  receivables: number;
  payables: number;
  cash: number;
  inventory: number;
  payroll: number;
  overdueInvoices: number;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  aiAlerts: { level: string; text: string }[];
  quickActions: { label: string; module: string; action: string }[];
}

export interface CRMCustomer {
  id: string;
  tenantId: string;
  name: string;
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  creditLimit: number;
  paymentTerms: string;
  status: string;
  createdAt: string;
}

export interface CRMContact {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  isPrimary: boolean;
}

export interface CRMLead {
  id: string;
  tenantId: string;
  customerId: string;
  source: string;
  status: string;
  probability: number;
  estimatedValue: number;
  expectedCloseDate: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
}

export interface CRMQuote {
  id: string;
  tenantId: string;
  customerId: string;
  number: string;
  date: string;
  validUntil: string;
  status: string;
  total: number;
  currency: string;
}

export interface CRMSalesOrder {
  id: string;
  tenantId: string;
  customerId: string;
  quoteId: string;
  number: string;
  date: string;
  deliveryDate: string;
  status: string;
  total: number;
  currency: string;
}

export interface CRMContactCreate {
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  isPrimary?: boolean;
}

export interface CRMLeadCreate {
  customerId: string;
  source: string;
  estimatedValue: number;
  expectedCloseDate: string;
  assignedTo?: string;
  notes?: string;
}

export interface CRMQuoteCreate {
  customerId: string;
  number: string;
  date: string;
  validUntil: string;
  total: number;
  currency?: string;
}

export interface CRMSalesOrderCreate {
  customerId: string;
  quoteId: string;
  number: string;
  date: string;
  deliveryDate: string;
  total: number;
  currency?: string;
}

export interface ProcurementVendor {
  id: string;
  tenantId: string;
  name: string;
  gstin: string;
  category: string;
  rating: number;
  paymentTerms: string;
  status: string;
  createdAt: string;
}

export interface ProcurementVendorQuote {
  id: string;
  tenantId: string;
  vendorId: string;
  number: string;
  date: string;
  validUntil: string;
  status: string;
  total: number;
  currency: string;
}

export interface ProcurementContract {
  id: string;
  tenantId: string;
  vendorId: string;
  number: string;
  startDate: string;
  endDate: string;
  status: string;
  value: number;
  terms: string;
}

export interface ProcurementGRN {
  id: string;
  tenantId: string;
  poId: string;
  vendorId: string;
  number: string;
  date: string;
  qty: number;
  acceptedQty: number;
  rejectedQty: number;
  remarks: string;
  status: string;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  managerId: string;
  createdAt: string;
}

export interface ProjectWbs {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description: string;
  parentId: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
}

export interface ProjectTimeEntry {
  id: string;
  tenantId: string;
  projectId: string;
  wbsId: string | null;
  employeeId: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  createdAt: string;
}

export interface ProjectBudget {
  id: string;
  tenantId: string;
  projectId: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
  createdAt: string;
}

export interface ProjectPlRow {
  projectId: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  wbsCount: number;
  timeEntries: number;
}

export interface QCInspectionPlan {
  id: string;
  tenantId: string;
  name: string;
  itemId: string;
  type: string;
  frequency: string;
  criteria: string;
  status: string;
  createdAt: string;
}

export interface QCCheck {
  id: string;
  tenantId: string;
  planId: string;
  batchId: string;
  inspectorId: string;
  date: string;
  result: string;
  remarks: string;
  status: string;
  createdAt: string;
}

export interface QCNonConformance {
  id: string;
  tenantId: string;
  checkId: string;
  description: string;
  severity: string;
  correctiveAction: string;
  status: string;
  createdAt: string;
}

export interface UserRow {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  module?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  key: string;
  label: string;
  permissions: string[];
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<AuthUser>('/auth/me'),

  tenant: () => request<any>('/auth/tenant'),

  getDashboard: () => request<DashboardResponse>('/dashboard'),

  getDashboardCharts: () =>
    request<{
      revenueTrend: { month: string; revenue: number; receivables: number }[];
      stockByWarehouse: { name: string; qty: number }[];
      lowStockItems: { name: string; qty: number; reorder: number }[];
    }>('/dashboard/charts'),

  getModuleDashboard: (module: string) =>
    request<any>(`/dashboard/${module}`),

  getSalesInvoices: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<ListResult<SalesInvoice>>(`/accounting/sales-invoices${q ? `?${q}` : ''}`);
  },

  getPurchaseInvoices: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<ListResult<PurchaseInvoice>>(`/accounting/purchase-invoices${q ? `?${q}` : ''}`);
  },

  getComplianceDeadlines: () => request<ListResult<ComplianceDeadline>>('/compliance/deadlines'),

  getComplianceFilings: () => request<ListResult<ComplianceFiling>>('/compliance/filings'),

  getManufacturingStock: () => request<ListResult<ManufacturingStock>>('/manufacturing/stock'),

  getManufacturingItems: () => request<ListResult<ManufacturingItem>>('/manufacturing/items'),

  createManufacturingItem: (body: CreateManufacturingItem) =>
    request<ManufacturingItem>('/manufacturing/items', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getManufacturingWarehouses: () =>
    request<ManufacturingWarehouse[]>('/manufacturing/warehouses'),

  createManufacturingStockTransfer: (body: CreateManufacturingStockTransfer) =>
    request<ManufacturingStockTransfer>('/manufacturing/stock-transfers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getManufacturingPurchaseRequisitions: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<ManufacturingPurchaseRequisition>>(`/manufacturing/purchase-requisitions${q ? `?${q}` : ''}`);
  },

  createManufacturingPurchaseRequisition: (body: CreateManufacturingPurchaseRequisition) =>
    request<ManufacturingPurchaseRequisition>('/manufacturing/purchase-requisitions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getManufacturingPurchaseOrders: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<ManufacturingPurchaseOrder>>(`/manufacturing/purchase-orders${q ? `?${q}` : ''}`);
  },

  createManufacturingGoodsReceipt: (body: CreateManufacturingGoodsReceipt) =>
    request<ManufacturingGoodsReceipt>('/manufacturing/goods-receipts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getManufacturingGoodsReceipts: () =>
    request<ListResult<ManufacturingGoodsReceipt>>('/manufacturing/goods-receipts'),

  getManufacturingBoms: () => request<ManufacturingBom[]>('/manufacturing/boms'),

  createManufacturingBom: (body: CreateManufacturingBom) =>
    request<ManufacturingBom>('/manufacturing/boms', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getManufacturingProductionOrders: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<ManufacturingProductionOrder>>(`/manufacturing/production-orders${q ? `?${q}` : ''}`);
  },

  createManufacturingProductionOrder: (body: CreateManufacturingProductionOrder) =>
    request<ManufacturingProductionOrder>('/manufacturing/production-orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  issueManufacturingProductionOrder: (id: string) =>
    request<ManufacturingProductionOrder>(`/manufacturing/production-orders/${encodeURIComponent(id)}/issue`, {
      method: 'POST',
    }),

  completeManufacturingProductionOrder: (id: string) =>
    request<ManufacturingProductionOrder>(`/manufacturing/production-orders/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
    }),

  getManufacturingStockLedger: (params?: { itemId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.itemId) qs.set('itemId', params.itemId);
    const q = qs.toString();
    return request<ListResult<ManufacturingStockLedgerEntry>>(`/manufacturing/reports/stock-ledger${q ? `?${q}` : ''}`);
  },

  getManufacturingValuation: () =>
    request<ManufacturingValuationResponse>('/manufacturing/reports/valuation'),

  getManufacturingMaterialShortage: () =>
    request<ManufacturingShortageResponse>('/manufacturing/reports/material-shortage'),

  getInventoryWarehouses: () => request<any[]>('/inventory/warehouses'),

  getInventoryBins: (params?: { warehouseId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.warehouseId) qs.set('warehouseId', params.warehouseId);
    const q = qs.toString();
    return request<ListResult<any>>(`/inventory/bins${q ? `?${q}` : ''}`);
  },

  getInventoryStock: (params?: { warehouseId?: string; binId?: string; itemId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.warehouseId) qs.set('warehouseId', params.warehouseId);
    if (params?.binId) qs.set('binId', params.binId);
    if (params?.itemId) qs.set('itemId', params.itemId);
    const q = qs.toString();
    return request<ListResult<any>>(`/inventory/stock${q ? `?${q}` : ''}`);
  },

  createInventoryWarehouse: (body: { name: string; location: string; manager?: string }) =>
    request<any>('/inventory/warehouses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createInventoryBin: (body: { warehouseId: string; code: string; name: string }) =>
    request<any>('/inventory/bins', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getInventoryAdjustments: (params?: { itemId?: string; warehouseId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.itemId) qs.set('itemId', params.itemId);
    if (params?.warehouseId) qs.set('warehouseId', params.warehouseId);
    const q = qs.toString();
    return request<ListResult<any>>(`/inventory/adjustments${q ? `?${q}` : ''}`);
  },

  createInventoryAdjustment: (body: { itemId: string; warehouseId: string; binId: string; type: string; qty: number; reason: string; date: string }) =>
    request<any>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getInventoryTransfers: (params?: { itemId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.itemId) qs.set('itemId', params.itemId);
    const q = qs.toString();
    return request<ListResult<any>>(`/inventory/transfers${q ? `?${q}` : ''}`);
  },

  createInventoryTransfer: (body: { itemId: string; fromWarehouseId: string; toWarehouseId: string; qty: number }) =>
    request<any>('/inventory/transfers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getInventoryCycleCounts: (params?: { warehouseId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.warehouseId) qs.set('warehouseId', params.warehouseId);
    const q = qs.toString();
    return request<ListResult<any>>(`/inventory/cycle-counts${q ? `?${q}` : ''}`);
  },

  createInventoryCycleCount: (body: { warehouseId: string; binId: string; itemId: string; expectedQty: number; countedQty: number }) =>
    request<any>('/inventory/cycle-counts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getInventoryValuation: () =>
    request<{ rows: any[]; totalValue: number }>('/inventory/reports/valuation'),

  getInventoryMovement: () =>
    request<ListResult<any>>('/inventory/reports/movement'),

  getInventoryAging: () =>
    request<ListResult<any>>('/inventory/reports/aging'),

  getHRMSEmployees: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<ListResult<HRMSEmployee>>(`/hrms/employees${q ? `?${q}` : ''}`);
  },

  getHRMSDepartments: () => request<HRMSDepartment[]>('/hrms/departments'),

  getHRMSDesignations: () => request<HRMSDesignation[]>('/hrms/designations'),

  getHRMSGrades: () => request<HRMSGrade[]>('/hrms/grades'),

  getHRMSEmployee: (id: string) => request<HRMSEmployee>(`/hrms/employees/${encodeURIComponent(id)}`),

  createHRMSEmployee: (input: CreateHRMSEmployeeInput) =>
    request<HRMSEmployee>('/hrms/employees', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getHRMSAttendance: (params?: { employeeId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.employeeId) qs.set('employeeId', params.employeeId);
    const q = qs.toString();
    return request<ListResult<HRMSAttendance>>(`/hrms/attendance${q ? `?${q}` : ''}`);
  },

  checkInHRMS: (employeeId?: string) =>
    request<HRMSAttendance>('/hrms/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(employeeId ? { employeeId } : {}),
    }),

  checkOutHRMS: (employeeId?: string) =>
    request<HRMSAttendance>('/hrms/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(employeeId ? { employeeId } : {}),
    }),

  getHRMSLeaveTypes: () => request<HRMSLeaveType[]>('/hrms/leave-types'),

  getHRMSLeaveBalances: (employeeId: string) =>
    request<HRMSLeaveBalance[]>(`/hrms/leave-balances/${encodeURIComponent(employeeId)}`),

  getHRMSLeaveApplications: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<HRMSLeaveApplication>>(`/hrms/leave-applications${q ? `?${q}` : ''}`);
  },

  applyHRMSLeave: (input: { employeeId?: string; leaveTypeId: string; from: string; to: string; days: number; reason?: string }) =>
    request<HRMSLeaveApplication>('/hrms/leave-applications', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  approveHRMSLeave: (id: string) =>
    request<HRMSLeaveApplication>(`/hrms/leave-applications/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    }),

  rejectHRMSLeave: (id: string) =>
    request<HRMSLeaveApplication>(`/hrms/leave-applications/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
    }),

  getHRMSPayrollRuns: () => request<HRMSPayrollRun[]>('/hrms/payroll-runs'),

  createHRMSPayrollRun: (input: { periodStart: string; periodEnd: string }) =>
    request<HRMSPayrollRun>('/hrms/payroll-runs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getHRMSPayslips: (runId: string) =>
    request<HRMSPayslip[]>(`/hrms/payroll-runs/${encodeURIComponent(runId)}/payslips`),

  approveHRMSPayrollRun: (id: string) =>
    request<HRMSPayrollRun>(`/hrms/payroll-runs/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    }),

  getHRMSPayslip: (id: string) => request<HRMSPayslip>(`/hrms/payslips/${encodeURIComponent(id)}`),

  getHRMSStatutory: () => request<HRMSStatutory>('/hrms/statutory'),

  getDMSDocuments: (params?: { category?: string; folderId?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.folderId) qs.set('folderId', params.folderId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<ListResult<DMSDocument>>(`/dms/documents${q ? `?${q}` : ''}`);
  },

  getCustomers: () => request<ListResult<Customer>>('/accounting/customers'),

  getAccounts: (params?: { type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    const q = qs.toString();
    return request<ListResult<Account>>(`/accounting/accounts${q ? `?${q}` : ''}`);
  },

  createAccount: (body: { code: string; name: string; type: string; opening?: number }) =>
    request<Account>('/accounting/accounts', {
      method: 'POST',
      body: JSON.stringify({ opening: 0, ...body }),
    }),

  getJournalEntries: () => request<ListResult<JournalEntry>>('/accounting/journal-entries'),

  createJournalEntry: (body: { date: string; narration: string; entries: JournalEntryLine[] }) =>
    request<JournalEntry>('/accounting/journal-entries', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  postJournalEntry: (id: string) =>
    request<JournalEntry>(`/accounting/journal-entries/${encodeURIComponent(id)}/post`, {
      method: 'POST',
    }),

  createSalesInvoice: (body: { customerId: string; date: string; dueDate: string; lineItems: any[] }) =>
    request<SalesInvoice>('/accounting/sales-invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  addReceipt: (invoiceId: string, body: { amount: number; date: string }) =>
    request<SalesInvoice>(`/accounting/sales-invoices/${encodeURIComponent(invoiceId)}/receipts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  approvePurchaseInvoice: (id: string) =>
    request<PurchaseInvoice>(`/accounting/purchase-invoices/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    }),

  addPurchasePayment: (id: string, body: { amount: number; date: string }) =>
    request<PurchaseInvoice>(`/accounting/purchase-invoices/${encodeURIComponent(id)}/payments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getBankAccounts: () => request<BankAccount[]>('/accounting/bank-accounts'),

  getGSTReturns: (params?: { type?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<GSTReturn>>(`/accounting/gst/returns${q ? `?${q}` : ''}`);
  },

  fileGSTReturn: (id: string) =>
    request<GSTReturn>(`/accounting/gst/returns/${encodeURIComponent(id)}/file`, {
      method: 'POST',
    }),

  getReceivablesAging: () => request<AgingBuckets>('/accounting/reports/receivables-aging'),

  getPayablesAging: () => request<AgingBuckets>('/accounting/reports/payables-aging'),

  getTrialBalance: () => request<TrialBalance>('/accounting/reports/trial-balance'),

  getProfitLoss: () => request<ProfitLoss>('/accounting/reports/profit-loss'),

  getBalanceSheet: () => request<BalanceSheet>('/accounting/reports/balance-sheet'),

  getComplianceCategories: () => request<ComplianceCategory[]>('/compliance/categories'),

  getComplianceObligations: () => request<ComplianceObligation[]>('/compliance/obligations'),

  submitComplianceFiling: (id: string) =>
    request<ComplianceFiling>(`/compliance/filings/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    }),

  verifyComplianceFiling: (id: string) =>
    request<ComplianceFiling>(`/compliance/filings/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
    }),

  createComplianceEvidence: (body: { filingId: string; fileName: string }) =>
    request<ComplianceEvidence>('/compliance/evidence', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getComplianceEvidence: (filingId: string) =>
    request<ComplianceEvidence[]>(`/compliance/evidence/${encodeURIComponent(filingId)}`),

  getDMSFolders: () => request<DMSFolder[]>('/dms/folders'),

  createDMSDocument: (body: CreateDMSDocument) =>
    request<DMSDocument>('/dms/documents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getDMSDocument: (id: string) => request<DMSDocument>(`/dms/documents/${encodeURIComponent(id)}`),

  getDMSDocumentVersions: (id: string) =>
    request<DMSDocumentVersion[]>(`/dms/documents/${encodeURIComponent(id)}/versions`),

  createDMSDocumentVersion: (id: string, body: { note?: string }) =>
    request<DMSDocumentVersion>(`/dms/documents/${encodeURIComponent(id)}/versions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  shareDMSDocument: (id: string, body: { sharedWith: string; expiresOn?: string | null }) =>
    request<DMSShare>(`/dms/documents/${encodeURIComponent(id)}/share`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getESSHome: () => request<ESSHome>('/ess/home'),

  checkInESS: (employeeId?: string) =>
    request<HRMSAttendance>('/ess/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(employeeId ? { employeeId } : {}),
    }),

  checkOutESS: (employeeId?: string) =>
    request<HRMSAttendance>('/ess/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(employeeId ? { employeeId } : {}),
    }),

  getESSLeave: () => request<ListResult<HRMSLeaveApplication>>('/ess/leave'),

  createESSLeave: (input: { leaveTypeId: string; from: string; to: string; days: number; reason?: string }) =>
    request<HRMSLeaveApplication>('/ess/leave', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getESSExpenses: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<ESSExpense>>(`/ess/expenses${q ? `?${q}` : ''}`);
  },

  createESSExpense: (body: ESSCreateExpense) =>
    request<ESSExpense>('/ess/expenses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getESSPayslips: () => request<ListResult<HRMSPayslip>>('/ess/payslips'),

  getESSDocuments: () => request<ListResult<DMSDocument>>('/ess/documents'),

  copilotAI: (query: string) =>
    request<AICopilotResponse>('/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  getAIInsights: () => request<ListResult<AIInsight>>('/ai/insights'),

  getAIAnomalies: () => request<{ rows: AIAnomaly[]; total: number }>('/ai/anomalies'),

  getAIRecommendations: () => request<ListResult<AIRecommendation>>('/ai/recommendations'),

  processInvoiceAI: (text: string) =>
    request<AIInvoiceProcessingResponse>('/ai/invoice-processing', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getCRMCustomers: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<CRMCustomer>>(`/crm/customers${q ? `?${q}` : ''}`);
  },

  getCRMCustomer: (id: string) => request<CRMCustomer>(`/crm/customers/${encodeURIComponent(id)}`),

  createCRMCustomer: (body: { name: string; billingAddress: string; gstin?: string; shippingAddress?: string; creditLimit?: number; paymentTerms?: string }) =>
    request<CRMCustomer>('/crm/customers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCRMCustomer: (id: string, body: Partial<{ name: string; gstin: string; billingAddress: string; shippingAddress: string; creditLimit: number; paymentTerms: string; status: string }>) =>
    request<CRMCustomer>(`/crm/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getCRMContacts: (customerId: string) =>
    request<ListResult<CRMContact>>(`/crm/customers/${encodeURIComponent(customerId)}/contacts`),

  createCRMContact: (customerId: string, body: CRMContactCreate) =>
    request<CRMContact>(`/crm/customers/${encodeURIComponent(customerId)}/contacts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getCRMLeads: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<CRMLead>>(`/crm/leads${q ? `?${q}` : ''}`);
  },

  createCRMLead: (body: CRMLeadCreate) =>
    request<CRMLead>('/crm/leads', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCRMLead: (id: string, body: Partial<CRMLead>) =>
    request<CRMLead>(`/crm/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getCRMQuotes: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<CRMQuote>>(`/crm/quotes${q ? `?${q}` : ''}`);
  },

  createCRMQuote: (body: CRMQuoteCreate) =>
    request<CRMQuote>('/crm/quotes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCRMQuote: (id: string, body: Partial<CRMQuote>) =>
    request<CRMQuote>(`/crm/quotes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  convertCRMQuote: (id: string, body: { deliveryDate?: string }) =>
    request<CRMSalesOrder>(`/crm/quotes/${encodeURIComponent(id)}/convert`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getCRMSalesOrders: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<CRMSalesOrder>>(`/crm/sales-orders${q ? `?${q}` : ''}`);
  },

  createCRMSalesOrder: (body: CRMSalesOrderCreate) =>
    request<CRMSalesOrder>('/crm/sales-orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getCRMSalesOrder: (id: string) => request<CRMSalesOrder>(`/crm/sales-orders/${encodeURIComponent(id)}`),

  updateCRMSalesOrder: (id: string, body: Partial<CRMSalesOrder>) =>
    request<CRMSalesOrder>(`/crm/sales-orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getProcurementVendors: (params?: { status?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const q = qs.toString();
    return request<ListResult<ProcurementVendor>>(`/procurement/vendors${q ? `?${q}` : ''}`);
  },

  getProcurementVendor: (id: string) => request<ProcurementVendor>(`/procurement/vendors/${encodeURIComponent(id)}`),

  createProcurementVendor: (body: { name: string; category: string; gstin?: string; rating?: number; paymentTerms?: string }) =>
    request<ProcurementVendor>('/procurement/vendors', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProcurementVendor: (id: string, body: Partial<ProcurementVendor>) =>
    request<ProcurementVendor>(`/procurement/vendors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getProcurementVendorQuotes: (params?: { status?: string; vendorId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.vendorId) qs.set('vendorId', params.vendorId);
    const q = qs.toString();
    return request<ListResult<ProcurementVendorQuote>>(`/procurement/vendor-quotes${q ? `?${q}` : ''}`);
  },

  createProcurementVendorQuote: (body: { vendorId: string; number: string; date: string; validUntil: string; total: number; currency?: string }) =>
    request<ProcurementVendorQuote>('/procurement/vendor-quotes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProcurementVendorQuote: (id: string, body: Partial<ProcurementVendorQuote>) =>
    request<ProcurementVendorQuote>(`/procurement/vendor-quotes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getProcurementContracts: (params?: { status?: string; vendorId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.vendorId) qs.set('vendorId', params.vendorId);
    const q = qs.toString();
    return request<ListResult<ProcurementContract>>(`/procurement/contracts${q ? `?${q}` : ''}`);
  },

  createProcurementContract: (body: { vendorId: string; number: string; startDate: string; endDate: string; value: number; terms?: string }) =>
    request<ProcurementContract>('/procurement/contracts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProcurementContract: (id: string, body: Partial<ProcurementContract>) =>
    request<ProcurementContract>(`/procurement/contracts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getProcurementGRNs: (params?: { poId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.poId) qs.set('poId', params.poId);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<ProcurementGRN>>(`/procurement/grns${q ? `?${q}` : ''}`);
  },

  createProcurementGRN: (body: { poId: string; vendorId: string; number: string; date: string; qty: number; acceptedQty: number; rejectedQty: number; remarks?: string }) =>
    request<ProcurementGRN>('/procurement/grns', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProcurementGRN: (id: string, body: Partial<ProcurementGRN>) =>
    request<ProcurementGRN>(`/procurement/grns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getProjects: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<Project>>(`/projects/projects${q ? `?${q}` : ''}`);
  },

  getProject: (id: string) => request<Project>(`/projects/projects/${encodeURIComponent(id)}`),

  createProject: (body: { name: string; code: string; description?: string; status?: string; startDate: string; endDate: string; budget: number; managerId?: string }) =>
    request<Project>('/projects/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProject: (id: string, body: Partial<Project>) =>
    request<Project>(`/projects/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteProject: (id: string) =>
    request<void>(`/projects/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getWbs: (params?: { projectId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    const q = qs.toString();
    return request<ListResult<ProjectWbs>>(`/projects/wbs${q ? `?${q}` : ''}`);
  },

  createWbs: (body: { projectId: string; name: string; description?: string; parentId?: string | null; startDate: string; endDate: string; budget: number; status?: string }) =>
    request<ProjectWbs>('/projects/wbs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateWbs: (id: string, body: Partial<ProjectWbs>) =>
    request<ProjectWbs>(`/projects/wbs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getTimeEntries: (params?: { projectId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    const q = qs.toString();
    return request<ListResult<ProjectTimeEntry>>(`/projects/time-entries${q ? `?${q}` : ''}`);
  },

  createTimeEntry: (body: { projectId: string; wbsId?: string | null; employeeId: string; date: string; hours: number; description?: string; billable?: boolean }) =>
    request<ProjectTimeEntry>('/projects/time-entries', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getProjectBudgets: (params?: { projectId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    const q = qs.toString();
    return request<ListResult<ProjectBudget>>(`/projects/budgets${q ? `?${q}` : ''}`);
  },

  createProjectBudget: (body: { projectId: string; category: string; amount: number; period: string }) =>
    request<ProjectBudget>('/projects/budgets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getProjectPl: (params?: { projectId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    const q = qs.toString();
    return request<ListResult<ProjectPlRow>>(`/projects/reports/project-pl${q ? `?${q}` : ''}`);
  },

  getQCInspectionPlans: (params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<QCInspectionPlan>>(`/quality/inspection-plans${q ? `?${q}` : ''}`);
  },

  getQCInspectionPlan: (id: string) => request<QCInspectionPlan>(`/quality/inspection-plans/${encodeURIComponent(id)}`),

  createQCInspectionPlan: (body: { name: string; itemId: string; type: string; frequency: string; criteria?: string; status?: string }) =>
    request<QCInspectionPlan>('/quality/inspection-plans', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQCInspectionPlan: (id: string, body: Partial<QCInspectionPlan>) =>
    request<QCInspectionPlan>(`/quality/inspection-plans/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteQCInspectionPlan: (id: string) =>
    request<void>(`/quality/inspection-plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getQCChecks: (params?: { planId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.planId) qs.set('planId', params.planId);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ListResult<QCCheck>>(`/quality/checks${q ? `?${q}` : ''}`);
  },

  createQCCheck: (body: { planId: string; batchId?: string; inspectorId: string; date: string; result?: string; remarks?: string; status?: string }) =>
    request<QCCheck>('/quality/checks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQCCheck: (id: string, body: Partial<QCCheck>) =>
    request<QCCheck>(`/quality/checks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getQCNonConformances: (params?: { checkId?: string; status?: string; severity?: string }) => {
    const qs = new URLSearchParams();
    if (params?.checkId) qs.set('checkId', params.checkId);
    if (params?.status) qs.set('status', params.status);
    if (params?.severity) qs.set('severity', params.severity);
    const q = qs.toString();
    return request<ListResult<QCNonConformance>>(`/quality/non-conformances${q ? `?${q}` : ''}`);
  },

  createQCNonConformance: (body: { checkId: string; description: string; severity: string; correctiveAction?: string; status?: string }) =>
    request<QCNonConformance>('/quality/non-conformances', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQCNonConformance: (id: string, body: Partial<QCNonConformance>) =>
    request<QCNonConformance>(`/quality/non-conformances/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  search: (query: string) =>
    request<SearchResult>(`/search?q=${encodeURIComponent(query)}`),

  getNotifications: () => request<NotificationsResponse>('/notifications'),

  markNotificationRead: (id: string) =>
    request<Notification>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    }),

  getUsers: (params?: { role?: string; status?: string; search?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<ListResult<UserRow>>(`/users${q ? `?${q}` : ''}`);
  },

  getUser: (id: string) => request<UserRow>(`/users/${encodeURIComponent(id)}`),

  createUser: (body: { name: string; email: string; password: string; role: string; employeeId?: string; status?: string; module?: string }) =>
    request<UserRow>('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateUser: (id: string, body: Partial<{ name: string; email: string; password: string; role: string; employeeId?: string; status?: string; module?: string }>) =>
    request<UserRow>(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteUser: (id: string) =>
    request<void>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  activateUser: (id: string) =>
    request<UserRow>(`/users/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    }),

  suspendUser: (id: string) =>
    request<UserRow>(`/users/${encodeURIComponent(id)}/suspend`, {
      method: 'POST',
    }),

  resetUserPassword: (id: string, password: string) =>
    request<UserRow>(`/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getRoles: () => request<{ roles: RoleOption[] }>('/users/roles'),
};

export function getStoredToken(): string | null {
  return getToken();
}

export function setStoredToken(token: string | null): void {
  setToken(token);
}
