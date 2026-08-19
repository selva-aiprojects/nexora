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
  type ManufacturingBom,
  type ManufacturingBomComponent,
  type ManufacturingItem,
} from '@/lib/api';

function emptyForm() {
  return {
    name: '',
    finishedItemId: '',
    components: [{ itemId: '', qty: '' }] as { itemId: string; qty: string }[],
  };
}

function ManufacturingBomsPage() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [boms, setBoms] = React.useState<ManufacturingBom[]>([]);
  const [items, setItems] = React.useState<ManufacturingItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const itemName = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([api.getManufacturingBoms(), api.getManufacturingItems()])
      .then(([b, i]) => {
        setBoms(b);
        setItems(i.rows ?? []);
        setTotal(b.length);
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
  function updateComponent(index: number, key: 'itemId' | 'qty', value: string) {
    setForm((f) => ({
      ...f,
      components: f.components.map((c, i) => (i === index ? { ...c, [key]: value } : c)),
    }));
  }
  function addComponent() {
    setForm((f) => ({ ...f, components: [...f.components, { itemId: '', qty: '' }] }));
  }
  function removeComponent(index: number) {
    setForm((f) => ({ ...f, components: f.components.filter((_, i) => i !== index) }));
  }

  function openCreate() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.finishedItemId) {
      notify({ title: 'Missing fields', description: 'Name and finished item are required.', tone: 'warning' });
      return;
    }
    const components: ManufacturingBomComponent[] = [];
    for (const c of form.components) {
      if (!c.itemId || !c.qty) {
        notify({ title: 'Incomplete component', description: 'Every component needs an item and quantity.', tone: 'warning' });
        return;
      }
      components.push({ itemId: c.itemId, qty: Number(c.qty) });
    }
    setSaving(true);
    api
      .createManufacturingBom({
        name: form.name,
        finishedItemId: form.finishedItemId,
        components,
      })
      .then(() => {
        setModalOpen(false);
        notify({ title: 'BOM created', description: `${form.name} saved with ${components.length} components.`, tone: 'success' });
        return refresh();
      })
      .catch((err) => notify({ title: 'Could not create BOM', description: err.message, tone: 'danger' }))
      .finally(() => setSaving(false));
  }

  const columns: Column<ManufacturingBom>[] = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'finishedItemId',
      header: 'Finished good',
      render: (row) => {
        const it = itemName.get(row.finishedItemId);
        return <span>{it?.name ?? row.finishedItemId}</span>;
      },
    },
    {
      key: 'components',
      header: 'Components',
      render: (row) => <Badge tone="neutral">{row.components.length} items</Badge>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Bills of Materials"
        subtitle="Define component composition for finished and semi-finished goods."
        actions={<Button onClick={openCreate} disabled={loading}>New BOM</Button>}
      />

      <DataTable
        caption="Bills of materials"
        columns={columns}
        data={boms}
        getRowId={(row) => row.id}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={refresh}
        pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
        emptyTitle="No BOMs yet"
        emptyDescription="Create a bill of materials to plan production."
        emptyAction={<Button onClick={openCreate}>New BOM</Button>}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New BOM"
        description="Define a bill of materials and its components."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="bom-form" isLoading={saving}>Create BOM</Button>
          </>
        }
      >
        <form id="bom-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="BOM name" htmlFor="bom-name" required>
              <TextField id="bom-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Industrial Pump BOM" />
            </FormField>
            <FormField label="Finished item" htmlFor="bom-finished" required>
              <Select
                id="bom-finished"
                placeholder="Select finished good"
                options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
                value={form.finishedItemId}
                onChange={(e) => update('finishedItemId', e.target.value)}
              />
            </FormField>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Components</span>
              <Button type="button" variant="ghost" size="sm" onClick={addComponent} disabled={saving}>
                Add component
              </Button>
            </div>
            {form.components.map((c, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField label={index === 0 ? 'Item' : ''} htmlFor={`comp-item-${index}`} required>
                    <Select
                      id={`comp-item-${index}`}
                      placeholder="Select component"
                      options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
                      value={c.itemId}
                      onChange={(e) => updateComponent(index, 'itemId', e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="w-28">
                  <FormField label={index === 0 ? 'Qty' : ''} htmlFor={`comp-qty-${index}`} required>
                    <TextField
                      id={`comp-qty-${index}`}
                      type="number"
                      min="1"
                      value={c.qty}
                      onChange={(e) => updateComponent(index, 'qty', e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeComponent(index)}
                  disabled={saving || form.components.length === 1}
                  aria-label="Remove component"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ManufacturingBomsPage;

