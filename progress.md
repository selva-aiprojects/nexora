# Nexora ERP — Progress Tracker

## Current Status: v1.0-beta

### ✅ Completed

#### Backend (Express + SQLite)
- **Platform**: auth (JWT), audit logging, notifications, global search, dashboard KPIs + charts
- **Accounting**: COA, journals, sales/purchase invoices, receipts/payments, GST returns, bank accounts, reports (aging, TB, P&L, BS)
- **HRMS**: employees, departments, designations, grades, attendance, leave types/applications, payroll runs, payslips, statutory
- **Manufacturing**: items, warehouses, stock, stock transfers, PRs, POs, GRs, BOMs, production orders, reports (ledger, valuation, shortage)
- **Procurement (standalone)**: vendors, vendor quotes, contracts, GRNs
- **Inventory (standalone)**: warehouses, bins, stock, adjustments, transfers, cycle counts, reports (valuation, movement, aging)
- **CRM**: customers, contacts, leads, quotes, sales orders, quote-to-SO conversion
- **Compliance**: categories, obligations, deadlines, filings, evidence
- **DMS**: folders, documents, versions, shares
- **ESS**: home, attendance, leave, expenses, payslips, documents
- **AI**: copilot, insights, anomalies, recommendations, invoice OCR processing
- **Theme system**: Intelligent Indigo palette, light/dark mode, module accents, brand gradients

#### Frontend (React + Vite + Tailwind)
- **Routing**: react-router-dom with all module routes
- **Components**: Button, Badge, Card, DataTable, FormField, Modal, Toast, AppShell, PageHeader, ConfirmDialog, ThemeToggle
- **Pages**: Dashboard (with charts), Accounting (7), HRMS (5), Manufacturing (6), Inventory (3), Procurement (4), CRM (4), Compliance (2), DMS (1), ESS (5), AI (5)
- **Charts**: Revenue trend, stock by warehouse, low-stock alerts (recharts)
- **Theme**: CSS variables for Intelligent Indigo, dark mode toggle, brand gradient utilities, module accent colors
- **Branding**: logo.png + Tagline.png in sidebar header, favicon.png

### 🚧 In Progress
- None

### 📋 Planned (Enhancements)

| Priority | Feature | Description |
|----------|---------|-------------|
| **P1** | Excel export | One-click CSV/Excel export for all tables |
| **P2** | Project Accounting | Projects, WBS, budgets, time tracking, project P&L |
| **P2** | Quality Control | Inspection plans, QC checks, non-conformance |
| **P3** | Advanced filters | Date ranges, amount filters, multi-criteria tables |
| **P3** | Form validation | Zod schema validation across all forms |
| **P4** | Skeleton loaders | Replace generic loading states |
| **P4** | Keyboard shortcuts | Ctrl+K search, Ctrl+N new record |
| **P4** | Print/PDF | Invoice print, report PDF download |
| **P5** | Multi-tenancy | Tenant onboarding, subscription, isolation |
| **P5** | RBAC | Role/permission matrix, data-level security |
| **P5** | Integrations | Email, SMS, bank feeds, e-invoicing, GSTN API |

### 🏗️ Architecture Decisions
- **Backend**: Express + node:sqlite (file-based), JWT auth, role-based access
- **Frontend**: React 19 + Vite + Tailwind CSS v4, react-router-dom
- **State**: React hooks + Context (Toast, Theme)
- **Data flow**: API client (`frontend/src/lib/api.ts`) typed against backend responses
- **Styling**: Design tokens in CSS variables, mapped to Tailwind colors
- **Module pattern**: Each backend module = Express router; each frontend module = pages/ folder

### 📊 Module Coverage

| Domain | Backend | Frontend | Routes |
|--------|---------|----------|--------|
| Platform | ✅ | ✅ | /api/auth, /api/dashboard, /api/search, /api/notifications |
| Accounting | ✅ | ✅ | /accounting/* |
| HRMS | ✅ | ✅ | /hrms/* |
| Manufacturing | ✅ | ✅ | /manufacturing/* |
| Inventory | ✅ | ✅ | /inventory/* |
| Procurement | ✅ | ✅ | /procurement/* |
| CRM | ✅ | ✅ | /crm/* |
| Compliance | ✅ | ✅ | /compliance/* |
| DMS | ✅ | ✅ | /dms/* |
| ESS | ✅ | ✅ | /ess/* |
| AI | ✅ | ✅ | /ai/* |

### 🎯 Next Milestone
1. **Excel export** — CSV/Excel download for all tables
2. **Project Accounting** — Projects, WBS, budgets, time tracking, project P&L
3. **Quality Control** — Inspection plans, QC checks, non-conformance
