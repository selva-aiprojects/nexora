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
import { api, type ManufacturingItem } from '@/lib/api';

const ITEM_TYPES = [
  { value: 'raw_material', label: 'Raw material' },
  { value: 'semi_finished', label: 'Semi-finished' },
  { value: 'finished_good', label: 'Finished good' },
];

const UOMS = [
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'pcs', label: 'pcs' },
  { value: 'l', label: 'l' },
  { value: 'box', label: 'box' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  active: 'success',
  inactive: 'neutral',
};

function emptyForm() {
  return { sku: '', name: '', hsn: '', type: 'raw_material', uom: 'kg', standardCost: '', reorderLevel: '' };
}

function ManufacturingItemsPage() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ManufacturingItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return api
      .getManufacturingItems()
      .then((res) => {
        setItems(res.rows ?? []);
        setTotal(res.total ?? 0);
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
    if (!form.sku || !form.name) {
      notify({ title: 'Missing fields', description: 'SKU and name are required.', tone: 'warning' });
      return;
    }
    setSaving(true);
    api
      .createManufacturingItem({
        sku: form.sku,
        name: form.name,
        hsn: form.hsn || undefined,
        type: form.type,
        uom: form.uom,
        standardCost: form.standardCost ? Number(form.standardCost) : undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
      })
      .then(() => {
        setModalOpen(false);
        notify({ title: 'Item created', description: `${form.name} added to item master.`, tone: 'success' });
        return refresh();
      })
      .catch((err) => notify({ title: 'Could not create item', description: err.message, tone: 'danger' }))
      .finally(() => setSaving(false));
  }

  const columns: Column<ManufacturingItem>[] = [
    { key: 'sku', header: 'SKU', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge tone={STATUS_TONE[row.type] ?? 'neutral'}>{row.type.replace('_', ' ')}</Badge>
      ),
    },
    { key: 'uom', header: 'UOM', hideBelow: 'md' },
    {
      key: 'standardCost',
      header: 'Std cost',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">₹{row.standardCost.toLocaleString('en-IN')}</span>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder',
      align: 'right',
      hideBelow: 'md',
      render: (row) => (
        <span className="tabular-nums">{row.reorderLevel.toLocaleString('en-IN')} {row.uom}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Items"
        subtitle="Item master for raw materials, semi-finished and finished goods."
        actions={
          <Button onClick={openCreate} disabled={loading}>
            New item
          </Button>
        }
      />

      <DataTable
        caption="Manufacturing items"
        columns={columns}
        data={items}
        getRowId={(row) => row.id}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={refresh}
        pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
        emptyTitle="No items yet"
        emptyDescription="Create your first item to start planning production."
        emptyAction={<Button onClick={openCreate}>New item</Button>}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New item"
        description="Add a new item to the manufacturing item master."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="item-form" isLoading={saving}>
              Create item
            </Button>
          </>
        }
      >
        <form id="item-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="SKU" htmlFor="sku" required>
              <TextField id="sku" value={form.sku} onChange={(e) => update('sku', e.target.value)} placeholder="RM-001" />
            </FormField>
            <FormField label="Name" htmlFor="name" required>
              <TextField id="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Steel Coil" />
            </FormField>
            <FormField label="HSN" htmlFor="hsn">
              <TextField id="hsn" value={form.hsn} onChange={(e) => update('hsn', e.target.value)} placeholder="7208" />
            </FormField>
            <FormField label="Type" htmlFor="type" required>
              <Select id="type" options={ITEM_TYPES} value={form.type} onChange={(e) => update('type', e.target.value)} />
            </FormField>
            <FormField label="UOM" htmlFor="uom" required>
              <Select id="uom" options={UOMS} value={form.uom} onChange={(e) => update('uom', e.target.value)} />
            </FormField>
            <FormField label="Standard cost" htmlFor="standardCost">
              <TextField id="standardCost" type="number" min="0" value={form.standardCost} onChange={(e) => update('standardCost', e.target.value)} placeholder="0" />
            </FormField>
            <FormField label="Reorder level" htmlFor="reorderLevel">
              <TextField id="reorderLevel" type="number" min="0" value={form.reorderLevel} onChange={(e) => update('reorderLevel', e.target.value)} placeholder="0" />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ManufacturingItemsPage;
