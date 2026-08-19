import * as React from 'react';
import {
  Badge,
  Button,
  DataTable,
  FormField,
  Modal,
  PageHeader,
  Select,
  TextField,
  type Column,
  useToast,
} from '@/components';
import {
  api,
  type ManufacturingGoodsReceipt,
  type ManufacturingItem,
  type ManufacturingPurchaseOrder,
  type ManufacturingPurchaseRequisition,
} from '@/lib/api';

type Tab = 'pr' | 'po' | 'gr';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  approved: 'info',
  open: 'info',
  received: 'success',
  pending: 'warning',
  rejected: 'danger',
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'pr', label: 'Purchase Requisitions' },
  { id: 'po', label: 'Purchase Orders' },
  { id: 'gr', label: 'Goods Receipts' },
];

function emptyPr() {
  return { itemId: '', qty: '', requiredBy: '' };
}
function emptyGr() {
  return { poId: '', qty: '' };
}

function ManufacturingProcurementPage() {
  const { notify } = useToast();
  const [tab, setTab] = React.useState<Tab>('pr');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [prs, setPrs] = React.useState<ManufacturingPurchaseRequisition[]>([]);
  const [pos, setPos] = React.useState<ManufacturingPurchaseOrder[]>([]);
  const [grs, setGrs] = React.useState<ManufacturingGoodsReceipt[]>([]);
  const [items, setItems] = React.useState<ManufacturingItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [prOpen, setPrOpen] = React.useState(false);
  const [grOpen, setGrOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [prForm, setPrForm] = React.useState(emptyPr);
  const [grForm, setGrForm] = React.useState(emptyGr);

  const itemName = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getManufacturingPurchaseRequisitions(),
      api.getManufacturingPurchaseOrders(),
      api.getManufacturingGoodsReceipts(),
      api.getManufacturingItems(),
    ])
      .then(([p, o, g, i]) => {
        setPrs(p.rows ?? []);
        setPos(o.rows ?? []);
        setGrs(g.rows ?? []);
        setItems(i.rows ?? []);
        setTotal(Math.max(p.total ?? 0, o.total ?? 0, g.total ?? 0));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  function updatePr<K extends keyof ReturnType<typeof emptyPr>>(key: K, value: string) {
    setPrForm((f) => ({ ...f, [key]: value }));
  }
  function updateGr<K extends keyof ReturnType<typeof emptyGr>>(key: K, value: string) {
    setGrForm((f) => ({ ...f, [key]: value }));
  }

  function submitPr(e: React.FormEvent) {
    e.preventDefault();
    if (!prForm.itemId || !prForm.qty || !prForm.requiredBy) {
      notify({ title: 'Missing fields', description: 'All fields are required.', tone: 'warning' });
      return;
    }
    setSaving(true);
    api
      .createManufacturingPurchaseRequisition({
        itemId: prForm.itemId,
        qty: Number(prForm.qty),
        requiredBy: prForm.requiredBy,
      })
      .then(() => {
        setPrOpen(false);
        notify({ title: 'Requisition created', description: 'Purchase requisition saved as draft.', tone: 'success' });
        return refresh();
      })
      .catch((err) => notify({ title: 'Could not create', description: err.message, tone: 'danger' }))
      .finally(() => setSaving(false));
  }

  function submitGr(e: React.FormEvent) {
    e.preventDefault();
    if (!grForm.poId || !grForm.qty) {
      notify({ title: 'Missing fields', description: 'All fields are required.', tone: 'warning' });
      return;
    }
    setSaving(true);
    api
      .createManufacturingGoodsReceipt({ poId: grForm.poId, qty: Number(grForm.qty) })
      .then(() => {
        setGrOpen(false);
        notify({ title: 'Goods received', description: 'Stock updated from goods receipt.', tone: 'success' });
        return refresh();
      })
      .catch((err) => notify({ title: 'Could not receive', description: err.message, tone: 'danger' }))
      .finally(() => setSaving(false));
  }

  const prColumns: Column<ManufacturingPurchaseRequisition>[] = [
    { key: 'number', header: 'PR #', sortable: true },
    {
      key: 'item',
      header: 'Item',
      render: (row) => {
        const it = itemName.get(row.itemId);
        return (
          <div>
            <div className="font-medium text-ink">{it?.name ?? row.itemId}</div>
            <div className="text-xs text-ink-muted">{it?.sku ?? ''}</div>
          </div>
        );
      },
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.qty.toLocaleString('en-IN')}</span>,
    },
    { key: 'requiredBy', header: 'Required by', hideBelow: 'md' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  const poColumns: Column<ManufacturingPurchaseOrder>[] = [
    { key: 'number', header: 'PO #', sortable: true },
    { key: 'vendorId', header: 'Vendor', hideBelow: 'md', render: (row) => row.vendorId },
    {
      key: 'item',
      header: 'Item',
      render: (row) => {
        const it = itemName.get(row.itemId);
        return <span>{it?.name ?? row.itemId}</span>;
      },
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.qty.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'rate',
      header: 'Rate',
      align: 'right',
      hideBelow: 'md',
      render: (row) => <span className="tabular-nums">₹{row.rate.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  const grColumns: Column<ManufacturingGoodsReceipt>[] = [
    { key: 'id', header: 'Receipt', sortable: true, render: (row) => row.id },
    { key: 'poId', header: 'PO', render: (row) => row.poId },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.qty.toLocaleString('en-IN')}</span>,
    },
    { key: 'date', header: 'Date', hideBelow: 'md', render: (row) => row.date ?? '—' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Procurement" subtitle="Purchase requisitions, orders and goods receipts." />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
              (tab === t.id
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-muted hover:text-ink')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pr' && (
        <DataTable
          caption="Purchase requisitions"
          columns={prColumns}
          data={prs}
          getRowId={(row) => row.id}
          isLoading={loading}
          error={error ?? undefined}
          onRetry={refresh}
          pagination={{ page, pageSize: 20, total: prs.length || total, onPageChange: setPage }}
          emptyTitle="No requisitions"
          emptyDescription="Raise a purchase requisition to request materials."
          emptyAction={<Button onClick={() => { setPrForm(emptyPr()); setPrOpen(true); }}>New requisition</Button>}
        />
      )}

      {tab === 'po' && (
        <DataTable
          caption="Purchase orders"
          columns={poColumns}
          data={pos}
          getRowId={(row) => row.id}
          isLoading={loading}
          error={error ?? undefined}
          onRetry={refresh}
          pagination={{ page, pageSize: 20, total: pos.length || total, onPageChange: setPage }}
          emptyTitle="No purchase orders"
          emptyDescription="Purchase orders raised against requisitions appear here."
        />
      )}

      {tab === 'gr' && (
        <DataTable
          caption="Goods receipts"
          columns={grColumns}
          data={grs}
          getRowId={(row) => row.id}
          isLoading={loading}
          error={error ?? undefined}
          onRetry={refresh}
          pagination={{ page, pageSize: 20, total: grs.length || total, onPageChange: setPage }}
          emptyTitle="No goods receipts"
          emptyDescription="Record goods received against a purchase order."
          emptyAction={<Button onClick={() => { setGrForm(emptyGr()); setGrOpen(true); }}>New receipt</Button>}
        />
      )}

      <Modal
        open={prOpen}
        onClose={() => setPrOpen(false)}
        title="New purchase requisition"
        description="Request materials from procurement."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPrOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="pr-form" isLoading={saving}>Create</Button>
          </>
        }
      >
        <form id="pr-form" className="space-y-4" onSubmit={submitPr}>
          <FormField label="Item" htmlFor="pr-item" required>
            <Select
              id="pr-item"
              placeholder="Select item"
              options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
              value={prForm.itemId}
              onChange={(e) => updatePr('itemId', e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Quantity" htmlFor="pr-qty" required>
              <TextField id="pr-qty" type="number" min="1" value={prForm.qty} onChange={(e) => updatePr('qty', e.target.value)} placeholder="0" />
            </FormField>
            <FormField label="Required by" htmlFor="pr-date" required>
              <TextField id="pr-date" type="date" value={prForm.requiredBy} onChange={(e) => updatePr('requiredBy', e.target.value)} />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal
        open={grOpen}
        onClose={() => setGrOpen(false)}
        title="New goods receipt"
        description="Receive goods against an open purchase order."
        footer={
          <>
            <Button variant="secondary" onClick={() => setGrOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="gr-form" isLoading={saving}>Receive</Button>
          </>
        }
      >
        <form id="gr-form" className="space-y-4" onSubmit={submitGr}>
          <FormField label="Purchase order" htmlFor="gr-po" required>
            <Select
              id="gr-po"
              placeholder="Select PO"
              options={pos.map((p) => ({ value: p.id, label: `${p.number} — ${itemName.get(p.itemId)?.name ?? p.itemId}` }))}
              value={grForm.poId}
              onChange={(e) => updateGr('poId', e.target.value)}
            />
          </FormField>
          <FormField label="Quantity received" htmlFor="gr-qty" required>
            <TextField id="gr-qty" type="number" min="1" value={grForm.qty} onChange={(e) => updateGr('qty', e.target.value)} placeholder="0" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default ManufacturingProcurementPage;

