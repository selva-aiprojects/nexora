# Nexora ERP — Progress Tracker

## Current Status: v1.1-beta

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
- **Project Accounting**: projects, WBS, time entries, budgets, project P&L reports
- **Quality Control**: inspection plans, QC checks, non-conformances, severity tracking
- **Theme system**: Intelligent Indigo palette, light/dark mode, module accents, brand gradients

#### Frontend (React + Vite + Tailwind)
- **Routing**: react-router-dom with all module routes
- **Components**: Button, Badge, Card, DataTable, FormField, Modal, Toast, AppShell, PageHeader, ConfirmDialog, ThemeToggle, FilterBar, TableToolbar
- **Pages**: Dashboard (with charts), Accounting (7), HRMS (5), Manufacturing (6), Inventory (3), Procurement (4), Projects (5), Quality (3), CRM (4), Compliance (2), DMS (1), ESS (5), AI (5)
- **Charts**: Revenue trend, stock by warehouse, low-stock alerts (recharts)
- **Theme**: CSS variables for Intelligent Indigo, dark mode toggle, brand gradient utilities, module accent colors
- **Branding**: logo.png + Tagline.png in sidebar header, favicon.png
- **Validation**: Zod schemas for sales invoices, purchase invoices, employees, customers, vendors, projects
- **Filters**: Reusable FilterBar component with search, date range, amount range, status filter, saved presets
- **Export**: CSV/Excel export utilities (xlsx, papaparse) — wired into TableToolbar
- **Print**: Print CSS + window.print() wired into TableToolbar
- **TableToolbar**: Unified toolbar with title, filters, export, print, bulk actions, extra actions
- **DataTable enhancements**: visibleColumns prop, selectedIds support (wired in key pages)

### 🚧 In Progress
- Applying TableToolbar + FilterBar to remaining pages (purchase invoices, customers, leads, etc.)
- Dashboard customization widgets
- Data import component (CSV/Excel mapping + preview)

### 📋 Planned (Enhancements)

| Priority | Category | Feature | Description |
|----------|----------|---------|-------------|
| **P1** | Data | Excel/CSV export | One-click export for all tables (xlsx/csv) |
| **P1** | UX | Advanced filters | Date ranges, amount filters, multi-criteria search, saved filters |
| **P2** | Module | Project Accounting | Projects, WBS, budgets, time tracking, project P&L, cost centers |
| **P2** | Module | Quality Control | Inspection plans, QC checks, non-conformance, CAPA |
| **P2** | UX | Print/PDF | Invoice print, report PDF download, print-friendly layouts |
| **P3** | UX | Form validation | Zod schema validation, inline errors, cross-field validation |
| **P3** | UX | Skeleton loaders | Replace generic loading states with module-specific skeletons |
| **P3** | UX | Keyboard shortcuts | Ctrl+K search, Ctrl+N new record, Ctrl+S save, Ctrl+E export |
| **P3** | UX | Drag & drop | Kanban boards for leads, tasks, production stages |
| **P3** | UX | Bulk actions | Bulk approve, delete, export, assign across tables |
| **P3** | UX | Inline editing | Edit table cells directly without opening forms |
| **P3** | UX | Column customization | Show/hide, reorder, pin columns in data tables |
| **P4** | UX | Dark mode refinements | Ensure all modules render correctly in dark mode |
| **P4** | UX | Mobile responsiveness | Tablet/mobile layouts for ESS and common workflows |
| **P4** | UX | Tour/onboarding | First-time user walkthrough, contextual help tooltips |
| **P4** | UX | Undo/redo | Soft delete with undo, action history restoration |
| **P4** | Data | Audit trail viewer | Visual timeline of record changes with diff view |
| **P4** | Data | Data import | CSV/Excel import with mapping, validation, preview |
| **P4** | Data | Saved reports | Custom report builder, scheduled email reports |
| **P4** | Data | Dashboard customization | Drag-drop widgets, custom KPIs, saved dashboards |
| **P4** | Data | Advanced charts | Pivot tables, heatmaps, funnel charts, waterfall charts |
| **P5** | Security | Multi-tenancy | Tenant onboarding, subscription tiers, data isolation |
| **P5** | Security | RBAC | Role/permission matrix, field-level security, approval hierarchies |
| **P5** | Security | 2FA/MFA | TOTP, SMS, email OTP for privileged actions |
| **P5** | Security | Password policies | Complexity, expiry, breach check, session management |
| **P5** | Security | IP whitelisting | Restrict access by IP range for sensitive modules |
| **P5** | Performance | Caching | Redis cache for frequent queries, session store |
| **P5** | Performance | Pagination | Cursor-based pagination for large datasets |
| **P5** | Performance | Query optimization | Indexed queries, connection pooling, lazy loading |
| **P5** | Testing | Unit tests | Jest/Vitest for backend services and frontend components |
| **P5** | Testing | Integration tests | API contract tests, E2E with Playwright |
| **P5** | Testing | CI/CD | GitHub Actions for lint, test, build, deploy |
| **P5** | DevOps | Docker | Multi-stage Dockerfiles, docker-compose for full stack |
| **P5** | DevOps | Health checks | /health, /ready endpoints, monitoring dashboard |
| **P5** | DevOps | Logging | Structured JSON logs, log rotation, error tracking |
| **P5** | Integrations | Email | SMTP, templates, bulk mail, email tracking |
| **P5** | Integrations | SMS | OTP, alerts, bulk SMS via Twilio/MSG91 |
| **P5** | Integrations | Bank feeds | Auto-fetch transactions via Open Banking / IFSC APIs |
| **P5** | Integrations | E-invoicing | IRN/QR generation, e-way bill API |
| **P5** | Integrations | GSTN API | Auto-file GSTR-1/3B, fetch GSTIN details |
| **P5** | Integrations | Biometric | Attendance via fingerprint/face recognition API |
| **P5** | Integrations | Chatbot | WhatsApp/Slack bot for queries and approvals |
| **P5** | Advanced | Workflow engine | Visual workflow builder, SLA timers, escalation |
| **P5** | Advanced | Approval matrix | Multi-level approvals with delegation, parallel approvals |
| **P5** | Advanced | Notification center | In-app, email, SMS, push notifications with preferences |
| **P5** | Advanced | Localization | i18n for EN/HI/TA, multi-currency, regional formats |
| **P5** | Advanced | Recurring transactions | Recurring invoices, journal entries, budgets |
| **P5** | Advanced | Budgeting & Forecasting | Annual budgets, variance analysis, cash flow forecast |
| **P5** | Advanced | Asset management | Fixed assets, depreciation, maintenance schedules |
| **P5** | Advanced | Payroll enhancements | Attendance integration, salary advances, bonus calculations |
| **P5** | Advanced | CRM enhancements | Email integration, campaign management, territory mapping |
| **P5** | Advanced | Manufacturing enhancements | Shop floor display, machine scheduling, scrap tracking |
| **P5** | Advanced | Inventory enhancements | Demand forecasting, reorder point automation, expiry tracking |

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
| Projects | ✅ | ✅ | /projects/* |
| Quality | ✅ | ✅ | /quality/* |
| CRM | ✅ | ✅ | /crm/* |
| Compliance | ✅ | ✅ | /compliance/* |
| DMS | ✅ | ✅ | /dms/* |
| ESS | ✅ | ✅ | /ess/* |
| AI | ✅ | ✅ | /ai/* |

### 🎯 Next Milestone (v1.1)
1. **Advanced filters** — Apply FilterBar to all existing pages with saved presets
2. **Excel/CSV export** — Add export buttons to all DataTables
3. **Form validation** — Integrate Zod schemas into all create/edit forms
4. **Print/PDF** — Add print buttons to invoices and reports
5. **Data import** — CSV/Excel import with mapping and preview
6. **Bulk actions** — Multi-select, bulk approve/delete/export in DataTable
7. **Column customization** — Show/hide/reorder columns in tables
