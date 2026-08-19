import * as React from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
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
  type ManufacturingBom,
  type ManufacturingItem,
  type ManufacturingProductionOrder,
} from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  planned: 'info',
  wip: 'warning',
  completed: 'success',
  draft: 'neutral',
};

function emptyForm() {
  return { bomId: '', finishedItemId: '', qty: '' };
}

type PendingAction = { id: string; kind: 'issue' | 'complete' } | null;

function ManufacturingProductionPage() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<ManufacturingProductionOrder[]>([]);
  const [boms, setBoms] = React.useState<ManufacturingBom[]>([]);
  const [items, setItems] = React.useState<ManufacturingItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [pending, setPending] = React.useState<PendingAction>(null);
  const [acting, setActing] = React.useState(false);

  const itemName = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const bomById = React.useMemo(() => new Map(boms.map((b) => [b.id, b])), [boms]);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getManufacturingProductionOrders(),
      api.getManufacturingBoms(),
      api.getManufacturingItems(),
    ])
      .then(([o, b, i]) => {
        setOrders(o.rows ?? []);
        setBoms(b);
        setItems(i.rows ?? []);
        setTotal(o.total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  function update<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'bomId') {
        const bom = bomById.get(value);
        next.finishedItemId = bom?.finishedItemId ?? '';
      }
      return next;
    });
  }

  function openCreate() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bomId || !form.finishedItemId || !form.qty) {
      notify({ title: 'Missing fields', description: 'BOM and quantity are required.', tone: 'warning' });
      return;
    }
    setSaving(true);
    api
      .createManufacturingProductionOrder({
        bomId: form.bomId,
        finishedItemId: form.finishedItemId,
        qty: Number(form.qty),
      })
      .then(() => {
        setModalOpen(false);
        notify({ title: 'Production order created', description: 'Order added in planned state.', tone: 'success' });
        return refresh();
      })
      .catch((err) => notify({ title: 'Could not create order', description: err.message, tone: 'danger' }))
      .finally(() => setSaving(false));
  }

  function runAction() {
    if (!pending) return;
    setActing(true);
    const call =
      pending.kind === 'issue'
        ? api.issueManufacturingProductionOrder(pending.id)
        : api.completeManufacturingProductionOrder(pending.id);
    call
      .then((order) => {
        setPending(null);
        notify({
          title: pending.kind === 'issue' ? 'Materials issued' : 'Production completed',
          description: `${order.number} is now ${order.stage}.`,
          tone: 'success',
        });
        return refresh();
      })
      .catch((err) => {
        setPending(null);
        notify({ title: 'Action failed', description: err.message, tone: 'danger' });
      })
      .finally(() => setActing(false));
  }

  const columns: Column<ManufacturingProductionOrder>[] = [
    { key: 'number', header: 'Order #', sortable: true },
    {
      key: 'finishedItemId',
      header: 'Finished good',
      render: (row) => {
        const it = itemName.get(row.finishedItemId);
        return <span>{it?.name ?? row.finishedItemId}</span>;
      },
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.qty.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      hideBelow: 'md',
      render: (row) => row.stage,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.status !== 'wip' && row.status !== 'completed' && (
            <Button size="sm" variant="secondary" onClick={() => setPending({ id: row.id, kind: 'issue' })}>
              Issue
            </Button>
          )}
          {row.status === 'wip' && (
            <Button size="sm" onClick={() => setPending({ id: row.id, kind: 'complete' })}>
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Production"
        subtitle="Plan production orders and manage issue and completion."
        actions={<Button onClick={openCreate} disabled={loading}>New order</Button>}
      />

      <DataTable
        caption="Production orders"
        columns={columns}
        data={orders}
        getRowId={(row) => row.id}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={refresh}
        pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
        emptyTitle="No production orders"
        emptyDescription="Create a production order from a BOM to get started."
        emptyAction={<Button onClick={openCreate}>New order</Button>}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New production order"
        description="Schedule production for a finished good."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="prod-form" isLoading={saving}>Create order</Button>
          </>
        }
      >
        <form id="prod-form" className="space-y-4" onSubmit={submit}>
          <FormField label="BOM" htmlFor="bom" required help="Finished good is filled automatically.">
            <Select
              id="bom"
              placeholder="Select BOM"
              options={boms.map((b) => ({ value: b.id, label: b.name }))}
              value={form.bomId}
              onChange={(e) => update('bomId', e.target.value)}
            />
          </FormField>
          <FormField label="Finished item" htmlFor="finished" required>
            <Select
              id="finished"
              placeholder="Select finished good"
              options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
              value={form.finishedItemId}
              onChange={(e) => update('finishedItemId', e.target.value)}
            />
          </FormField>
          <FormField label="Quantity" htmlFor="qty" required>
            <TextField id="qty" type="number" min="1" value={form.qty} onChange={(e) => update('qty', e.target.value)} placeholder="0" />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => !acting && setPending(null)}
        onConfirm={runAction}
        loading={acting}
        title={pending?.kind === 'issue' ? 'Issue materials?' : 'Complete production?'}
        description={
          pending?.kind === 'issue'
            ? 'Components will be consumed from stock and the order moves to WIP.'
            : 'Finished goods will be added to stock and the order marked completed.'
        }
        confirmLabel={pending?.kind === 'issue' ? 'Issue' : 'Complete'}
        confirmTone="primary"
      />
    </div>
  );
}

export default ManufacturingProductionPage;

