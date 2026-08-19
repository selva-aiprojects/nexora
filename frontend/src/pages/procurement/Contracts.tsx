import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextArea, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  expired: 'neutral',
  terminated: 'danger',
  draft: 'info',
};

function ProcurementContracts() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getProcurementContracts()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { api.getProcurementVendors().then((data) => setVendors(data.rows ?? [])); }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createProcurementContract({
        vendorId: String(fd.get('vendorId')),
        number: String(fd.get('number')),
        startDate: String(fd.get('startDate')),
        endDate: String(fd.get('endDate')),
        value: Number(fd.get('value')),
        terms: String(fd.get('terms') || ''),
      });
      notify({ title: 'Contract created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'number', header: 'Contract #', sortable: true },
    { key: 'vendorId', header: 'Vendor', render: (row) => vendors.find((v) => v.id === row.vendorId)?.name ?? row.vendorId },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true, hideBelow: 'md' },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.value.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading contracts…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Contracts" subtitle="Vendor agreements and terms." actions={<Button onClick={() => setOpen(true)}>New Contract</Button>} />
      <DataTable
        caption="Contracts"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No contracts"
        emptyDescription="Create your first contract to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Contract" description="Create a new vendor contract." footer={<Button type="submit" form="con-form" isLoading={busy}>Create</Button>}>
        <form id="con-form" onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vendor" htmlFor="con-ven" required>
              <Select id="con-ven" name="vendorId" options={vendors.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vendor" required />
            </FormField>
            <FormField label="Contract Number" htmlFor="con-num" required>
              <TextField id="con-num" name="number" placeholder="CON-2026-003" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start Date" htmlFor="con-start" required>
              <TextField id="con-start" name="startDate" type="date" required />
            </FormField>
            <FormField label="End Date" htmlFor="con-end" required>
              <TextField id="con-end" name="endDate" type="date" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Value" htmlFor="con-val" required>
              <TextField id="con-val" name="value" type="number" min={0} step="0.01" required />
            </FormField>
          </div>
          <FormField label="Terms" htmlFor="con-terms">
            <TextArea id="con-terms" name="terms" placeholder="Contract terms and conditions" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default ProcurementContracts;
