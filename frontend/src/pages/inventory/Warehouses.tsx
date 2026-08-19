import * as React from 'react';
import { Button, DataTable, PageHeader, Modal, FormField, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

function InventoryWarehouses() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getInventoryWarehouses()
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createInventoryWarehouse({
        name: String(fd.get('name')),
        location: String(fd.get('location')),
        manager: String(fd.get('manager') || ''),
      });
      notify({ title: 'Warehouse created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'location', header: 'Location' },
    { key: 'manager', header: 'Manager', hideBelow: 'md' },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading warehouses…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Warehouses" subtitle="Manage warehouse locations and managers." actions={<Button onClick={() => setOpen(true)}>Add Warehouse</Button>} />
      <DataTable
        caption="Warehouses"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No warehouses"
        emptyDescription="Create your first warehouse to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Warehouse" description="Add a warehouse location." footer={<Button type="submit" form="wh-form" isLoading={busy}>Create</Button>}>
        <form id="wh-form" onSubmit={submit} className="mt-4 grid gap-4">
          <FormField label="Name" htmlFor="wh-name" required>
            <TextField id="wh-name" name="name" placeholder="Main Warehouse" required />
          </FormField>
          <FormField label="Location" htmlFor="wh-loc" required>
            <TextField id="wh-loc" name="location" placeholder="Bengaluru" required />
          </FormField>
          <FormField label="Manager" htmlFor="wh-mgr">
            <TextField id="wh-mgr" name="manager" placeholder="Rahul Verma" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default InventoryWarehouses;
