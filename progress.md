# Nexora ERP — Progress Tracker

## Current Status: v1.1.0 (Global ERP Expansion — Deployed to Vercel & PostgreSQL Cloud)

### ✅ Completed Milestones

#### 1. Global Enterprise ERP Architecture (Phases 1, 2 & 3)
- **Fixed Asset Management Subsystem (`/assets`)**:
  - Full Asset Master Register across 6 asset categories (Machinery, Vehicles, IT Hardware, Buildings, Furniture, Tools).
  - Straight-Line Method (SLM) & Written-Down Value (WDV) automated monthly depreciation calculation engines.
  - One-click Batch Depreciation run posting double-entry journals to GL (`5800 - Depreciation Expense` and `1700 - Accumulated Depreciation`).
  - Asset Disposal & Write-Off with gain/loss computation.
  - Historical depreciation schedule drill-down modal per asset.
- **Multi-Currency & Realized FX Accounting Engine (`/currencies`)**:
  - Currency Exchange Rate Master supporting `INR`, `USD`, `EUR`, `GBP`, `AED`, `SGD`, `JPY`.
  - Multi-currency Sales Invoices and Purchase Invoices with exchange rate locking.
  - Realized FX Gain/Loss calculation on receipt/payment settlements: $(\text{Settlement Rate} - \text{Invoice Rate}) \times \text{Amount}$.
- **Universal Multi-Jurisdiction Tax Engine (`/finance/tax`)**:
  - Pre-configured international schemes: Indian GST (CGST/SGST/IGST), GCC 5% VAT, UK 20% VAT, EU VAT, US Sales Tax, and Tax-Exempt.
  - Interactive Tax Calculator modal with line-item component tax breakdowns.
  - Custom multi-component tax scheme builder with live toggle activations.
- **Multi-Level Threshold-Based Approval Workflows (`/finance/approvals`)**:
  - Amount-tier approval rules for Purchase Orders, Purchase Invoices, and Expense Claims ($<\text{₹50k}$, $\text{₹50k-5L}$, $>\text{₹5L}$).
  - Sequential approval chains (`manager` $\to$ `finance` $\to$ `owner`).
  - Visual approval progress bars and decision modals (Approve / Reject) with immutable audit logs.
- **Universal Master Data Importer (`/admin/importer`)**:
  - 4-step wizard: Entity Selection $\to$ CSV Upload $\to$ Row-by-Row Validation Preview $\to$ Database Commit.
  - Supports Customers, Vendors, Inventory Items, Employees, and Fixed Assets.
  - 1-click sample CSV template generator and error highlight panel.
- **Landed Cost Allocation Engine (`/procurement/landed-costs`)**:
  - Proportional cost capitalization across GRN items by Value or Quantity.
  - Captures Freight, Customs Duties, Tariffs, Insurance, and Port Demurrage.
  - Real-time unit valuation updates and stock posting with immutable audit logs.
- **Dynamic Reorder Point (ROP) & Auto-Reorder Engine (`/inventory/reorder`)**:
  - Formula: $ROP = (\text{Daily Demand} \times \text{Lead Time}) + \text{Safety Stock}$ with Economic Order Quantity (EOQ).
  - Visual runout runway gauges, stockout risk alerts, and 1-click batch Purchase Requisition generation.

#### 1. Cloud & Serverless Infrastructure (Vercel + Neon PostgreSQL)
- **Vercel Serverless Function**: API entry point at `/api/index.ts` mounting Express modular monolith with full path routing (`/api/*` and `/health`).
- **Neon Cloud Driver Pooler**: Integrated `@neondatabase/serverless` WebSocket/HTTP connection pooling to eliminate serverless TLS socket disconnects on Vercel Functions.
- **Dynamic Database Seam**: Dual-engine persistence layer (`server/src/core/db.ts`) with automatic environment variable discovery (`POSTGRES_URL`, `DATABASE_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`) and fallback to local SQLite / In-Memory.
- **Automatic Schema Migration**: Built-in zero-downtime column migration (`ensureTable`) handling legacy PostgreSQL column constraints (`tenant_id` / `tenantid` $\to$ `"tenantId"`).
- **Cold-Start Resilience**: Awaited seed initialization promises on authentication endpoints to prevent cold-start race conditions.

#### 2. Authentication & Login Experience
- **Dedicated Login Screen (`LoginPage.tsx`)**:
  - 1-Click Demo Persona selectors for Owner (`owner@acme.in`), Finance Lead (`finance@acme.in`), HR Manager (`hr@acme.in`), and Employee (`vikram@acme.in`).
  - Interactive password visibility toggle (Show/Hide).
  - Clear, accessible error banner alerts.
  - Branded left showcase panel highlighting AI Copilot and PostgreSQL engine features.
- **Automatic Stale Token Recovery**: Catches expired or legacy browser tokens in `localStorage` and automatically issues fresh credentials without breaking the user experience.
- **Sign Out Control**: Dedicated `Sign Out` button with active user role badge in the top navigation bar.

#### 3. Operational Command Center & 7-Module Dashboards
- **Executive Command Center (`/`)**: Multi-module slider with carousel tabs and `← Prev` / `Next →` buttons for the Owner/Superadmin.
- **7 Dedicated Module Dashboards**:
  - `💼 Sales` (`/dashboard/sales`): Revenue, AOV, Conversion Rate, Open Quotes, Churn, Status Donut & Revenue Trends.
  - `💰 Finance` (`/dashboard/finance`): Gross/Net Margins, 5-Bucket AR Aging, Cash Position, Cash Inflow vs. Outflow.
  - `🛒 Procurement` (`/dashboard/procurement`): Active Contracts, Spend by Category, Avg Lead Time, Vendor Ratings.
  - `📦 Inventory` (`/dashboard/inventory`): Stock Units, Turnover Rate, Stockout Risk, Warehouse Distribution.
  - `🏭 Manufacturing` (`/dashboard/manufacturing`): OEE %, Completed Work Orders, Units Produced, Capacity Utilization.
  - `🤝 CRM` (`/dashboard/crm`): Open Leads, Won Deals, Pipeline Funnel, CAC, Conversion Rate.
  - `👥 HRMS` (`/dashboard/hrms`): Active Employees, Daily Attendance, Turnover Rate, Revenue/Employee, Department Donut.
- **Direct Sidebar Links**: Each module in the left sidebar features a direct `Dashboard` shortcut.

#### 4. Backend Modular Monolith (11 Business Domains)
- **Platform**: JWT auth, HMAC token signing, append-only immutable audit trail (`recordAudit()`), global search, notifications.
- **Accounting**: Chart of Accounts, Journal Entries, Sales & Purchase Invoices, Payments/Receipts, GST Returns (GSTR-1, GSTR-3B), Banking, Balance Sheet, P&L, AR/AP Aging.
- **HRMS**: Employees, Departments, Designations, Attendance, Leave Management, Monthly Payroll Run Engine, Payslips, Statutory deductions (PF, ESI, PT).
- **Manufacturing**: Items, Warehouses, Stock Transfers, BOMs, Work Orders, Standard Cost Valuation, MRP Shortage Reports.
- **Inventory**: Multi-Warehouse Bins, Stock Adjustments, Transfers, Cycle Counts, Valuation Reports.
- **Procurement**: Vendor Master, Vendor Ratings, RFQs, Contracts, Goods Receipt Notes (GRN).
- **CRM**: Customers, Contacts, Leads, Quotes, Sales Orders, Quote-to-SO Conversion.
- **Projects**: Project Accounting, Work Breakdown Structure (WBS), Time Entries, Budgets, Project P&L.
- **Quality Control**: Inspection Plans, QC Sampling Checks, Non-Conformance (NC) Logs, CAPA Tracking.
- **Compliance**: Statutory Obligations, Deadline Calendar, Filings, Evidence Document Store.
- **DMS**: Folder Hierarchies, Document Version Trees, Secure Sharing.
- **ESS**: Mobile-friendly Employee Self-Service for Geo-Fenced Attendance, Leaves, Expense Claims, Payslips.
- **AI Copilot**: Automated Invoice OCR Parsing, Rolling 90-day Financial Anomaly Detection, Cash Flow Forecasting.

#### 5. Documentation & Architectural Governance
- **Technical & Architecture Design Document**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (Monolith architecture, PostgreSQL multi-tenancy, Vercel pipeline, Security matrix).
- **Functional Flow Document**: [`docs/FUNCTIONAL_FLOW.md`](docs/FUNCTIONAL_FLOW.md) (O2C, P2P, Plan-to-Produce, Hire-to-Retire, Record-to-Report, Inspect-to-CAPA workflows).
- **Upgrade Governance Skill**: [`.agents/skills/nexora-upgrade-guide/SKILL.md`](.agents/skills/nexora-upgrade-guide/SKILL.md) (Rules, database patterns, and testing protocols for future upgrades).

---

### 📋 Planned Future Enhancements

| Priority | Category | Feature | Description |
| :--- | :--- | :--- | :--- |
| **P1** | Integrations | GSTN & E-Invoicing | Direct GST portal API integration for GSTR-1/3B auto-filing & IRN QR generation. |
| **P1** | Integrations | Open Banking Feeds | Automatic bank statement fetch via Account Aggregator / Open Banking APIs. |
| **P2** | Mobile | Native PWA Shell | Offline-capable Progressive Web App for Mobile ESS and Shop Floor QC execution. |
| **P2** | Workflow | Visual Workflow Builder | Custom drag-and-drop multi-stage approval matrix with SLA escalation timers. |
| **P3** | Intelligence | Advanced LLM RAG | Vector search across enterprise DMS documents with conversational Copilot Q&A. |
| **P3** | Performance | Redis Query Caching | Distributed query cache for high-frequency dashboard KPI endpoints. |

---

### 📊 Module Coverage Summary

| Domain | Backend API | Frontend UI | Verified Live (Vercel) |
| :--- | :---: | :---: | :---: |
| **Platform / Auth** | ✅ | ✅ | ✅ |
| **Sales & CRM** | ✅ | ✅ | ✅ |
| **Accounting & GST** | ✅ | ✅ | ✅ |
| **Procurement** | ✅ | ✅ | ✅ |
| **Inventory** | ✅ | ✅ | ✅ |
| **Manufacturing** | ✅ | ✅ | ✅ |
| **HRMS & Payroll** | ✅ | ✅ | ✅ |
| **Projects** | ✅ | ✅ | ✅ |
| **Quality Control** | ✅ | ✅ | ✅ |
| **Compliance** | ✅ | ✅ | ✅ |
| **DMS** | ✅ | ✅ | ✅ |
| **ESS Mobile** | ✅ | ✅ | ✅ |
| **AI Copilot** | ✅ | ✅ | ✅ |
