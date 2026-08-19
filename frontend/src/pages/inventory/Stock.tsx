import * as React from 'react';
import { Button, Card, DataTable, PageHeader, Modal, FormField, Select, TextArea, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

function InventoryStock() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [bins, setBins] = React.useState<any[]>([]);
  const [filterWarehouse, setFilterWarehouse] = React.useState('');
  const [filterBin, setFilterBin] = React.useState('');
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getInventoryStock({ warehouseId: filterWarehouse || undefined, binId: filterBin || undefined })
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filterWarehouse, filterBin]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    api.getInventoryWarehouses().then((data) => setWarehouses(Array.isArray(data) ? data : []));
    api.getInventoryBins().then((data) => setBins((data as any).rows ?? []));
  }, []);

  const handleAdjustment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createInventoryAdjustment({
        itemId: String(fd.get('itemId')),
        warehouseId: String(fd.get('warehouseId')),
        binId: String(fd.get('binId')),
        type: String(fd.get('type')),
        qty: Number(fd.get('qty')),
        reason: String(fd.get('reason')),
        date: String(fd.get('date')),
      });
      notify({ title: 'Adjustment created', tone: 'success' });
      setAdjustOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createInventoryTransfer({
        itemId: String(fd.get('itemId')),
        fromWarehouseId: String(fd.get('fromWarehouseId')),
        toWarehouseId: String(fd.get('toWarehouseId')),
        qty: Number(fd.get('qty')),
      });
      notify({ title: 'Transfer completed', tone: 'success' });
      setTransferOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'itemId', header: 'Item', render: (row) => row.itemId },
    { key: 'warehouseId', header: 'Warehouse', render: (row) => warehouses.find((w) => w.id === row.warehouseId)?.name ?? row.warehouseId },
    { key: 'binId', header: 'Bin', render: (row) => bins.find((b) => b.id === row.binId)?.code ?? row.binId },
    { key: 'batch', header: 'Batch', hideBelow: 'md', render: (row) => row.batch ?? '—' },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{row.quantity.toLocaleString()}</span>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading inventory…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Inventory Stock"
        subtitle="Bin-level stock across warehouses with adjustments and transfers."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(true)}>Adjustment</Button>
            <Button onClick={() => setTransferOpen(true)}>Transfer</Button>
          </div>
        }
      />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Warehouse" htmlFor="inv-wh">
            <Select id="inv-wh" value={filterWarehouse} onChange={(e) => { setFilterWarehouse(e.target.value); setFilterBin(''); }} options={[{ value: '', label: 'All warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} />
          </FormField>
          <FormField label="Bin" htmlFor="inv-bin">
            <Select id="inv-bin" value={filterBin} onChange={(e) => setFilterBin(e.target.value)} options={[{ value: '', label: 'All bins' }, ...bins.filter((b) => !filterWarehouse || b.warehouseId === filterWarehouse).map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))]} />
          </FormField>
        </div>
      </Card>
      <DataTable
        caption="Stock"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No stock records"
        emptyDescription="Stock movements will appear here."
      />

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Stock Adjustment" description="Record a write-off, write-back, or addition." footer={<Button type="submit" form="inv-adjust-form" isLoading={busy}>Save</Button>}>
        <form id="inv-adjust-form" onSubmit={handleAdjustment} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Warehouse" htmlFor="adj-wh" required>
              <Select id="adj-wh" name="warehouseId" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="Select warehouse" required />
            </FormField>
            <FormField label="Bin" htmlFor="adj-bin" required>
              <Select id="adj-bin" name="binId" options={bins.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))} placeholder="Select bin" required />
            </FormField>
          </div>
          <FormField label="Item ID" htmlFor="adj-item" required>
            <TextField id="adj-item" name="itemId" placeholder="itm_001" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" htmlFor="adj-type" required>
              <Select id="adj-type" name="type" options={[{ value: 'write_off', label: 'Write-off' }, { value: 'write_back', label: 'Write-back' }, { value: 'addition', label: 'Addition' }]} required />
            </FormField>
            <FormField label="Quantity" htmlFor="adj-qty" required>
              <TextField id="adj-qty" name="qty" type="number" min={1} required />
            </FormField>
          </div>
          <FormField label="Date" htmlFor="adj-date" required>
            <TextField id="adj-date" name="date" type="date" required />
          </FormField>
          <FormField label="Reason" htmlFor="adj-reason" required>
            <TextArea id="adj-reason" name="reason" required />
          </FormField>
        </form>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Stock Transfer" description="Move stock between warehouses." footer={<Button type="submit" form="inv-transfer-form" isLoading={busy}>Transfer</Button>}>
        <form id="inv-transfer-form" onSubmit={handleTransfer} className="mt-4 grid gap-4">
          <FormField label="Item ID" htmlFor="trf-item" required>
            <TextField id="trf-item" name="itemId" placeholder="itm_001" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="From Warehouse" htmlFor="trf-from" required>
              <Select id="trf-from" name="fromWarehouseId" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="From" required />
            </FormField>
            <FormField label="To Warehouse" htmlFor="trf-to" required>
              <Select id="trf-to" name="toWarehouseId" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="To" required />
            </FormField>
          </div>
          <FormField label="Quantity" htmlFor="trf-qty" required>
            <TextField id="trf-qty" name="qty" type="number" min={1} required />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default InventoryStock;
