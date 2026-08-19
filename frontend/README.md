# Nexora UI

Foundational component library for the Nexora AI-Native Business Operating
Platform (Accounting/GST, HRMS, Inventory, Compliance, DMS, AI Copilot).

**Scope note.** The PRD covers seven product domains. Rather than building
shallow one-off screens for each, this library builds the ~10 primitives
that *every* module's screens are actually made of — table, form field,
card, modal, badge, empty/loading state, nav shell. Get these right once,
with full accessibility and edge-case handling, and each module team
composes them instead of re-solving "what does a loading table look like"
seven times with seven different bugs.

```
src/
├── tokens/theme.css        # color/type/spacing tokens — the only file with hex values
├── lib/utils.ts             # cn() class merger, formatINR, formatDate
└── components/
    ├── Button.tsx
    ├── Badge.tsx             (StatusBadge)
    ├── Card.tsx              (Card, StatCard, InsightCard)
    ├── Input.tsx             (FormField, TextField, TextArea, Select)
    ├── EmptyState.tsx
    ├── Skeleton.tsx
    ├── DataTable.tsx
    ├── Modal.tsx
    ├── Toast.tsx             (ToastProvider, useToast)
    ├── AppShell.tsx          (sidebar + top bar layout)
    └── index.ts              # barrel export — import everything from here
```

## Architecture

**Tokens → primitives → module screens.** Nothing above the token layer
hard-codes a color or a pixel radius; every component reads Tailwind
classes that resolve to `theme.css` CSS variables. Rebranding, or shipping
a white-label tenant theme later, is a token-file edit — not a grep across
components.

**Controlled, not stateful, for anything a server cares about.** `DataTable`
takes `sortKey`/`onSortChange`, `pagination.page`/`onPageChange`, and
`selectedIds`/`onSelectionChange` as props rather than owning that state
internally. In a real ERP list screen, sort and page need to survive a
URL sync and usually drive a server-side query (you can't sort 50k GL
entries client-side). Baking state in would mean ripping it out the
moment a table needs server pagination — so every table starts controlled,
even the ones that today just filter an in-memory array.

**Composition over configuration.** `StatCard` and `InsightCard` are built
from `Card`, not alternate implementations — a new card type (e.g. a
"ComplianceDeadlineCard") should wrap `Card` the same way rather than
extending a growing prop surface on one god-component.

**One accent color, one meaning.** `accent` (violet) is reserved
exclusively for AI-originated content — the `ai` Button variant, `Badge
tone="ai"`, `InsightCard`. This is the system's signature device from the
PRD's "AI-native" positioning: violet appearing anywhere reliably means
"the AI produced this," so it stays legible as a signal instead of
becoming another decorative color.

## Props / API design principles

- **Every component accepts `className`** and merges it last via `cn()`
  (tailwind-merge), so a consuming screen can always override spacing/width
  without fighting specificity.
- **Render props over children-as-config** where content is dynamic per row
  (`Column.render`), but plain `children` where the content is a one-off
  (`Modal`, `Card`) — don't force a render-prop API where children already work.
- **Booleans read as English** (`isLoading`, `withDot`, `closeOnOverlayClick`)
  — never `mode="loading"` string unions for a binary state.
- **Required props have no default; everything else does.** `DataTable`
  requires `columns`, `data`, `getRowId`, `caption` — nothing renders
  correctly without them, so TypeScript should force the caller's hand
  rather than silently rendering broken.
- **`getRowId` is mandatory, not `key={index}` internally** — index keys
  silently corrupt row state (selection, expanded rows) the moment a row
  is sorted, filtered, or deleted. Every list-rendering component in this
  library takes an explicit id accessor instead.

## Usage examples

### Dashboard with KPI tiles and an AI insight

```tsx
import { StatCard, InsightCard, Button, formatINR } from '@/components';

function FinanceDashboard({ kpis, isLoading }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Cash position"
        value={formatINR(kpis?.cash ?? 0, { compact: true })}
        delta="+4.2% vs last month"
        trend="up"
        isLoading={isLoading}
      />
      <StatCard label="Overdue receivables" value={formatINR(kpis?.overdue ?? 0)} trend="down" isLoading={isLoading} />

      <InsightCard
        title="Anomaly detected"
        className="sm:col-span-2"
        action={<Button variant="ai" size="sm">Review 3 flagged entries</Button>}
      >
        Vendor "Sharma Traders" was paid twice for invoice #INV-2291 — the
        second payment looks like a duplicate.
      </InsightCard>
    </div>
  );
}
```

### An invoice list: table + status badges + empty/loading/error, fully controlled

```tsx
import { DataTable, Badge, Button, formatINR, formatDate, type Column } from '@/components';

const STATUS_TONE = { paid: 'success', overdue: 'danger', pending: 'warning' } as const;

const columns: Column<Invoice>[] = [
  { key: 'number', header: 'Invoice #', sortable: true },
  { key: 'customer', header: 'Customer', sortable: true },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortable: true,
    render: (row) => formatINR(row.amount),
  },
  { key: 'dueDate', header: 'Due', hideBelow: 'md', render: (row) => formatDate(row.dueDate) },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
  },
];

function InvoiceList() {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useInvoices({ sort, page });

  return (
    <DataTable
      caption="Sales invoices"
      columns={columns}
      data={data?.rows ?? []}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error?.message}
      onRetry={refetch}
      sortKey={sort?.key}
      sortDirection={sort?.dir}
      onSortChange={(key, dir) => setSort({ key, dir })}
      pagination={{ page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      emptyTitle="No invoices yet"
      emptyDescription="Invoices you raise will appear here."
      emptyAction={<Button size="sm" onClick={openCreateInvoice}>Create invoice</Button>}
    />
  );
}
```

### A form with validation wired through FormField

```tsx
import { FormField, TextField, Select, Button } from '@/components';

<form onSubmit={handleSubmit}>
  <FormField label="GSTIN" htmlFor="gstin" required error={errors.gstin} help="15-character GST identification number">
    <TextField name="gstin" maxLength={15} value={form.gstin} onChange={onChange} />
  </FormField>

  <FormField label="Filing frequency" htmlFor="freq" required error={errors.freq}>
    <Select
      name="freq"
      value={form.freq}
      onChange={onChange}
      placeholder="Select frequency"
      options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }]}
    />
  </FormField>

  <Button type="submit" isLoading={isSubmitting}>Save GST profile</Button>
</form>
```

### Confirming a destructive action

```tsx
<Modal
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  title="Reject this expense claim?"
  description="The employee will be notified and can resubmit with corrections."
  closeOnOverlayClick={false}
  footer={
    <>
      <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
      <Button variant="danger" onClick={handleReject} isLoading={isRejecting}>Reject claim</Button>
    </>
  }
>
  This action can't be undone from this screen.
</Modal>
```

## Handling loading, empty, and error states — the pattern

Every data-driven component in this library follows the same three-state
contract so a screen never has to invent its own:

| State | Prop | What renders |
|---|---|---|
| Loading | `isLoading` | Skeleton shapes matching the real layout (never a spinner replacing the whole screen — headers/nav stay put) |
| Empty (zero data) | data.length === 0 | `EmptyState` with a next action, not just "No data" |
| Error (fetch failed) | `error` | `EmptyState variant="error"` with `onRetry` |

Screens should pass all three, not just handle loading and assume the rest:

```tsx
<DataTable isLoading={isLoading} error={error?.message} onRetry={refetch} data={data ?? []} ... />
```

## Accessibility baseline (applies to every component)

- Real semantic elements first (`<button>`, `<table>`, `<label>`) — never a
  styled `<div>` standing in for an interactive element.
- Visible `:focus-visible` ring on every interactive element, using the
  brand primary color at sufficient contrast — never suppressed.
- Color never carries meaning alone: `Badge` and `StatCard` trend pair
  color with text/icon, satisfying WCAG 1.4.1.
- `prefers-reduced-motion` respected in `Skeleton` and any transition.
- Modals trap focus, restore it on close, and close on Escape.
- Form errors are linked via `aria-describedby` and announced with `role="alert"`.

## Best practices for teams building on this library

1. **Never restyle a primitive ad hoc with `!important` or inline styles** —
   if a screen needs a variant a component doesn't support, add the variant
   to the component (one place, documented) rather than one-off overrides
   that drift from the system.
2. **Always pass `caption` to `DataTable` and real `label` text to `FormField`**
   even when a sighted user won't see it — these aren't optional polish, a
   screen reader user cannot use the screen without them.
3. **Reach for `InsightCard`/`Badge tone="ai"` only for genuinely
   AI-generated content.** Using the accent color decoratively "because it
   looks nice" breaks the one signal this system gives users for "the
   system inferred this, verify it" — important in a financial product.
4. **New components should be added to `index.ts` and documented here**
   before a second module starts depending on them, so the library stays
   the source of truth instead of module-local copies diverging.
5. **Currency, dates, and other locale-sensitive values always go through
   `formatINR`/`formatDate`**, not manual `toLocaleString()` calls scattered
   through screens — GST/financial data has correctness requirements a
   one-off format call will eventually get wrong (lakh/crore grouping,
   fraction digits).

## Peer dependencies

`react` ^18, `clsx`, `tailwind-merge`, and Tailwind CSS configured with the
color/font mapping documented at the bottom of `tokens/theme.css`.
