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
  type ManufacturingItem,
  type ManufacturingStock,
  type ManufacturingStockTransfer,
  type ManufacturingWarehouse,
} from '@/lib/api';

function emptyForm() {
  return { itemId: '', fromWarehouseId: '', toWarehouseId: '', qty: '' };
}

function ManufacturingStockPage() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stock, setStock] = React.useState<ManufacturingStock[]>([]);
  const [items, setItems] = React.useState<ManufacturingItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<ManufacturingWarehouse[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const itemName = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const warehouseName = React.useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getManufacturingStock(),
      api.getManufacturingItems(),
      api.getManufacturingWarehouses(),
    ])
      .then(([s, i, w]) => {
        setStock(s.rows ?? []);
        setItems(i.rows ?? []);
        setWarehouses(w);
        setTotal(s.total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  function update<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemId || !form.fromWarehouseId || !form.toWarehouseId || !form.qty) {
      notify({ title: 'Missing fields', description: 'All fields are required.', tone: 'warning' });
      return;
    }
    if (form.fromWarehouseId === form.toWarehouseId) {
      notify({ title: 'Invalid transfer', description: 'Source and destination must differ.', tone: 'warning' });
      return;
    }
    setSaving(true);
    api
      .createManufacturingStockTransfer({
        itemId: form.itemId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        qty: Number(form.qty),
      })
      .then((t: ManufacturingStockTransfer) => {
        setModalOpen(false);
        notify({ title: 'Transfer completed', description: `Stock moved (${t.number}).`, tone: 'success' });
        return refresh();
      })
      .catch((err) => notify({ title: 'Could not transfer', description: err.message, tone: 'danger' }))
      .finally(() => setSaving(false));
  }

  const columns: Column<ManufacturingStock>[] = [
    {
      key: 'item',
      header: 'Item',
      sortable: true,
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
      key: 'warehouseId',
      header: 'Warehouse',
      hideBelow: 'md',
      render: (row) => warehouseName.get(row.warehouseId) ?? row.warehouseId,
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.quantity.toLocaleString('en-IN')}</span>
      ),
    },
    { key: 'batch', header: 'Batch', hideBelow: 'md', render: (row) => row.batch ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.quantity <= (itemName.get(row.itemId)?.reorderLevel ?? 0) ? (
          <Badge tone="warning" withDot>Low stock</Badge>
        ) : (
          <Badge tone="success" withDot>Healthy</Badge>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Stock"
        subtitle="On-hand inventory across warehouses with stock transfers."
        actions={
          <Button onClick={openCreate} disabled={loading}>
            Transfer stock
          </Button>
        }
      />

      <DataTable
        caption="Manufacturing stock"
        columns={columns}
        data={stock}
        getRowId={(row) => row.id}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={refresh}
        pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
        emptyTitle="No stock records"
        emptyDescription="Stock movements and balances will appear here."
        emptyAction={<Button onClick={openCreate}>Transfer stock</Button>}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Transfer stock"
        description="Move inventory between warehouses."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="transfer-form" isLoading={saving}>
              Transfer
            </Button>
          </>
        }
      >
        <form id="transfer-form" className="space-y-4" onSubmit={submit}>
          <FormField label="Item" htmlFor="itemId" required>
            <Select
              id="itemId"
              placeholder="Select item"
              options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
              value={form.itemId}
              onChange={(e) => update('itemId', e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="From warehouse" htmlFor="fromWarehouseId" required>
              <Select
                id="fromWarehouseId"
                placeholder="Source"
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                value={form.fromWarehouseId}
                onChange={(e) => update('fromWarehouseId', e.target.value)}
              />
            </FormField>
            <FormField label="To warehouse" htmlFor="toWarehouseId" required>
              <Select
                id="toWarehouseId"
                placeholder="Destination"
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                value={form.toWarehouseId}
                onChange={(e) => update('toWarehouseId', e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Quantity" htmlFor="qty" required>
            <TextField id="qty" type="number" min="1" value={form.qty} onChange={(e) => update('qty', e.target.value)} placeholder="0" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default ManufacturingStockPage;
